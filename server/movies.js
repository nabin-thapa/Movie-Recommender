// Free movie data source — no API key required
// Uses a curated bundled dataset cached in memory.

import {
  getTmdbStatus,
  isTmdbConfigured,
  tmdbGetGenres,
  tmdbGetMovieDetails,
  tmdbGetPopularMovies,
  tmdbGetRecommendations,
  tmdbSearchMovies,
} from './tmdb.js';
import { FALLBACK_DATA } from './fallback-data.js';
import {
  getSimklStatus,
  isSimklEnabled,
  simklGetGenres,
  simklGetMovieDetails,
  simklGetPopularMovies,
  simklGetRecommendations,
  simklSearchMovies,
} from './simkl.js';

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

async function fetchDataset(industry = 'all') {
  const cacheKey = industry;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.movies;
  }

  let movies = [];

  if (industry === 'bollywood') {
    movies = FALLBACK_DATA.bollywood.map(movie => ({ ...movie, source: 'fallback' }));
  } else if (industry === 'nepali') {
    movies = FALLBACK_DATA.nepali.map(movie => ({ ...movie, source: 'fallback' }));
  } else if (industry === 'hollywood') {
    movies = (FALLBACK_DATA.hollywood || []).map(movie => ({ ...movie, source: 'fallback' }));
  } else {
    // industry === 'all'
    movies = Object.values(FALLBACK_DATA)
      .flat()
      .map(movie => ({ ...movie, source: 'fallback' }));
  }

  cache.set(cacheKey, { timestamp: Date.now(), movies });
  return movies;
}

function withLocalSource(movie) {
  return { ...movie, source: movie.source || 'fallback' };
}

function getYear(movie) {
  return Number(String(movie.release_date || '').slice(0, 4)) || 0;
}

function applyLocalFilters(movies, options = {}) {
  const minRating = Number(options.minRating || 0);
  const yearFrom = Number(options.yearFrom || 0);
  const yearTo = Number(options.yearTo || 0);

  return movies.filter(movie => {
    if (minRating && movie.vote_average < minRating) return false;

    const year = getYear(movie);
    if (yearFrom && year && year < yearFrom) return false;
    if (yearTo && year && year > yearTo) return false;

    return true;
  });
}

function sortLocalMovies(movies, sortBy = 'popularity.desc') {
  const sorted = [...movies];

  if (sortBy === 'vote_average.desc') {
    return sorted.sort((a, b) => b.vote_average - a.vote_average);
  }

  if (sortBy === 'primary_release_date.desc') {
    return sorted.sort((a, b) => getYear(b) - getYear(a));
  }

  return sorted.sort((a, b) => b.popularity - a.popularity);
}

function paginate(movies, page = 1) {
  const perPage = 20;
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return {
    page,
    total_results: movies.length,
    total_pages: Math.ceil(movies.length / perPage),
    results: movies.slice(start, end).map(withLocalSource),
    source: 'fallback'
  };
}

export function getDataSourceStatus() {
  if (isTmdbConfigured()) {
    return {
      ...getTmdbStatus(),
      fallbackMovieCount: Object.values(FALLBACK_DATA).flat().length,
    };
  }

  if (isSimklEnabled()) {
    return {
      ...getSimklStatus(),
      fallbackMovieCount: Object.values(FALLBACK_DATA).flat().length,
    };
  }

  return {
    provider: 'fallback',
    configured: false,
    live: false,
    message: 'Using built-in fallback data.',
    fallbackMovieCount: Object.values(FALLBACK_DATA).flat().length,
  };
}

// New endpoint helper to list supported industries
export function getIndustries() {
  return ['all', 'hollywood', 'bollywood', 'nepali'];
}
export async function searchMovies(query, page = 1, industry = 'all') {
  if (isTmdbConfigured()) {
    try {
      // TMDB search ignores industry; combine and let the local layer filter if needed.
      return await tmdbSearchMovies(query, page);
    } catch (error) {
      console.warn('TMDB search failed, trying next provider:', error.message);
    }
  }

  if (isSimklEnabled()) {
    try {
      return await simklSearchMovies(query, page, industry);
    } catch (error) {
      console.warn('Simkl search failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset(industry);
  const lowerQuery = String(query || '').toLowerCase();
  const filtered = movies.filter((m) => m.title.toLowerCase().includes(lowerQuery));

  return paginate(filtered, page);
}

export async function getPopularMovies(page = 1, industry = 'all') {
  if (isTmdbConfigured()) {
    try {
      return await tmdbGetPopularMovies(page);
    } catch (error) {
      console.warn('TMDB popular fetch failed, trying next provider:', error.message);
    }
  }

  if (isSimklEnabled()) {
    try {
      return await simklGetPopularMovies(page, industry);
    } catch (error) {
      console.warn('Simkl popular fetch failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset(industry);
  return paginate(sortLocalMovies(movies), page);
}

export async function getGenres(industry = 'all') {
  if (isTmdbConfigured()) {
    try {
      return await tmdbGetGenres();
    } catch (error) {
      console.warn('TMDB genres fetch failed, trying next provider:', error.message);
    }
  }

  if (isSimklEnabled()) {
    try {
      return await simklGetGenres(industry);
    } catch (error) {
      console.warn('Simkl genres fetch failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset(industry);
  const genreIdSet = new Set();
  movies.forEach((m) => m.genre_ids?.forEach((id) => genreIdSet.add(id)));

  return Array.from(genreIdSet)
    .sort((a, b) => a - b)
    .map((id) => ({ id, name: GENRE_MAP[id] || `Genre ${id}` }));
}

export async function getMovieDetails(id, options = {}) {
  if (options.source === 'simkl') {
    return simklGetMovieDetails(id);
  }

  if (options.source !== 'fallback' && options.source !== 'dataset' && isTmdbConfigured()) {
    try {
      return await tmdbGetMovieDetails(id);
    } catch (error) {
      console.warn('TMDB details fetch failed, using fallback data:', error.message);
    }
  }

  if (options.source !== 'fallback' && options.source !== 'dataset' && isSimklEnabled()) {
    try {
      return await simklGetMovieDetails(id);
    } catch (error) {
      console.warn('Simkl details fetch failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset(options.industry || 'all');
  const movie = movies.find(m => m.id === parseInt(id));
  
  if (!movie) throw new Error('Movie not found');
  
  const genreObjects = (movie.genre_ids || []).map(id => ({
    id,
    name: GENRE_MAP[id] || `Genre ${id}`
  }));
  
  return {
    ...withLocalSource(movie),
    genres: genreObjects,
    runtime: 120,
    credits: { cast: [] }
  };
}

export async function getRecommendations(genreIds = [], page = 1, options = {}) {
  const industry = options.industry || 'all';

  if (options.source !== 'fallback' && options.source !== 'dataset' && isTmdbConfigured()) {
    try {
      return await tmdbGetRecommendations(genreIds, page, options);
    } catch (error) {
      console.warn('TMDB recommendations fetch failed, trying next provider:', error.message);
    }
  }

  if (options.source !== 'fallback' && options.source !== 'dataset' && isSimklEnabled()) {
    try {
      return await simklGetRecommendations(genreIds, page, { ...options, industry });
    } catch (error) {
      console.warn('Simkl recommendations fetch failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset(industry);
  const seedMovie = options.movieId
    ? movies.find((movie) => movie.id === parseInt(options.movieId))
    : null;
  const activeGenreIds = genreIds.length > 0 ? genreIds : (seedMovie?.genre_ids || []);

  if (activeGenreIds.length === 0) {
    return paginate(sortLocalMovies(applyLocalFilters(movies, options), options.sortBy), page);
  }

  const scored = applyLocalFilters(movies, options)
    .filter((movie) => !seedMovie || movie.id !== seedMovie.id)
    .map((movie) => ({
      ...movie,
      recommendation_score: calculateScore(movie, activeGenreIds),
    }));

  scored.sort((a, b) => b.recommendation_score - a.recommendation_score);

  return paginate(scored, page);
}

function calculateScore(movie, genreIds) {
  const genreOverlap = movie.genre_ids?.filter(id => genreIds.includes(id)).length || 0;
  const genreScore = (genreOverlap / genreIds.length) * 40;
  const popularityScore = (movie.popularity / 100) * 30;
  const voteScore = (movie.vote_average / 10) * 30;
  return genreScore + popularityScore + voteScore;
}
