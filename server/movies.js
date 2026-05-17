// Free movie data source — no API key required
// Fetches a public dataset from GitHub and caches it in memory

import {
  getTmdbStatus,
  isTmdbConfigured,
  tmdbGetGenres,
  tmdbGetMovieDetails,
  tmdbGetPopularMovies,
  tmdbGetRecommendations,
  tmdbSearchMovies,
} from './tmdb.js';
import {
  getSimklStatus,
  isSimklEnabled,
  simklGetGenres,
  simklGetMovieDetails,
  simklGetPopularMovies,
  simklGetRecommendations,
  simklSearchMovies,
} from './simkl.js';

const DATASET_URL = 'https://raw.githubusercontent.com/datasets/movies/master/data/movies.csv';

// Fallback embedded dataset in case the remote fetch fails
const FALLBACK_MOVIES = [
  { id: 1, title: "The Shawshank Redemption", overview: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.", vote_average: 8.7, popularity: 95, release_date: "1994-09-23", genre_ids: [18], poster_path: "", backdrop_path: "" },
  { id: 2, title: "The Godfather", overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.", vote_average: 8.7, popularity: 90, release_date: "1972-03-14", genre_ids: [18, 80], poster_path: "", backdrop_path: "" },
  { id: 3, title: "The Dark Knight", overview: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.", vote_average: 8.5, popularity: 98, release_date: "2008-07-16", genre_ids: [28, 80, 18], poster_path: "", backdrop_path: "" },
  { id: 4, title: "Pulp Fiction", overview: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.", vote_average: 8.5, popularity: 85, release_date: "1994-09-10", genre_ids: [80, 18], poster_path: "", backdrop_path: "" },
  { id: 5, title: "Schindler's List", overview: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.", vote_average: 8.6, popularity: 70, release_date: "1993-11-30", genre_ids: [18, 36, 10752], poster_path: "", backdrop_path: "" },
  { id: 6, title: "The Lord of the Rings: The Return of the King", overview: "Gandalf and Aragorn lead the World of Men against Sauron's army to draw his gaze from Frodo and Sam as they approach Mount Doom with the One Ring.", vote_average: 8.5, popularity: 88, release_date: "2003-12-01", genre_ids: [12, 14, 28], poster_path: "", backdrop_path: "" },
  { id: 7, title: "Forrest Gump", overview: "The presidencies of Kennedy and Johnson, the events of Vietnam, Watergate and other historical events unfold through the perspective of an Alabama man with an IQ of 75.", vote_average: 8.5, popularity: 82, release_date: "1994-06-23", genre_ids: [35, 18, 10749], poster_path: "", backdrop_path: "" },
  { id: 8, title: "Inception", overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.", vote_average: 8.4, popularity: 96, release_date: "2010-07-15", genre_ids: [28, 878, 12], poster_path: "", backdrop_path: "" },
  { id: 9, title: "Fight Club", overview: "An insomniac office worker and a devil-may-care soapmaker form an underground fight club that evolves into something much, much more.", vote_average: 8.4, popularity: 87, release_date: "1999-10-15", genre_ids: [18], poster_path: "", backdrop_path: "" },
  { id: 10, title: "The Matrix", overview: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.", vote_average: 8.2, popularity: 91, release_date: "1999-03-30", genre_ids: [28, 878], poster_path: "", backdrop_path: "" },
  { id: 11, title: "Goodfellas", overview: "The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.", vote_average: 8.5, popularity: 75, release_date: "1990-09-12", genre_ids: [18, 80], poster_path: "", backdrop_path: "" },
  { id: 12, title: "Star Wars: Episode IV - A New Hope", overview: "Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire's world-destroying battle-station.", vote_average: 8.2, popularity: 89, release_date: "1977-05-25", genre_ids: [12, 28, 878], poster_path: "", backdrop_path: "" },
  { id: 13, title: "The Silence of the Lambs", overview: "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.", vote_average: 8.3, popularity: 72, release_date: "1991-02-14", genre_ids: [80, 18, 53], poster_path: "", backdrop_path: "" },
  { id: 14, title: "Interstellar", overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.", vote_average: 8.4, popularity: 97, release_date: "2014-11-05", genre_ids: [12, 18, 878], poster_path: "", backdrop_path: "" },
  { id: 15, title: "Saving Private Ryan", overview: "Following the Normandy Landings, a group of U.S. soldiers go behind enemy lines to retrieve a paratrooper whose brothers have been killed in action.", vote_average: 8.2, popularity: 78, release_date: "1998-07-24", genre_ids: [18, 36, 10752], poster_path: "", backdrop_path: "" },
  { id: 16, title: "The Green Mile", overview: "The lives of guards on Death Row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.", vote_average: 8.5, popularity: 76, release_date: "1999-12-10", genre_ids: [14, 18, 80], poster_path: "", backdrop_path: "" },
  { id: 17, title: "Se7en", overview: "Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.", vote_average: 8.4, popularity: 80, release_date: "1995-09-22", genre_ids: [80, 18, 53], poster_path: "", backdrop_path: "" },
  { id: 18, title: "The Usual Suspects", overview: "A sole survivor tells of the twisty events leading up to a horrific gun battle on a boat, which began when five criminals met at a seemingly random police lineup.", vote_average: 8.5, popularity: 68, release_date: "1995-07-19", genre_ids: [18, 80, 53], poster_path: "", backdrop_path: "" },
  { id: 19, title: "Leon: The Professional", overview: "Mathilda, a 12-year-old girl, is reluctantly taken in by Léon, a professional assassin, after her family is murdered. An unusual relationship forms as she becomes his protégée.", vote_average: 8.3, popularity: 79, release_date: "1994-09-14", genre_ids: [28, 80, 18], poster_path: "", backdrop_path: "" },
  { id: 20, title: "Spirited Away", overview: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.", vote_average: 8.5, popularity: 83, release_date: "2001-07-20", genre_ids: [16, 10751, 14], poster_path: "", backdrop_path: "" },
  { id: 21, title: "The Pianist", overview: "A Polish Jewish musician struggles to survive the destruction of the Warsaw ghetto of World War II.", vote_average: 8.5, popularity: 65, release_date: "2002-09-25", genre_ids: [18, 36, 10752], poster_path: "", backdrop_path: "" },
  { id: 22, title: "Gladiator", overview: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.", vote_average: 8.2, popularity: 84, release_date: "2000-05-01", genre_ids: [28, 18, 12], poster_path: "", backdrop_path: "" },
  { id: 23, title: "The Departed", overview: "An undercover cop and a mole in the police attempt to identify each other while infiltrating an Irish gang in South Boston.", vote_average: 8.2, popularity: 77, release_date: "2006-10-04", genre_ids: [18, 80, 53], poster_path: "", backdrop_path: "" },
  { id: 24, title: "The Prestige", overview: "After a tragic accident, two stage magicians engage in a battle to create the ultimate illusion while sacrificing everything they have to outwit each other.", vote_average: 8.5, popularity: 81, release_date: "2006-10-17", genre_ids: [18, 9648, 878], poster_path: "", backdrop_path: "" },
  { id: 25, title: "Whiplash", overview: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.", vote_average: 8.3, popularity: 86, release_date: "2014-10-10", genre_ids: [18, 10402], poster_path: "", backdrop_path: "" },
  { id: 26, title: "The Lion King", overview: "Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne.", vote_average: 8.3, popularity: 92, release_date: "1994-06-15", genre_ids: [10751, 16, 18], poster_path: "", backdrop_path: "" },
  { id: 27, title: "Back to the Future", overview: "Marty McFly, a 17-year-old high school student, is accidentally sent thirty years into the past in a time-traveling DeLorean invented by his close friend.", vote_average: 8.3, popularity: 88, release_date: "1985-07-03", genre_ids: [12, 35, 878], poster_path: "", backdrop_path: "" },
  { id: 28, title: "Alien", overview: "After a space merchant vessel receives an unknown transmission as a distress call, one of the crew is attacked by a mysterious life form.", vote_average: 8.1, popularity: 74, release_date: "1979-05-25", genre_ids: [27, 878], poster_path: "", backdrop_path: "" },
  { id: 29, title: "Apocalypse Now", overview: "A U.S. Army officer serving in Vietnam is tasked with assassinating a renegade Special Forces Colonel who sees himself as a god.", vote_average: 8.3, popularity: 63, release_date: "1979-08-15", genre_ids: [18, 10752], poster_path: "", backdrop_path: "" },
  { id: 30, title: "Memento", overview: "A man with short-term memory loss attempts to track down his wife's murderer.", vote_average: 8.2, popularity: 69, release_date: "2000-10-11", genre_ids: [9648, 53], poster_path: "", backdrop_path: "" },
  { id: 31, title: "Django Unchained", overview: "With the help of a German bounty hunter, a freed slave sets out to rescue his wife from a brutal Mississippi plantation owner.", vote_average: 8.2, popularity: 93, release_date: "2012-12-25", genre_ids: [18, 37], poster_path: "", backdrop_path: "" },
  { id: 32, title: "WALL·E", overview: "In the distant future, a small waste-collecting robot inadvertently embarks on a space journey that will ultimately decide the fate of mankind.", vote_average: 8.1, popularity: 85, release_date: "2008-06-22", genre_ids: [16, 10751, 878], poster_path: "", backdrop_path: "" },
  { id: 33, title: "The Lives of Others", overview: "In 1984 East Berlin, an agent of the secret police conducting surveillance on a writer and his lover finds himself becoming increasingly absorbed by their lives.", vote_average: 8.4, popularity: 55, release_date: "2006-03-23", genre_ids: [18, 53], poster_path: "", backdrop_path: "" },
  { id: 34, title: "Sunset Boulevard", overview: "A screenwriter develops a dangerous relationship with a faded film star determined to make a triumphant return.", vote_average: 8.4, popularity: 50, release_date: "1950-08-10", genre_ids: [18], poster_path: "", backdrop_path: "" },
  { id: 35, title: "Paths of Glory", overview: "After refusing to attack an enemy position, a general accuses the soldiers of cowardice and their commanding officer must defend them.", vote_average: 8.4, popularity: 45, release_date: "1957-10-25", genre_ids: [18, 36, 10752], poster_path: "", backdrop_path: "" },
  { id: 36, title: "The Shining", overview: "A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence.", vote_average: 8.2, popularity: 78, release_date: "1980-05-23", genre_ids: [27, 53], poster_path: "", backdrop_path: "" },
  { id: 37, title: "Avengers: Infinity War", overview: "The Avengers and their allies must be willing to sacrifice all in an attempt to defeat the powerful Thanos before his blitz of devastation puts an end to the universe.", vote_average: 8.3, popularity: 99, release_date: "2018-04-25", genre_ids: [12, 28, 878], poster_path: "", backdrop_path: "" },
  { id: 38, title: "Spider-Man: Into the Spider-Verse", overview: "Teen Miles Morales becomes the Spider-Man of his reality, and crosses paths with counterparts from other dimensions.", vote_average: 8.4, popularity: 94, release_date: "2018-12-06", genre_ids: [28, 12, 16, 878], poster_path: "", backdrop_path: "" },
  { id: 39, title: "Joker", overview: "During the 1980s, a failed stand-up comedian is driven insane and turns to a life of crime and chaos in Gotham City.", vote_average: 8.2, popularity: 97, release_date: "2019-10-02", genre_ids: [80, 18, 53], poster_path: "", backdrop_path: "" },
  { id: 40, title: "Parasite", overview: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.", vote_average: 8.5, popularity: 91, release_date: "2019-05-30", genre_ids: [35, 53, 18], poster_path: "", backdrop_path: "" },
  { id: 41, title: "Toy Story", overview: "A cowboy doll is profoundly threatened and jealous when a new spaceman figure supplants him as top toy in a boy's room.", vote_average: 8.0, popularity: 87, release_date: "1995-10-30", genre_ids: [16, 35, 10751], poster_path: "", backdrop_path: "" },
  { id: 42, title: "Finding Nemo", overview: "After his son is captured in the Great Barrier Reef and taken to Sydney, a timid clownfish sets out on a journey to bring him home.", vote_average: 7.8, popularity: 83, release_date: "2003-05-30", genre_ids: [16, 10751], poster_path: "", backdrop_path: "" },
  { id: 43, title: "Coco", overview: "Aspiring musician Miguel, confronted with his family's ancestral ban on music, enters the Land of the Dead to find his great-great-grandfather.", vote_average: 8.2, popularity: 90, release_date: "2017-10-27", genre_ids: [16, 10751, 14], poster_path: "", backdrop_path: "" },
  { id: 44, title: "Up", overview: "78-year-old Carl Fredricksen travels to Paradise Falls in his house equipped with balloons, inadvertently taking a young stowaway.", vote_average: 7.9, popularity: 82, release_date: "2009-05-28", genre_ids: [16, 35, 10751], poster_path: "", backdrop_path: "" },
  { id: 45, title: "Inside Out", overview: "After young Riley is uprooted from her Midwest life and moved to San Francisco, her emotions conflict on how best to navigate a new city.", vote_average: 8.0, popularity: 88, release_date: "2015-06-09", genre_ids: [16, 35, 10751], poster_path: "", backdrop_path: "" },
  { id: 46, title: "The Incredibles", overview: "A family of undercover superheroes, while trying to live the quiet suburban life, are forced into action to save the world.", vote_average: 7.7, popularity: 80, release_date: "2004-10-27", genre_ids: [28, 12, 16], poster_path: "", backdrop_path: "" },
  { id: 47, title: "Ratatouille", overview: "A rat who can cook makes an unusual alliance with a young kitchen worker at a famous restaurant.", vote_average: 7.8, popularity: 76, release_date: "2007-06-21", genre_ids: [16, 35, 10751], poster_path: "", backdrop_path: "" },
  { id: 48, title: "The Truman Show", overview: "An insurance salesman discovers his whole life is actually a reality TV show and must decide what to do with this knowledge.", vote_average: 8.1, popularity: 73, release_date: "1998-06-04", genre_ids: [35, 18, 878], poster_path: "", backdrop_path: "" },
  { id: 49, title: "Eternal Sunshine of the Spotless Mind", overview: "When their relationship turns sour, a couple undergoes a medical procedure to have each other erased from their memories.", vote_average: 8.1, popularity: 71, release_date: "2004-03-19", genre_ids: [878, 18, 10749], poster_path: "", backdrop_path: "" },
  { id: 50, title: "No Country for Old Men", overview: "Violence and mayhem ensue after a hunter stumbles upon a drug deal gone wrong and more than two million dollars in cash.", vote_average: 8.1, popularity: 67, release_date: "2007-11-09", genre_ids: [80, 18, 53], poster_path: "", backdrop_path: "" },
];

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

const GENRE_NAME_TO_ID = Object.fromEntries(
  Object.entries(GENRE_MAP).map(([id, name]) => [name.toLowerCase(), Number(id)])
);

let cachedMovies = null;
let cacheTimestamp = null;
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

async function fetchDataset() {
  if (cachedMovies && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return cachedMovies;
  }

  try {
    const response = await fetch(DATASET_URL);
    if (!response.ok) throw new Error('Failed to fetch dataset');
    const csvText = await response.text();
    cachedMovies = parseCSV(csvText);
    cacheTimestamp = Date.now();
    return cachedMovies;
  } catch (error) {
    console.warn('Remote dataset fetch failed, using fallback data:', error.message);
    cachedMovies = FALLBACK_MOVIES.map(movie => ({ ...movie, source: 'fallback' }));
    cacheTimestamp = Date.now();
    return cachedMovies;
  }
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const movies = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim().replace(/^"|"$/g, '') || '';
    });

    const id = parseInt(row.id || row.movie_id || i);
    const title = row.title || row.original_title || 'Unknown';
    const overview = row.overview || row.description || '';
    const vote_average = parseFloat(row.vote_average || row.rating || row.imdb_rating || 0) || 0;
    const popularity = parseFloat(row.popularity || row.vote_count || 50) || 50;
    const release_date = row.release_date || row.year || '';
    const poster_path = row.poster_path || '';
    const backdrop_path = row.backdrop_path || '';
    
    const genre_ids = parseGenreIds(row.genre_ids || row.genres || '');

    movies.push({
      id,
      title,
      overview,
      vote_average,
      popularity,
      release_date,
      genre_ids,
      poster_path,
      backdrop_path,
      source: 'dataset'
    });
  }

  return movies;
}

function parseGenreIds(genreStr) {
  if (!genreStr) return [];

  return genreStr
    .split(/[,|]/)
    .map(genre => genre.trim().replace(/^"|"$/g, ''))
    .map(genre => {
      const numericId = Number(genre);
      if (Number.isInteger(numericId) && numericId > 0) return numericId;
      return GENRE_NAME_TO_ID[genre.toLowerCase()];
    })
    .filter(Boolean);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
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
      fallbackMovieCount: FALLBACK_MOVIES.length,
    };
  }

  if (isSimklEnabled()) {
    return {
      ...getSimklStatus(),
      fallbackMovieCount: FALLBACK_MOVIES.length,
    };
  }

  return {
    provider: 'fallback',
    configured: false,
    live: false,
    message: 'Using built-in fallback data.',
    fallbackMovieCount: FALLBACK_MOVIES.length,
  };
}

export async function searchMovies(query, page = 1) {
  if (isTmdbConfigured()) {
    try {
      return await tmdbSearchMovies(query, page);
    } catch (error) {
      console.warn('TMDB search failed, using fallback data:', error.message);
    }
  }

  if (isSimklEnabled()) {
    try {
      return await simklSearchMovies(query, page);
    } catch (error) {
      console.warn('Simkl search failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset();
  const lowerQuery = query.toLowerCase();
  const filtered = movies.filter(m =>
    m.title.toLowerCase().includes(lowerQuery)
  );

  return paginate(filtered, page);
}

export async function getPopularMovies(page = 1) {
  if (isTmdbConfigured()) {
    try {
      return await tmdbGetPopularMovies(page);
    } catch (error) {
      console.warn('TMDB popular fetch failed, using fallback data:', error.message);
    }
  }

  if (isSimklEnabled()) {
    try {
      return await simklGetPopularMovies(page);
    } catch (error) {
      console.warn('Simkl popular fetch failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset();
  return paginate(sortLocalMovies(movies), page);
}

export async function getGenres() {
  if (isTmdbConfigured()) {
    try {
      return await tmdbGetGenres();
    } catch (error) {
      console.warn('TMDB genres fetch failed, using fallback data:', error.message);
    }
  }

  if (isSimklEnabled()) {
    try {
      return await simklGetGenres();
    } catch (error) {
      console.warn('Simkl genres fetch failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset();
  const genreIdSet = new Set();
  movies.forEach(m => m.genre_ids?.forEach(id => genreIdSet.add(id)));
  
  return Array.from(genreIdSet)
    .sort((a, b) => a - b)
    .map(id => ({ id, name: GENRE_MAP[id] || `Genre ${id}` }));
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

  const movies = await fetchDataset();
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
  if (options.source !== 'fallback' && options.source !== 'dataset' && isTmdbConfigured()) {
    try {
      return await tmdbGetRecommendations(genreIds, page, options);
    } catch (error) {
      console.warn('TMDB recommendations fetch failed, using fallback data:', error.message);
    }
  }

  if (options.source !== 'fallback' && options.source !== 'dataset' && isSimklEnabled()) {
    try {
      return await simklGetRecommendations(genreIds, page, options);
    } catch (error) {
      console.warn('Simkl recommendations fetch failed, using fallback data:', error.message);
    }
  }

  const movies = await fetchDataset();
  const seedMovie = options.movieId
    ? movies.find(movie => movie.id === parseInt(options.movieId))
    : null;
  const activeGenreIds = genreIds.length > 0 ? genreIds : (seedMovie?.genre_ids || []);
  
  if (activeGenreIds.length === 0) {
    return paginate(sortLocalMovies(applyLocalFilters(movies, options), options.sortBy), page);
  }

  const scored = applyLocalFilters(movies, options)
    .filter(movie => !seedMovie || movie.id !== seedMovie.id)
    .map(movie => ({
      ...movie,
      recommendation_score: calculateScore(movie, activeGenreIds)
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
