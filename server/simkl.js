const SIMKL_FEEDS = [
  'https://data.simkl.in/discover/trending/movies/today_100.json',
  'https://data.simkl.in/discover/trending/movies/week_500.json',
  'https://data.simkl.in/discover/trending/movies/month_500.json',
];

const CACHE_TTL = 1000 * 60 * 30;
const USER_AGENT = 'movie-recommender/1.0 (local project)';

// Map our app's industry tabs to Simkl country codes.
// Simkl tags items with a 2-letter country code (e.g. "us", "in", "np").
const INDUSTRY_COUNTRIES = {
  hollywood: ['us', 'gb', 'ca', 'au', 'ie', 'nz'],
  bollywood: ['in'],
  nepali: ['np'],
};

const GENRE_ALIASES = {
  'action': 28,
  'adventure': 12,
  'animation': 16,
  'comedy': 35,
  'crime': 80,
  'documentary': 99,
  'drama': 18,
  'family': 10751,
  'fantasy': 14,
  'history': 36,
  'horror': 27,
  'music': 10402,
  'musical': 10402,
  'mystery': 9648,
  'romance': 10749,
  'sci-fi': 878,
  'science fiction': 878,
  'science-fiction': 878,
  'thriller': 53,
  'war': 10752,
  'western': 37,
};

let cachedMovies = null;
let cacheTimestamp = null;

export function isSimklEnabled() {
  return process.env.SIMKL_ENABLED !== 'false';
}

export function getSimklStatus() {
  return {
    provider: 'simkl',
    configured: true,
    live: true,
    message: 'Using live public Simkl movie feeds. No API key required.',
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Simkl request failed with status ${response.status}`);
  }

  return response.json();
}

async function fetchSimklMovies() {
  if (cachedMovies && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedMovies;
  }

  const feedResults = await Promise.all(SIMKL_FEEDS.map(fetchJson));
  const byId = new Map();

  feedResults.flat().forEach((item) => {
    const movie = normalizeMovie(item);
    if (!movie.id || byId.has(movie.id)) return;
    byId.set(movie.id, movie);
  });

  cachedMovies = Array.from(byId.values());
  cacheTimestamp = Date.now();
  return cachedMovies;
}

function normalizeMovie(item) {
  const simklId = Number(item.ids?.simkl_id || item.ids?.simkl || item.ids?.tmdb);
  const genres = Array.isArray(item.genres) ? item.genres : [];
  const voteAverage = Number(item.ratings?.imdb?.rating || item.ratings?.simkl?.rating || 0);
  const voteCount = Number(item.ratings?.imdb?.votes || item.ratings?.simkl?.votes || 0);
  const watched = Number(item.watched || 0);
  const planToWatch = Number(item.plan_to_watch || 0);
  const rankBoost = Math.max(0, 600 - Number(item.rank || 600));

  return {
    id: simklId,
    title: item.title || 'Untitled',
    overview: item.overview || '',
    vote_average: voteAverage,
    vote_count: voteCount,
    popularity: watched + planToWatch + rankBoost,
    release_date: normalizeDate(item.release_date || item.theater || item.dvd_date),
    genre_ids: genres.map((genre) => genreToId(genre)).filter(Boolean),
    genre_names: genres,
    poster_path: item.poster ? `https://simkl.in/posters/${item.poster}_w.jpg` : '',
    backdrop_path: item.fanart ? `https://simkl.in/fanart/${item.fanart}_w.jpg` : '',
    runtime: parseRuntime(item.runtime),
    trailer_url: item.trailer ? `https://www.youtube.com/watch?v=${item.trailer}` : '',
    metadata: item.metadata || '',
    provider_url: item.url ? `https://simkl.com${item.url}` : '',
    imdb_id: item.ids?.imdb || '',
    tmdb_id: item.ids?.tmdb || '',
    country: String(item.country || '').toLowerCase(),
    source: 'simkl',
  };
}

function filterByIndustry(movies, industry) {
  if (!industry || industry === 'all') return movies;
  const allowed = INDUSTRY_COUNTRIES[industry];
  if (!allowed) return movies;
  const allowedSet = new Set(allowed);
  return movies.filter((movie) => allowedSet.has(movie.country));
}

function genreToId(genre) {
  return GENRE_ALIASES[String(genre || '').trim().toLowerCase()];
}

function normalizeDate(value) {
  if (!value) return '';

  const match = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return value;

  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseRuntime(runtime) {
  if (!runtime) return null;

  const text = String(runtime);
  const hours = Number(text.match(/(\d+)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*m/)?.[1] || 0);
  return hours * 60 + minutes || null;
}

function getYear(movie) {
  return Number(String(movie.release_date || '').slice(0, 4)) || 0;
}

function applyFilters(movies, options = {}) {
  const minRating = Number(options.minRating || 0);
  const yearFrom = Number(options.yearFrom || 0);
  const yearTo = Number(options.yearTo || 0);

  return movies.filter((movie) => {
    if (minRating && movie.vote_average < minRating) return false;

    const year = getYear(movie);
    if (yearFrom && year && year < yearFrom) return false;
    if (yearTo && year && year > yearTo) return false;

    return true;
  });
}

function sortMovies(movies, sortBy = 'popularity.desc') {
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
  const currentPage = Number(page) || 1;
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;

  return {
    page: currentPage,
    total_results: movies.length,
    total_pages: Math.max(1, Math.ceil(movies.length / perPage)),
    results: movies.slice(start, end),
    source: 'simkl',
  };
}

export async function simklGetPopularMovies(page = 1, industry = 'all') {
  const movies = filterByIndustry(await fetchSimklMovies(), industry);
  return paginate(sortMovies(movies), page);
}

export async function simklSearchMovies(query, page = 1, industry = 'all') {
  const movies = filterByIndustry(await fetchSimklMovies(), industry);
  const lowerQuery = String(query || '').toLowerCase();
  const filtered = movies.filter((movie) =>
    `${movie.title} ${movie.overview}`.toLowerCase().includes(lowerQuery)
  );

  return paginate(sortMovies(filtered), page);
}

export async function simklGetGenres(industry = 'all') {
  const movies = filterByIndustry(await fetchSimklMovies(), industry);
  const genres = new Map();

  movies.forEach((movie) => {
    movie.genre_names?.forEach((name) => {
      const id = genreToId(name);
      if (id) genres.set(id, name);
    });
  });

  return Array.from(genres)
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function simklGetMovieDetails(id) {
  const movies = await fetchSimklMovies();
  const movie = movies.find((item) => item.id === Number(id));

  if (!movie) {
    throw new Error('Movie not found in Simkl feed');
  }

  return {
    ...movie,
    genres: movie.genre_names?.map((name) => ({ id: genreToId(name), name })).filter((genre) => genre.id) || [],
    credits: { cast: [] },
    recommendations: [],
    similar: [],
  };
}

export async function simklGetRecommendations(genreIds = [], page = 1, options = {}) {
  const industry = options.industry || 'all';
  const movies = filterByIndustry(await fetchSimklMovies(), industry);
  const seedMovie = options.movieId
    ? movies.find((movie) => movie.id === Number(options.movieId))
    : null;
  const activeGenreIds = genreIds.length > 0 ? genreIds : (seedMovie?.genre_ids || []);

  const filtered = applyFilters(movies, options).filter((movie) => !seedMovie || movie.id !== seedMovie.id);

  if (activeGenreIds.length === 0) {
    return paginate(sortMovies(filtered, options.sortBy), page);
  }

  const scored = filtered
    .map((movie) => {
      const overlap = movie.genre_ids?.filter((id) => activeGenreIds.includes(id)).length || 0;
      const genreScore = (overlap / activeGenreIds.length) * 60;
      const ratingScore = (movie.vote_average / 10) * 25;
      const popularityScore = Math.min(movie.popularity / 10000, 1) * 15;

      return {
        ...movie,
        recommendation_score: genreScore + ratingScore + popularityScore,
      };
    })
    .sort((a, b) => b.recommendation_score - a.recommendation_score);

  return paginate(scored, page);
}
