import { useState } from 'react';
import './MovieGrid.css';

const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

function getImageSrc(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${IMG_BASE}${path}`;
}

function getIndustryFromMovie(movie) {
  const lang = (movie.language || '').toLowerCase();
  if (lang === 'hi') return 'bollywood';
  if (lang === 'ne') return 'nepali';
  // Also check source — fallback bollywood/nepali movies have IDs in 2000s/3000s range
  if (movie.source === 'fallback') {
    if (movie.id >= 2000 && movie.id < 3000) return 'bollywood';
    if (movie.id >= 3000 && movie.id < 4000) return 'nepali';
  }
  return 'hollywood';
}

function MoviePoster({ movie }) {
  const [imgError, setImgError] = useState(false);

  if (!movie.poster_path || imgError) {
    const industry = getIndustryFromMovie(movie);
    return (
      <div className={`no-poster no-poster--${industry}`}>
        <span className="poster-icon">
          {industry === 'bollywood' ? '🎭' : industry === 'nepali' ? '🏔️' : '🎬'}
        </span>
        {industry !== 'hollywood' && (
          <span className="poster-industry-badge">{industry}</span>
        )}
        <span className="poster-title">{movie.title}</span>
        {movie.release_date && (
          <span className="poster-year">{movie.release_date.slice(0, 4)}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={getImageSrc(movie.poster_path)}
      alt={movie.title}
      onError={() => setImgError(true)}
    />
  );
}

function MovieGrid({ movies, onSelect }) {
  if (!movies || movies.length === 0) {
    return <div className="no-results">No movies found</div>;
  }

  return (
    <div className="movie-grid">
      {movies.map(movie => (
        <div key={movie.id} className="movie-card" onClick={() => onSelect(movie)}>
          <div className="poster-wrapper">
            <MoviePoster movie={movie} />
            {movie.vote_average > 0 && (
              <div className="rating">{movie.vote_average.toFixed(1)}</div>
            )}
          </div>
          <div className="movie-info">
            <h3 className="movie-title">{movie.title}</h3>
            <span className="movie-year">{movie.release_date?.slice(0, 4)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MovieGrid;
