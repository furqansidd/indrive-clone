import api from './client';

/**
 * Queries LocationIQ Autocomplete API via Backend Proxy
 */
export async function fetchPlacesAutocomplete(input) {
  if (!input || input.trim() === '') return [];
  try {
    const response = await api.get('/location/autocomplete', {
      params: { q: input },
    });
    if (response.data && Array.isArray(response.data)) {
      return response.data.map(p => ({
        description: p.display_name,
        placeId: p.place_id,
        latitude: parseFloat(p.lat),
        longitude: parseFloat(p.lon),
      }));
    }
    return [];
  } catch (error) {
    console.error('LocationIQ Autocomplete error:', error);
    return [];
  }
}

/**
 * Stub to match older codebase interface, returns the item directly since 
 * LocationIQ autocomplete already includes lat/lon in predictions.
 */
export async function fetchPlaceDetails(placeId) {
  // Since we already resolve coordinates in autocomplete, details logic isn't needed separately.
  // We can pass the selected suggestion directly in UI instead.
  return null;
}

/**
 * Queries LocationIQ Forward Geocoding Search API via Backend Proxy
 */
export async function geocodeAddress(address) {
  if (!address || address.trim() === '') return null;
  try {
    const response = await api.get('/location/geocode', {
      params: { q: address },
    });
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        address: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      };
    }
    return null;
  } catch (error) {
    console.error('LocationIQ Geocoding error:', error);
    return null;
  }
}

/**
 * Queries LocationIQ Reverse Geocoding API via Backend Proxy
 */
export async function reverseGeocodeCoords(lat, lon) {
  try {
    const response = await api.get('/location/reverse', {
      params: { lat, lon },
    });
    if (response.data && response.data.display_name) {
      return response.data.display_name;
    }
    return `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`;
  } catch (error) {
    console.error('LocationIQ Reverse Geocoding error:', error);
    return `Lat: ${lat.toFixed(4)}, Lng: ${lon.toFixed(4)}`;
  }
}

/**
 * Queries LocationIQ Routing Directions API via Backend Proxy
 */
export async function fetchDirections(origin, destination) {
  try {
    const originStr = `${origin.longitude},${origin.latitude}`;
    const destStr = `${destination.longitude},${destination.latitude}`;

    const response = await api.get('/location/directions', {
      params: {
        origin: originStr,
        destination: destStr,
      },
    });

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      const coordinates = route.geometry.coordinates.map(coord => ({
        longitude: coord[0],
        latitude: coord[1],
      }));

      const distanceKm = leg.distance / 1000;
      const durationMin = leg.duration / 60;

      return {
        polylineCoordinates: coordinates,
        distanceMeters: leg.distance,
        durationSeconds: leg.duration,
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `${Math.round(durationMin)} min`,
      };
    }
    return null;
  } catch (error) {
    console.error('LocationIQ Directions error:', error);
    return null;
  }
}
