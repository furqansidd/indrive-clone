const axios = require('axios');

// GET /api/location/autocomplete?q=...
exports.autocomplete = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const response = await axios.get('https://api.locationiq.com/v1/autocomplete', {
      params: {
        key: process.env.LOCATIONIQ_API_KEY,
        q,
        limit: 5,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Proxy Autocomplete error:', err.message);
    res.status(err.response?.status || 500).json({ message: err.message });
  }
};

// GET /api/location/geocode?q=...
exports.geocode = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Query is required' });

    const response = await axios.get('https://us1.locationiq.com/v1/search', {
      params: {
        key: process.env.LOCATIONIQ_API_KEY,
        q,
        format: 'json',
        limit: 1,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Proxy Geocoding error:', err.message);
    res.status(err.response?.status || 500).json({ message: err.message });
  }
};

// GET /api/location/reverse?lat=...&lon=...
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ message: 'lat and lon are required' });

    const response = await axios.get('https://us1.locationiq.com/v1/reverse', {
      params: {
        key: process.env.LOCATIONIQ_API_KEY,
        lat,
        lon,
        format: 'json',
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Proxy Reverse Geocoding error:', err.message);
    res.status(err.response?.status || 500).json({ message: err.message });
  }
};

// GET /api/location/directions?origin=lng,lat&destination=lng,lat
exports.directions = async (req, res) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ message: 'origin and destination are required' });
    }

    const url = `https://us1.locationiq.com/v1/directions/driving/${origin};${destination}`;
    const response = await axios.get(url, {
      params: {
        key: process.env.LOCATIONIQ_API_KEY,
        overview: 'full',
        geometries: 'geojson',
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Proxy Directions error:', err.message);
    res.status(err.response?.status || 500).json({ message: err.message });
  }
};
