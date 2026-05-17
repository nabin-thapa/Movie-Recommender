import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getDataSourceStatus,
  getGenres,
  getMovieDetails,
  getPopularMovies,
  getRecommendations,
  searchMovies,
} from './movies.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/status', (req, res) => {
  res.json(getDataSourceStatus());
});

app.get('/api/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    if (!query) return res.status(400).json({ error: 'Query parameter required' });
    const results = await searchMovies(query, parseInt(page));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/popular', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const results = await getPopularMovies(parseInt(page));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/genres', async (req, res) => {
  try {
    const results = await getGenres();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/recommendations', async (req, res) => {
  try {
    const {
      genreIds,
      minRating,
      movieId,
      page = 1,
      source,
      sortBy,
      yearFrom,
      yearTo,
    } = req.query;

    const parsedGenreIds = genreIds
      ? genreIds.split(',').map(Number).filter(Number.isFinite)
      : [];

    const results = await getRecommendations(parsedGenreIds, parseInt(page), {
      minRating,
      movieId,
      source,
      sortBy,
      yearFrom,
      yearTo,
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/movie/:id', async (req, res) => {
  try {
    const results = await getMovieDetails(req.params.id, { source: req.query.source });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
