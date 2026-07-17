/**
 * Parse GPS coordinates from Google Maps URLs.
 * Handles the most common sharing formats used in Indonesia.
 */
export interface ParsedCoords {
  lat: number;
  lng: number;
}

/**
 * Attempt to extract lat/lng from a Google Maps URL string.
 * Returns null if the URL cannot be parsed client-side.
 */
export function parseMapsUrl(raw: string): ParsedCoords | null {
  const url = raw.trim();

  // Format 1: @lat,lng in path  (share/embed links)
  // e.g. https://www.google.com/maps/place/.../@-6.9175,107.6191,15z
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // Format 2: ?q=lat,lng or &q=lat,lng
  // e.g. https://maps.google.com/?q=-6.9175,107.6191
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // Format 3: /search/?query=lat,lng
  const queryMatch = url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // Format 4: ll=lat,lng
  const llMatch = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // Format 5: bare "lat,lng" string (user pasted coordinates directly)
  const bareMatch = url.match(/^(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)$/);
  if (bareMatch) {
    const lat = parseFloat(bareMatch[1]);
    const lng = parseFloat(bareMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  return null;
}

/** Shortened links (goo.gl, maps.app.goo.gl) need server-side redirect following. */
export function isShortenedMapsUrl(url: string): boolean {
  return /goo\.gl|maps\.app\.goo\.gl/.test(url);
}

function isValidCoords(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
}
