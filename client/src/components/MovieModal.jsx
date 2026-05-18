import { useState, useEffect } from 'react';
import './MovieModal.css';

const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

function getImageSrc(path, base) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path}`;
}

function MovieModal({ movie, onClose, onRecommend, industry }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchDetails = async () => {
      setLoading(true);
      setDetails(null);
      setPosterError(false);
      setBackdropError(false);
      try {
        const params = new URLSearchParams();
        if (movie.source) params.set('source', movie.source);
        if (industry) params.set('industry', industry);
        const qs = params.toString();
        const res = await fetch(`/api/movie/${movie.id}${qs ? `?${qs}` : ''}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load movie details');
        if (!cancelled) setDetails(data);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [movie.id, movie.source, industry]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        {loading ? (
          <div className="modal-loading">Loading details...</div>
        ) : details ? (
          <>
            {details.backdrop_path && !backdropError && (
              <div className="modal-backdrop">
                <img src={getImageSrc(details.backdrop_path, BACKDROP_BASE)} alt="" onError={() => setBackdropError(true)} />
                <div className="backdrop-overlay"></div>
              </div>
            )}
            
            <div className="modal-content">
              <div className="modal-poster">
                {details.poster_path && !posterError ? (
                  <img src={getImageSrc(details.poster_path, IMG_BASE)} alt={details.title} onError={() => setPosterError(true)} />
                ) : (
                  <div className="no-poster-large">No Poster</div>
                )}
              </div>
              
              <div className="modal-info">
                <h2>{details.title}</h2>
                {details.tagline && <p className="tagline">{details.tagline}</p>}
                <div className="meta">
                  <span className="year">{details.release_date?.slice(0, 4)}</span>
                  <span className="rating">★ {details.vote_average?.toFixed(1)}</span>
                  {details.runtime && <span className="runtime">{details.runtime} min</span>}
                </div>
                
                {details.genres && (
                  <div className="genres">
                    {details.genres.map(g => (
                      <span key={g.id} className="genre-tag">{g.name}</span>
                    ))}
                  </div>
                )}
                
                <p className="overview">{details.overview}</p>

                {(details.trailer_url || onRecommend) && (
                  <div className="modal-actions">
                    {details.trailer_url && (
                      <a className="trailer-link" href={details.trailer_url} target="_blank" rel="noreferrer">
                        Watch trailer
                      </a>
                    )}
                    {onRecommend && (
                      <button type="button" className="similar-btn" onClick={() => onRecommend(movie)}>
                        More like this
                      </button>
                    )}
                  </div>
                )}
                
                {details.credits?.cast && details.credits.cast.length > 0 && (
                  <div className="cast">
                    <h3>Cast</h3>
                    <div className="cast-list">
                      {details.credits.cast.slice(0, 6).map(person => (
                        <div key={person.id} className="cast-member">
                          <span className="cast-name">{person.name}</span>
                          <span className="cast-character">{person.character}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="modal-error">Failed to load details</div>
        )}
      </div>
    </div>
  );
}

export default MovieModal;
