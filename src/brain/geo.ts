import { Region } from './contracts';

const GAZETTEER: { keys: string[]; region: Region }[] = [
  {
    keys: ['philippines', 'manila', 'metro manila', 'luzon'],
    region: { name: 'Metro Manila, Philippines', center: { lat: 14.6, lon: 120.98 } },
  },
  {
    keys: ['cebu', 'visayas'],
    region: { name: 'Cebu, Philippines', center: { lat: 10.32, lon: 123.89 } },
  },
  {
    keys: ['davao', 'mindanao'],
    region: { name: 'Davao, Philippines', center: { lat: 7.19, lon: 125.46 } },
  },
  {
    keys: ['tokyo', 'japan'],
    region: { name: 'Tokyo, Japan', center: { lat: 35.68, lon: 139.69 } },
  },
  {
    keys: ['singapore'],
    region: { name: 'Singapore', center: { lat: 1.35, lon: 103.82 } },
  },
  {
    keys: ['bangkok', 'thailand'],
    region: { name: 'Bangkok, Thailand', center: { lat: 13.76, lon: 100.5 } },
  },
  {
    keys: ['jakarta', 'indonesia'],
    region: { name: 'Jakarta, Indonesia', center: { lat: -6.21, lon: 106.85 } },
  },
  {
    keys: ['ho chi minh', 'saigon', 'vietnam'],
    region: { name: 'Ho Chi Minh City, Vietnam', center: { lat: 10.82, lon: 106.63 } },
  },
  {
    keys: ['hong kong'],
    region: { name: 'Hong Kong', center: { lat: 22.32, lon: 114.17 } },
  },
  {
    keys: ['sydney', 'australia'],
    region: { name: 'Sydney, Australia', center: { lat: -33.87, lon: 151.21 } },
  },
  {
    keys: ['odessa', 'odesa', 'ukraine'],
    region: { name: 'Odessa, Ukraine', center: { lat: 46.48, lon: 30.73 } },
  },
  {
    keys: ['cairo', 'egypt'],
    region: { name: 'Cairo, Egypt', center: { lat: 30.04, lon: 31.24 } },
  },
  {
    keys: ['delhi', 'new delhi'],
    region: { name: 'Delhi, India', center: { lat: 28.61, lon: 77.21 } },
  },
  {
    keys: ['lagos', 'nigeria'],
    region: { name: 'Lagos, Nigeria', center: { lat: 6.52, lon: 3.38 } },
  },
  {
    keys: ['sao paulo', 'brazil'],
    region: { name: 'São Paulo, Brazil', center: { lat: -23.55, lon: -46.63 } },
  },
  {
    keys: ['new york', 'nyc', 'united states', 'usa'],
    region: { name: 'New York, USA', center: { lat: 40.71, lon: -74.01 } },
  },
  {
    keys: ['amazon', 'amazonas', 'manaus'],
    region: { name: 'Amazon Basin, Brazil', center: { lat: -3.12, lon: -60.02 } },
  },
  {
    keys: ['nepal', 'kathmandu'],
    region: { name: 'Nepal', center: { lat: 28.39, lon: 84.12 } },
  },
  {
    keys: ['greece', 'athens'],
    region: { name: 'Greece', center: { lat: 39.07, lon: 21.82 } },
  },
];

const DEFAULT_REGION: Region = {
  name: 'Metro Manila, Philippines',
  center: { lat: 14.6, lon: 120.98 },
};

/** Filler phrases stripped before treating the remainder as a place name. */
const PLACE_FILLERS: RegExp[] = [
  /^why\s+is\s+there\s+/i,
  /^why\s+are\s+there\s+/i,
  /^why\s+is\s+/i,
  /^why\s+are\s+/i,
  /^what(?:['\u2019]?s|\s+is|\s+are)\s+(?:\w+\s+){0,3}(?:driving|causing)\s+/i,
  /^what(?:['\u2019]?s|\s+is)\s+happening\s+(?:with|to|in)\s+/i,
  /^what(?:['\u2019]?s|\s+is)\s+really\s+happening\s+(?:with|to|in|on)\s+/i,
  /^explain\s+/i,
  /^trace\s+/i,
  /^detect\s+/i,
  /^analyze\s+/i,
  /^(?:the\s+)?(?:flooding|floods|flood|heat(?:\s+stress)?|drought|rain|rains|wildfire|fires|smoke|haze)\s+(?:in|at|around|near)\s+/i,
  /^(?:flooding|floods|flood|heat(?:\s+stress)?|drought|rain|rains)\s+/i,
];

const TRAILING_NOISE =
  /\b(right\s+now|this\s+week|today|currently|lately|drying|flooding|burning|warming|air|weather|climate)\b.*$/i;

const TRAILING_DESCRIPTOR =
  /\b(?:'?\s*air|weather|climate|heat|dust|floods?|flooding)?\s*(?:so\s+)?(?:polluted|hot|dusty|humid|wet|dry|bad).*$/i;

/** Normalize possessives and curly quotes so "Delhi's" → "Delhi". */
function stripPossessives(s: string): string {
  return s.replace(/['\u2019]s\b/gi, '').replace(/['\u2019]/g, '');
}

function cleanPlaceToken(place: string): string {
  let p = stripPossessives(place).trim();
  p = p.replace(/^the\s+/i, '');
  p = p.replace(TRAILING_DESCRIPTOR, '').trim();
  p = p.replace(TRAILING_NOISE, '').trim();
  p = p.replace(/[?!.:,;]+$/g, '').trim();
  // If leftover is "Delhi air" take the leading place-like token(s)
  const words = p.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    p = words.slice(0, 2).join(' ');
  }
  return p;
}

function extractPlacePhrase(question: string): string | null {
  let s = (question ?? '').trim();
  if (!s) return null;
  s = stripPossessives(s);
  s = s.replace(/[?!.:,;]+$/g, '').trim();

  // Prefer "... in|at|near|around|across <place>" — handles "floods in Nepal", "heat in Greece"
  const loc = s.match(
    /\b(?:in|at|near|around|across|over)\s+((?:the\s+)?[A-Za-z][\w\s.-]{0,60})$/i,
  );
  if (loc?.[1]) {
    const place = cleanPlaceToken(loc[1]);
    if (place.length >= 2) return place;
  }

  for (const re of PLACE_FILLERS) {
    s = s.replace(re, '');
  }
  s = cleanPlaceToken(s);
  s = s.replace(/^(?:in|at|around|near|the)\s+/i, '').trim();

  if (s.length < 2) return null;
  if (/^(why|what|how|when|where|is|are)\b/i.test(s) && s.split(/\s+/).length > 5) {
    return null;
  }
  return s;
}

type GeocodeHit = {
  name?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  admin1?: string;
};

function regionLabel(hit: GeocodeHit): string {
  const city = hit.name?.trim() ?? '';
  const country = hit.country?.trim();
  if (country && country.toLowerCase() !== city.toLowerCase()) {
    return `${city}, ${country}`;
  }
  return city;
}

function pickBestHit(results: GeocodeHit[], query: string): GeocodeHit | null {
  const valid = results.filter(
    (h) =>
      h.name?.trim() &&
      typeof h.latitude === 'number' &&
      typeof h.longitude === 'number',
  );
  if (!valid.length) return null;

  const q = query.toLowerCase();
  // Prefer hits whose country/name clearly match the query intent (e.g. Amazon → Brazil)
  const scored = valid.map((h) => {
    let score = h.population ?? 0;
    const blob = `${h.name} ${h.admin1 ?? ''} ${h.country ?? ''}`.toLowerCase();
    if (q.includes('amazon') && /brazil|brasil|peru|colombia|amazonas/.test(blob)) score += 1e9;
    if (q.includes('nepal') && /nepal/.test(blob)) score += 1e9;
    if (q.includes('greece') && /greece|hellenic/.test(blob)) score += 1e9;
    return { h, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].h;
}

async function geocodePlace(place: string): Promise<Region | null> {
  const variants = [
    place,
    place.replace(/\b(basin|region|valley|province|state|delta|river)\b/gi, '').replace(/\s+/g, ' ').trim(),
    place.split(/\s+/).slice(0, 2).join(' '),
    place.split(/\s+/)[0],
  ].filter((v, i, arr) => v.length >= 2 && arr.indexOf(v) === i);

  for (const nameQuery of variants) {
    try {
      const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nameQuery)}` +
        `&count=5&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as { results?: GeocodeHit[] };
      const hit = pickBestHit(data.results ?? [], place);
      if (!hit) continue;
      return {
        name: regionLabel(hit),
        center: { lat: hit.latitude!, lon: hit.longitude! },
      };
    } catch {
      continue;
    }
  }
  return null;
}

/** Resolve a free-text place/question into a Region. Never throws. */
export async function resolveRegion(question: string): Promise<Region> {
  try {
    // Strip possessives so "delhi's" still hits gazetteer key "delhi"
    const q = stripPossessives(question ?? '').toLowerCase();
    for (const entry of GAZETTEER) {
      if (entry.keys.some((k) => q.includes(k))) {
        return entry.region;
      }
    }

    const place = extractPlacePhrase(question ?? '');
    if (!place) return DEFAULT_REGION;

    const remote = await geocodePlace(place);
    if (remote) return remote;
    return DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}
