import { useCallback, useEffect, useMemo, useState } from 'react';
import SearchBar from './components/SearchBar';
import MovieGrid from './components/MovieGrid';
import GenreFilter from './components/GenreFilter';
import MovieModal from './components/MovieModal';
import RecommendationControls from './components/RecommendationControls';
import './App.css';

const API_BASE = '/api';
const DEFAULT_SORT = 'popularity.desc';

function App() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('recommendations');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        selectedGenres.length > 0 ||
          minRating !== '0' ||
          yearFrom.trim() ||
          yearTo.trim() ||
          sortBy !== DEFAULT_SORT
      ),
    [minRating, selectedGenres.length, sortBy, yearFrom, yearTo]
  );

  const fetchJson = useCallback(async (url) => {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_BASE}/status`);
      setStatus(data);
    } catch (err) {
      console.error('Error fetching API status:', err);
    }
  }, [fetchJson]);

  const fetchGenres = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_BASE}/genres`);
      setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching genres:', err);
    }
  }, [fetchJson]);

  const fetchPopularMovies = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchJson(`${API_BASE}/popular`);
      setMovies(data.results || []);
      setView('popular');
    } catch (err) {
      setError(err.message);
      console.error('Error fetching popular movies:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchJson]);

  const fetchRecommendations = useCallback(
    async (genreIds = selectedGenres) => {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (genreIds.length > 0) params.set('genreIds', genreIds.join(','));
      if (minRating !== '0') params.set('minRating', minRating);
      if (yearFrom.trim()) params.set('yearFrom', yearFrom.trim());
      if (yearTo.trim()) params.set('yearTo', yearTo.trim());
      if (sortBy) params.set('sortBy', sortBy);

      const query = params.toString();

      try {
        const data = await fetchJson(`${API_BASE}/recommendations${query ? `?${query}` : ''}`);
        setMovies(data.results || []);
        setView('recommendations');
      } catch (err) {
        setError(err.message);
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchJson, minRating, selectedGenres, sortBy, yearFrom, yearTo]
  );

  const fetchMovieRecommendations = useCallback(
    async (movie) => {
      setLoading(true);
      setError('');
      setSelectedMovie(null);

      const params = new URLSearchParams({ movieId: String(movie.id) });
      if (movie.source) params.set('source', movie.source);
      if (minRating !== '0') params.set('minRating', minRating);
      if (yearFrom.trim()) params.set('yearFrom', yearFrom.trim());
      if (yearTo.trim()) params.set('yearTo', yearTo.trim());

      try {
        const data = await fetchJson(`${API_BASE}/recommendations?${params}`);
        setMovies(data.results || []);
        setView('recommendations');
      } catch (err) {
        setError(err.message);
        console.error('Error fetching movie recommendations:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchJson, minRating, yearFrom, yearTo]
  );

  useEffect(() => {
    fetchStatus();
    fetchGenres();
    fetchPopularMovies();
  }, [fetchGenres, fetchPopularMovies, fetchStatus]);

  useEffect(() => {
    if (hasActiveFilters) {
      fetchRecommendations(selectedGenres);
    }
  }, [fetchRecommendations, hasActiveFilters, selectedGenres]);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      fetchPopularMovies();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchJson(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
      setMovies(data.results || []);
      setView('search');
    } catch (err) {
      setError(err.message);
      console.error('Error searching movies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenreToggle = (genreId) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleClearFilters = () => {
    setSelectedGenres([]);
    setMinRating('0');
    setYearFrom('');
    setYearTo('');
    setSortBy(DEFAULT_SORT);
    fetchPopularMovies();
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo" onClick={handleClearFilters}>MovieRecommender</h1>
        <SearchBar onSearch={handleSearch} />
        {status && (
          <div className={`provider-status ${status.live ? 'live' : 'fallback'}`}>
            {status.live ? `Live ${status.provider.toUpperCase()}` : 'Demo data'}
          </div>
        )}
      </header>

      <main className="main">
        <GenreFilter
          genres={genres}
          selectedGenres={selectedGenres}
          onToggle={handleGenreToggle}
          onClear={handleClearFilters}
        />

        <RecommendationControls
          minRating={minRating}
          onClear={handleClearFilters}
          onSuggest={() => fetchRecommendations(selectedGenres)}
          setMinRating={setMinRating}
          setSortBy={setSortBy}
          setYearFrom={setYearFrom}
          setYearTo={setYearTo}
          sortBy={sortBy}
          yearFrom={yearFrom}
          yearTo={yearTo}
        />

        <div className="content-header">
          <h2>
            {view === 'search' && 'Search Results'}
            {view === 'recommendations' && 'Recommended For You'}
            {view === 'popular' && 'Popular Movies'}
          </h2>
          {movies.length > 0 && <span className="movie-count">{movies.length} movies</span>}
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <MovieGrid movies={movies} onSelect={setSelectedMovie} />
        )}
      </main>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onRecommend={fetchMovieRecommendations}
        />
      )}
    </div>
  );
}

export default App;
