import dotenv from 'dotenv';

dotenv.config();

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_LANGUAGE = process.env.TMDB_LANGUAGE || 'en-US';
const CACHE_TTL = 1000 * 60 * 10;
const cache = new Map();

function getAccessToken() {
  return process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_BEARER_TOKEN || '';
}

function getApiKey() {
  return process.env.TMDB_API_KEY || '';
}

export function isTmdbConfigured() {
  return Boolean(getAccessToken() || getApiKey());
}

export function getTmdbStatus() {
  const configured = isTmdbConfigured();
  return {
    provider: configured ? 'tmdb' : 'fallback',
    configured,
    live: configured,
    message: configured
      ? 'Using live TMDB movie data.'
      : 'Using built-in fallback data. Add TMDB_API_KEY or TMDB_ACCESS_TOKEN in server/.env for live internet results.',
  };
}

function buildUrl(path, params = {}) {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  const token = getAccessToken();

  if (!token) {
    url.searchParams.set('api_key', getApiKey());
  }

  url.searchParams.set('language', params.language || DEFAULT_LANGUAGE);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'language') return;
    url.searchParams.set(key, String(value));
  });

  return url;
}

async function fetchTmdb(path, params = {}) {
  if (!isTmdbConfigured()) {
    throw new Error('TMDB is not configured.');
  }

  const url = buildUrl(path, params);
  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const headers = { accept: 'application/json' };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.status_message || `TMDB request failed with status ${response.status}`);
  }

  cache.set(cacheKey, { timestamp: Date.now(), data });
  return data;
}

function normalizeMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.name || movie.original_title || 'Untitled',
    overview: movie.overview || '',
    vote_average: Number(movie.vote_average || 0),
    vote_count: Number(movie.vote_count || 0),
    popularity: Number(movie.popularity || 0),
    release_date: movie.release_date || movie.first_air_date || '',
    genre_ids: movie.genre_ids || (movie.genres || []).map((genre) => genre.id),
    poster_path: movie.poster_path || '',
    backdrop_path: movie.backdrop_path || '',
    source: 'tmdb',
  };
}

function normalizePage(data, page) {
  const results = Array.isArray(data.results)
    ? data.results.map(normalizeMovie).filter((movie) => movie.title)
    : [];

  return {
    page: Number(data.page || page || 1),
    total_results: Number(data.total_results || results.length),
    total_pages: Number(data.total_pages || 1),
    results,
    source: 'tmdb',
  };
}

function normalizeYear(year) {
  const value = Number(year);
  if (!Number.isInteger(value) || value < 1880 || value > 2100) return '';
  return value;
}

function normalizeRating(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value) || value <= 0) return '';
  return Math.min(Math.max(value, 0), 10);
}

function normalizeSort(sortBy) {
  const allowed = new Set([
    'popularity.desc',
    'vote_average.desc',
    'primary_release_date.desc',
    'revenue.desc',
  ]);
  return allowed.has(sortBy) ? sortBy : 'popularity.desc';
}

export async function tmdbGetGenres() {
  const data = await fetchTmdb('/genre/movie/list');
  return Array.isArray(data.genres) ? data.genres : [];
}

export async function tmdbSearchMovies(query, page = 1) {
  const data = await fetchTmdb('/search/movie', {
    query,
    page,
    include_adult: false,
  });
  return normalizePage(data, page);
}

export async function tmdbGetPopularMovies(page = 1) {
  const data = await fetchTmdb('/movie/popular', { page });
  return normalizePage(data, page);
}

async function tmdbGetMovieRecommendations(movieId, page = 1) {
  const recommendations = await fetchTmdb(`/movie/${movieId}/recommendations`, { page });
  if (Array.isArray(recommendations.results) && recommendations.results.length > 0) {
    return normalizePage(recommendations, page);
  }

  const similar = await fetchTmdb(`/movie/${movieId}/similar`, { page });
  return normalizePage(similar, page);
}

export async function tmdbGetRecommendations(genreIds = [], page = 1, options = {}) {
  if (options.movieId) {
    return tmdbGetMovieRecommendations(options.movieId, page);
  }

  const params = {
    page,
    include_adult: false,
    include_video: false,
    sort_by: normalizeSort(options.sortBy),
    'vote_count.gte': options.minRating ? 50 : 20,
  };

  if (genreIds.length > 0) {
    params.with_genres = genreIds.join(',');
  }

  const minRating = normalizeRating(options.minRating);
  if (minRating) {
    params['vote_average.gte'] = minRating;
  }

  const yearFrom = normalizeYear(options.yearFrom);
  if (yearFrom) {
    params['primary_release_date.gte'] = `${yearFrom}-01-01`;
  }

  const yearTo = normalizeYear(options.yearTo);
  if (yearTo) {
    params['primary_release_date.lte'] = `${yearTo}-12-31`;
  }

  const data = await fetchTmdb('/discover/movie', params);
  return normalizePage(data, page);
}

export async function tmdbGetMovieDetails(id) {
  const data = await fetchTmdb(`/movie/${id}`, {
    append_to_response: 'credits,videos,recommendations,similar',
  });

  const trailer = data.videos?.results?.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer'
  );

  return {
    ...normalizeMovie(data),
    genres: Array.isArray(data.genres) ? data.genres : [],
    runtime: data.runtime || null,
    tagline: data.tagline || '',
    homepage: data.homepage || '',
    trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
    credits: {
      cast: Array.isArray(data.credits?.cast)
        ? data.credits.cast.slice(0, 10).map((person) => ({
            id: person.id,
            name: person.name,
            character: person.character,
            profile_path: person.profile_path || '',
          }))
        : [],
    },
    recommendations: Array.isArray(data.recommendations?.results)
      ? data.recommendations.results.slice(0, 12).map(normalizeMovie)
      : [],
    similar: Array.isArray(data.similar?.results)
      ? data.similar.results.slice(0, 12).map(normalizeMovie)
      : [],
  };
}
