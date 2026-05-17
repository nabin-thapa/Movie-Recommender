import './RecommendationControls.css';

const currentYear = new Date().getFullYear();

function RecommendationControls({
  minRating,
  onClear,
  onSuggest,
  setMinRating,
  setSortBy,
  setYearFrom,
  setYearTo,
  sortBy,
  yearFrom,
  yearTo,
}) {
  return (
    <div className="recommendation-controls">
      <label>
        <span>Min rating</span>
        <select value={minRating} onChange={(event) => setMinRating(event.target.value)}>
          <option value="0">Any</option>
          <option value="6">6+</option>
          <option value="7">7+</option>
          <option value="8">8+</option>
        </select>
      </label>

      <label>
        <span>From</span>
        <input
          type="number"
          min="1880"
          max={currentYear}
          placeholder="Year"
          value={yearFrom}
          onChange={(event) => setYearFrom(event.target.value)}
        />
      </label>

      <label>
        <span>To</span>
        <input
          type="number"
          min="1880"
          max={currentYear}
          placeholder="Year"
          value={yearTo}
          onChange={(event) => setYearTo(event.target.value)}
        />
      </label>

      <label>
        <span>Sort</span>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="popularity.desc">Popular</option>
          <option value="vote_average.desc">Top rated</option>
          <option value="primary_release_date.desc">Newest</option>
          <option value="revenue.desc">Box office</option>
        </select>
      </label>

      <div className="control-actions">
        <button type="button" className="suggest-btn" onClick={onSuggest}>
          Suggest
        </button>
        <button type="button" className="reset-btn" onClick={onClear}>
          Reset
        </button>
      </div>
    </div>
  );
}

export default RecommendationControls;
