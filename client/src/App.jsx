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
  const [industry, setIndustry] = useState('all');

  const [resultSource, setResultSource] = useState(null);
  const [error, setError] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT);
  const [industries, setIndustries] = useState([]);

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
      // Fire-and-forget: warms server caches and surfaces a startup error if the
      // backend is unreachable. The actual badge in the header reflects each
      // response's source, not this global status.
      await fetchJson(`${API_BASE}/status`);
    } catch (err) {
      console.error('Error fetching API status:', err);
    }
  }, [fetchJson]);

  const fetchIndustries = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_BASE}/industries`);
      setIndustries(Array.isArray(data) && data.length > 0 ? data : ['all', 'hollywood', 'bollywood', 'nepali']);
    } catch (err) {
      console.error('Error fetching industries:', err);
      setIndustries(['all', 'hollywood', 'bollywood', 'nepali']);
    }
  }, [fetchJson]);

  const fetchGenres = useCallback(async () => {
    try {
      const data = await fetchJson(`${API_BASE}/genres?industry=${industry}`);
      setGenres(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching genres:', err);
    }
  }, [fetchJson, industry]);

  const fetchPopularMovies = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchJson(`${API_BASE}/popular?industry=${industry}`);
      setMovies(data.results || []);
      setResultSource(data.source || null);
      setView('popular');
    } catch (err) {
      setError(err.message);
      console.error('Error fetching popular movies:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchJson, industry]);

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
      if (industry) params.set('industry', industry);

      const query = params.toString();

      try {
        const data = await fetchJson(`${API_BASE}/recommendations${query ? `?${query}` : ''}`);
        setMovies(data.results || []);
        setResultSource(data.source || null);
        setView('recommendations');
      } catch (err) {
        setError(err.message);
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchJson, minRating, selectedGenres, sortBy, yearFrom, yearTo, industry]
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
      if (industry) params.set('industry', industry);

      try {
        const data = await fetchJson(`${API_BASE}/recommendations?${params}`);
        setMovies(data.results || []);
        setResultSource(data.source || null);
        setView('recommendations');
      } catch (err) {
        setError(err.message);
        console.error('Error fetching movie recommendations:', err);
      } finally {
        setLoading(false);
      }
    },
    [fetchJson, minRating, yearFrom, yearTo, industry]
  );

  useEffect(() => {
    fetchStatus();
    fetchIndustries();
  }, [fetchStatus, fetchIndustries]);

  // When industry changes, refetch genres + popular. Filter resets happen
  // synchronously in handleIndustryChange so they're already cleared by the
  // time these effects run, avoiding a race with the auto-recommendations
  // effect below.
  useEffect(() => {
    fetchGenres();
    fetchPopularMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industry]);

  useEffect(() => {
    if (hasActiveFilters) {
      fetchRecommendations(selectedGenres);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveFilters, selectedGenres, minRating, yearFrom, yearTo, sortBy]);

  const handleIndustryChange = (nextIndustry) => {
    if (nextIndustry === industry) return;
    setSelectedGenres([]);
    setMinRating('0');
    setYearFrom('');
    setYearTo('');
    setSortBy(DEFAULT_SORT);
    setView('popular');
    setIndustry(nextIndustry);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      fetchPopularMovies();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchJson(`${API_BASE}/search?query=${encodeURIComponent(query)}&industry=${industry}`);
      setMovies(data.results || []);
      setResultSource(data.source || null);
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
        <div className="industry-tabs">
          {industries.map((ind) => (
            <button
              key={ind}
              className={`tab ${ind === industry ? 'active' : ''}`}
              onClick={() => handleIndustryChange(ind)}
            >
              {ind.charAt(0).toUpperCase() + ind.slice(1)}
            </button>
          ))}
        </div>
        <SearchBar onSearch={handleSearch} />
        {resultSource && (
          <div
            className={`provider-status ${
              resultSource === 'fallback' ? 'fallback' : 'live'
            }`}
            title={
              resultSource === 'fallback'
                ? 'Showing built-in fallback data'
                : `Showing live data from ${resultSource.toUpperCase()}`
            }
          >
            {resultSource === 'fallback'
              ? 'Demo data'
              : `Live ${resultSource.toUpperCase()}`}
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
          industry={industry}
          onClose={() => setSelectedMovie(null)}
          onRecommend={fetchMovieRecommendations}
        />
      )}
    </div>
  );
}

export default App;
