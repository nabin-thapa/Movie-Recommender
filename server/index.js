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
  getIndustries,
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
    const { query, page = 1, industry = 'all' } = req.query;
    if (!query) return res.status(400).json({ error: 'Query parameter required' });
    const results = await searchMovies(query, parseInt(page), industry);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/popular', async (req, res) => {
  try {
    const { page = 1, industry = 'all' } = req.query;
    const results = await getPopularMovies(parseInt(page), industry);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/genres', async (req, res) => {
  try {
    const { industry = 'all' } = req.query;
    const results = await getGenres(industry);
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
      industry = 'all',
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
      industry,
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/movie/:id', async (req, res) => {
  try {
    const results = await getMovieDetails(req.params.id, { source: req.query.source, industry: req.query.industry });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/industries', (req, res) => {
  try {
    const results = getIndustries();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT in server/.env to a free port.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

function shutdown() {
  server.close(() => process.exit(0));
  // Force-exit if shutdown hangs on idle keep-alive connections
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
