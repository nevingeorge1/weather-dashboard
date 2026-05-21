/**
 * Global Weather Intelligence Dashboard
 * backend/server.js — Express API server
 * Module 2: Weather Cards UI Enhancement
 */
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Routes ──────────────────────────────────────────────────

/**
 * GET /api/weather?city=<cityName>
 * Fetches current weather from OpenWeather API and returns structured JSON.
 */
app.get('/api/weather', async (req, res) => {
  const { city } = req.query;

  if (!city || city.trim() === '') {
    return res.status(400).json({
      error: true,
      message: 'City name is required.',
    });
  }

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'your_api_key_here') {
    return res.status(500).json({
      error: true,
      message: 'OpenWeather API key is not configured. Please set OPENWEATHER_API_KEY in backend/.env',
    });
  }

  try {
    const response = await axios.get(OPENWEATHER_BASE_URL, {
      params: {
        q: city.trim(),
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
      },
    });

    const data = response.data;

    // Helper: round to 1 decimal place
    const r1 = (n) => n != null ? parseFloat(n.toFixed(1)) : null;

    // Return structured, clean JSON for the frontend
    return res.json({
      name: data.name,
      country: data.sys.country,
      temp: r1(data.main.temp),
      feels_like: r1(data.main.feels_like),
      temp_min: r1(data.main.temp_min),
      temp_max: r1(data.main.temp_max),
      humidity: data.main.humidity ?? null,
      description: data.weather[0].description,
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      wind_speed: r1(data.wind?.speed),           // m/s
      wind_speed_kmh: r1((data.wind?.speed ?? 0) * 3.6), // km/h
      visibility: data.visibility ? parseFloat((data.visibility / 1000).toFixed(1)) : null, // km
      timezone: data.timezone,
    });
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      if (status === 404) {
        return res.status(404).json({
          error: true,
          message: `City "${city}" not found. Please check the spelling and try again.`,
        });
      }
      if (status === 401) {
        return res.status(401).json({
          error: true,
          message: 'Invalid API key. Please check your OPENWEATHER_API_KEY.',
        });
      }
    }

    console.error('[Weather API Error]', err.message);
    return res.status(500).json({
      error: true,
      message: 'Something went wrong while fetching weather data. Please try again.',
    });
  }
});

/**
 * GET /api/forecast?city=<cityName>
 * Fetches 5-day forecast from OpenWeather API.
 * API returns data every 3 hours (40 items). We extract 1 data point per day.
 */
app.get('/api/forecast', async (req, res) => {
  const { city } = req.query;

  if (!city || city.trim() === '') {
    return res.status(400).json({ error: true, message: 'City name is required.' });
  }

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'your_api_key_here') {
    return res.status(500).json({ error: true, message: 'API key not configured.' });
  }

  try {
    const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        q: city.trim(),
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
      },
    });

    const list = response.data.list;
    const dailyForecasts = [];
    const seenDates = new Set();
    const r1 = (n) => n != null ? parseFloat(n.toFixed(1)) : null;

    // Loop through 3-hour chunks
    for (const item of list) {
      // item.dt_txt format: "YYYY-MM-DD HH:MM:SS"
      const dateStr = item.dt_txt.split(' ')[0]; // "YYYY-MM-DD"
      const hourStr = item.dt_txt.split(' ')[1]; // "HH:MM:SS"

      // We want exactly 5 unique days.
      if (!seenDates.has(dateStr)) {
        // Prefer midday readings (12:00:00). 
        // If it's the first day and we're past 12:00, we just take the first available chunk for today.
        // For future days, we wait until we hit the 12:00 chunk.
        if (hourStr === '12:00:00' || !list.find(i => i.dt_txt.startsWith(dateStr) && i.dt_txt.includes('12:00:00'))) {
          seenDates.add(dateStr);
          dailyForecasts.push({
            date: dateStr,
            temp: r1(item.main.temp),
            humidity: item.main.humidity,
            wind_speed: r1((item.wind?.speed ?? 0) * 3.6), // km/h
            condition: item.weather[0].main,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
          });

          // Break once we have 5 days
          if (dailyForecasts.length === 5) break;
        }
      }
    }

    return res.json(dailyForecasts);

  } catch (err) {
    if (err.response && (err.response.status === 404 || err.response.status === 401)) {
      return res.status(err.response.status).json({
        error: true,
        message: err.response.data.message || 'Forecast fetch error',
      });
    }
    console.error('[Forecast API Error]', err.message);
    return res.status(500).json({ error: true, message: 'Failed to fetch forecast.' });
  }
});

// ─── GET /api/weather/coords ──────────────────────────────────
/**
 * Fetches current weather from OpenWeather API using lat/lon.
 */
app.get('/api/weather/coords', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: true, message: 'Latitude and longitude are required.' });
  }

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'your_api_key_here') {
    return res.status(500).json({ error: true, message: 'OpenWeather API key is not configured.' });
  }

  try {
    const response = await axios.get(OPENWEATHER_BASE_URL, {
      params: {
        lat: lat,
        lon: lon,
        appid: OPENWEATHER_API_KEY,
        units: 'metric',
      },
    });

    const data = response.data;
    const r1 = (n) => n != null ? parseFloat(n.toFixed(1)) : null;

    return res.json({
      name: data.name,
      country: data.sys.country,
      temp: r1(data.main.temp),
      feels_like: r1(data.main.feels_like),
      temp_min: r1(data.main.temp_min),
      temp_max: r1(data.main.temp_max),
      humidity: data.main.humidity ?? null,
      description: data.weather[0].description,
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      wind_speed: r1(data.wind?.speed),
      wind_speed_kmh: r1((data.wind?.speed ?? 0) * 3.6),
      visibility: data.visibility ? parseFloat((data.visibility / 1000).toFixed(1)) : null,
      timezone: data.timezone,
    });
  } catch (err) {
    console.error('[Weather API Coords Error]', err.message);
    return res.status(500).json({
      error: true,
      message: 'Something went wrong while fetching weather data. Please try again.',
    });
  }
});

// ─── Catch-all: serve frontend index.html ────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌍  Weather Dashboard Server running at http://localhost:${PORT}`);
  console.log(`📡  API endpoint: http://localhost:${PORT}/api/weather?city=London\n`);
});

module.exports = app;
