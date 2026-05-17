# Movie Recommender

A React + Node.js movie recommendation app. It fetches live internet movie data from public Simkl JSON feeds by default, with posters, genres, ratings, overviews, and trailers. TMDB can be added later as an optional richer provider, and a built-in fallback dataset keeps the app usable if the internet is unavailable.

## Features

- Search movies by title
- Browse popular movies
- Filter recommendations by genre, rating, year range, and sort mode
- View movie details, cast, runtime, overview, poster, backdrop, and trailer links when available
- Live internet data works without an API key
- Backend API proxy keeps optional API credentials out of the browser
- Fallback data keeps the app usable while credentials are missing

## Setup

Install dependencies:

```bash
cd server
npm install

cd ../client
npm install
```

Optional configuration:

```bash
cd server
copy .env.example .env
```

Simkl live feeds work automatically. To use TMDB instead, edit `server/.env` and set either:

```env
TMDB_API_KEY=your_v3_api_key
```

or:

```env
TMDB_ACCESS_TOKEN=your_v4_read_access_token
```

Run the app:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

Open http://localhost:5173.

## API

- `GET /api/status`
- `GET /api/popular`
- `GET /api/search?query=inception`
- `GET /api/genres`
- `GET /api/recommendations?genreIds=28,878&minRating=7&yearFrom=2000&sortBy=popularity.desc`
- `GET /api/movie/:id`

## Recommendation Logic

With TMDB configured, recommendations use TMDB's movie discovery and movie recommendation endpoints. Without TMDB credentials, recommendations use the public Simkl feeds. If the live feed is unavailable, the server scores fallback movies by genre match, popularity, and rating.
