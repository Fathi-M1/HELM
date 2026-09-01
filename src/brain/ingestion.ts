import { Domain, Region, Signal, SignalPoint, TimeWindow } from './contracts';

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

function defaultWindow(): TimeWindow {
  const end = new Date();
  // Archive data often lags a few days
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end.getTime() - 120 * 24 * 3600 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function toSeries(times: string[] | undefined, values: (number | null)[] | undefined): SignalPoint[] {
  if (!times || !values) return [];
  const out: SignalPoint[] = [];
  for (let i = 0; i < times.length; i++) {
    const v = values[i];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    const t = times[i].slice(0, 10);
    out.push({ t, value: Number(v) });
  }
  out.sort((a, b) => a.t.localeCompare(b.t));
  return out;
}

function hourlyToDailyMean(
  times: string[] | undefined,
  values: (number | null)[] | undefined,
): SignalPoint[] {
  if (!times || !values) return [];
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < times.length; i++) {
    const v = values[i];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    const day = times[i].slice(0, 10);
    const arr = buckets.get(day) ?? [];
    arr.push(Number(v));
    buckets.set(day, arr);
  }
  const out: SignalPoint[] = [];
  for (const [t, vals] of buckets) {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    out.push({ t, value: mean });
  }
  out.sort((a, b) => a.t.localeCompare(b.t));
  return out;
}

function anomalyZ(series: SignalPoint[]): number | undefined {
  if (series.length < 30) return undefined;
  const values = series.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std === 0) return undefined;
  const recent = values.slice(-14);
  const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
  return (recentMean - mean) / std;
}

function makeSignal(
  sourceId: string,
  domain: Domain,
  label: string,
  unit: string,
  region: Region,
  series: SignalPoint[],
): Signal {
  return {
    id: `${sourceId}:${domain}`,
    sourceId,
    domain,
    label,
    unit,
    region,
    series,
    anomaly: anomalyZ(series),
  };
}

async function fetchArchive(region: Region, window: TimeWindow): Promise<Signal[]> {
  const url =
    `${ARCHIVE_URL}?latitude=${region.center.lat}&longitude=${region.center.lon}` +
    `&start_date=${window.start}&end_date=${window.end}` +
    `&daily=precipitation_sum,temperature_2m_max,soil_moisture_0_to_7cm_mean&timezone=UTC`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo archive HTTP ${res.status}`);
  const data = await res.json();
  const times: string[] | undefined = data?.daily?.time;
  const place = region.name;

  const signals: Signal[] = [];
  const precip = toSeries(times, data?.daily?.precipitation_sum);
  if (precip.length) {
    signals.push(
      makeSignal('open-meteo-precip', 'precipitation', `Rainfall (${place})`, 'mm/day', region, precip),
    );
  }
  const temp = toSeries(times, data?.daily?.temperature_2m_max);
  if (temp.length) {
    signals.push(
      makeSignal('open-meteo-temp', 'temperature', `Max temperature (${place})`, '°C', region, temp),
    );
  }
  const soil = toSeries(times, data?.daily?.soil_moisture_0_to_7cm_mean);
  if (soil.length) {
    signals.push(
      makeSignal(
        'open-meteo-soil',
        'soil_moisture',
        `Soil moisture 0–7 cm (${place})`,
        'm³/m³',
        region,
        soil,
      ),
    );
  }
  if (!signals.length) throw new Error('Open-Meteo archive returned no usable series');
  return signals;
}

async function fetchAirQuality(region: Region, window: TimeWindow): Promise<Signal[]> {
  const url =
    `${AQ_URL}?latitude=${region.center.lat}&longitude=${region.center.lon}` +
    `&start_date=${window.start}&end_date=${window.end}` +
    `&hourly=pm2_5,aerosol_optical_depth&timezone=UTC`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo AQ HTTP ${res.status}`);
  const data = await res.json();
  const times: string[] | undefined = data?.hourly?.time;
  const place = region.name;

  const signals: Signal[] = [];
  const pm = hourlyToDailyMean(times, data?.hourly?.pm2_5);
  if (pm.length) {
    signals.push(
      makeSignal('open-meteo-pm25', 'air_quality', `PM2.5 (${place})`, 'µg/m³', region, pm),
    );
  }
  // AOD shares air_quality domain in the contract (no dedicated aerosol domain).
  // Distinct sourceId keeps Signal.id unique for discovery pairing vs precip/temp/soil.
  const aod = hourlyToDailyMean(times, data?.hourly?.aerosol_optical_depth);
  if (aod.length) {
    signals.push(
      makeSignal(
        'open-meteo-aod',
        'air_quality',
        `Aerosol optical depth (${place})`,
        'AOD',
        region,
        aod,
      ),
    );
  }
  if (!signals.length) throw new Error('Open-Meteo AQ returned no usable series');
  return signals;
}

export async function fetchSignals(region: Region, window?: TimeWindow): Promise<Signal[]> {
  const w = window ?? defaultWindow();
  const results = await Promise.allSettled([fetchArchive(region, w), fetchAirQuality(region, w)]);
  const signals: Signal[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') signals.push(...r.value);
  }
  return signals;
}
