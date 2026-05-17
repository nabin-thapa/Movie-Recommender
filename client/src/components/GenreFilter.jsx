import './GenreFilter.css';

function GenreFilter({ genres, selectedGenres, onToggle, onClear }) {
  if (!genres || genres.length === 0) return null;

  return (
    <div className="genre-filter">
      <div className="genre-label">Filter by genre:</div>
      <div className="genre-list">
        {genres.map(genre => (
          <button
            key={genre.id}
            className={`genre-btn ${selectedGenres.includes(genre.id) ? 'active' : ''}`}
            onClick={() => onToggle(genre.id)}
          >
            {genre.name}
          </button>
        ))}
      </div>
      {selectedGenres.length > 0 && (
        <button className="clear-btn" onClick={onClear}>Clear</button>
      )}
    </div>
  );
}

export default GenreFilter;
