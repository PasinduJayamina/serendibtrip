/**
 * Geocoding service using OpenStreetMap Nominatim API
 * Free, no API key required, rate-limited to 1 request/second
 */

// In-memory cache to avoid duplicate lookups
const geocodeCache = {};

/**
 * Check if a Nominatim result is a valid land-based location (not water/sea)
 */
function isValidLandResult(result) {
  // Reject results that are water features
  const waterTypes = ['water', 'bay', 'strait', 'ocean', 'sea', 'lake', 'river', 'lagoon', 'reservoir'];
  const resultType = (result.type || '').toLowerCase();
  const resultClass = (result.class || '').toLowerCase();
  
  if (waterTypes.some(w => resultType.includes(w)) || resultClass === 'natural' && waterTypes.some(w => resultType.includes(w))) {
    return false;
  }
  
  // Reject if display_name contains "ocean" or "sea" as standalone words
  const displayName = (result.display_name || '').toLowerCase();
  if (displayName.includes('indian ocean') || displayName.includes('bay of bengal') || displayName.includes('palk strait')) {
    return false;
  }
  
  return true;
}

/**
 * Geocode a place name + destination to get accurate lat/lng
 * @param {string} placeName - Name of the place (e.g., "Fort Frederick")
 * @param {string} destination - Destination city (e.g., "Trincomalee")
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function geocodePlace(placeName, destination) {
  if (!placeName || !destination) return null;

  // Skip transport items — they don't need geocoding
  const lowerName = placeName.toLowerCase();
  if (lowerName.includes('transport') || lowerName.includes('tuk-tuk') || lowerName.includes('taxi')) {
    return null;
  }

  const cacheKey = `${placeName}-${destination}`.toLowerCase();
  if (geocodeCache[cacheKey]) {
    return geocodeCache[cacheKey];
  }

  // Also check sessionStorage for persistence across same-session navigations
  try {
    const sessionCached = sessionStorage.getItem(`geo-${cacheKey}`);
    if (sessionCached) {
      const parsed = JSON.parse(sessionCached);
      geocodeCache[cacheKey] = parsed;
      return parsed;
    }
  } catch { /* ignore */ }

  try {
    // Search with place name + destination + "Sri Lanka" for better accuracy
    // Use addressdetails=1 to get more info for filtering
    const query = `${placeName}, ${destination}, Sri Lanka`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=lk&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        // Nominatim requires a User-Agent
        'User-Agent': 'SerendibTrip/1.0 (travel-planner)',
      },
    });

    if (!response.ok) return null;

    const results = await response.json();
    
    // Filter for valid land-based results within Sri Lanka
    for (const result of results) {
      if (!isValidLandResult(result)) continue;
      
      const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
      
      // Validate: must be within Sri Lanka bounding box
      if (coords.lat >= 5.8 && coords.lat <= 10.0 && coords.lng >= 79.3 && coords.lng <= 82.1) {
        geocodeCache[cacheKey] = coords;
        try {
          sessionStorage.setItem(`geo-${cacheKey}`, JSON.stringify(coords));
        } catch { /* ignore */ }
        return coords;
      }
    }

    // Fallback: try searching just the place name in Sri Lanka
    const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName + ', Sri Lanka')}&limit=5&countrycodes=lk&addressdetails=1`;
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SerendibTrip/1.0 (travel-planner)',
      },
    });

    if (fallbackResponse.ok) {
      const fallbackResults = await fallbackResponse.json();
      for (const result of fallbackResults) {
        if (!isValidLandResult(result)) continue;
        
        const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        if (coords.lat >= 5.8 && coords.lat <= 10.0 && coords.lng >= 79.3 && coords.lng <= 82.1) {
          geocodeCache[cacheKey] = coords;
          try {
            sessionStorage.setItem(`geo-${cacheKey}`, JSON.stringify(coords));
          } catch { /* ignore */ }
          return coords;
        }
      }
    }

    // Fallback: use the destination city as coordinates instead of nothing
    // This ensures at least the general area is shown
    const destUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination + ', Sri Lanka')}&limit=1&countrycodes=lk`;
    const destResponse = await fetch(destUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'SerendibTrip/1.0 (travel-planner)' },
    });
    
    if (destResponse.ok) {
      const destResults = await destResponse.json();
      if (destResults.length > 0) {
        const coords = { lat: parseFloat(destResults[0].lat), lng: parseFloat(destResults[0].lon) };
        if (coords.lat >= 5.8 && coords.lat <= 10.0 && coords.lng >= 79.3 && coords.lng <= 82.1) {
          geocodeCache[cacheKey] = coords;
          try {
            sessionStorage.setItem(`geo-${cacheKey}`, JSON.stringify(coords));
          } catch { /* ignore */ }
          return coords;
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('Geocoding failed for:', placeName, error.message);
    return null;
  }
}

/**
 * Geocode with rate limiting (Nominatim allows 1 req/sec)
 */
let lastGeocoderCall = 0;
export async function geocodePlaceRateLimited(placeName, destination) {
  const now = Date.now();
  const timeSinceLastCall = now - lastGeocoderCall;
  if (timeSinceLastCall < 1100) {
    await new Promise(resolve => setTimeout(resolve, 1100 - timeSinceLastCall));
  }
  lastGeocoderCall = Date.now();
  return geocodePlace(placeName, destination);
}
