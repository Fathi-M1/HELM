import { CandidateLink, DiscoveryResult, Domain, Region, Signal, TimeWindow } from './contracts';

const SURPRISE: Record<string, number> = {
  'precipitation|soil_moisture': 0.3,
  'precipitation|flood': 0.3,
  'soil_moisture|fire': 0.7,
  'temperature|fire': 0.6,
  'air_quality|fire': 0.7,
  'fire|air_quality': 0.7,
  'ocean|precipitation': 0.8,
  'air_quality|seismic': 0.9,
  'flood|seismic': 0.8,
  'seismic|flood': 0.8,
};

function surpriseOf(a: Domain, b: Domain): number {
  const k1 = `${a}|${b}`;
  const k2 = `${b}|${a}`;
  return SURPRISE[k1] ?? SURPRISE[k2] ?? 0.6;
}

function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (d.getTime() <= last.getTime()) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Daily series with forward-fill up to 3 days; gaps are NaN. */
function resampleDaily(signal: Signal, dates: string[]): number[] {
  const map = new Map(signal.series.map((p) => [p.t, p.value]));
  const out: number[] = new Array(dates.length).fill(NaN);
  let lastVal = NaN;
  let gap = 0;
  for (let i = 0; i < dates.length; i++) {
    const v = map.get(dates[i]);
    if (v !== undefined) {
      out[i] = v;
      lastVal = v;
      gap = 0;
    } else if (!Number.isNaN(lastVal) && gap < 3) {
      out[i] = lastVal;
      gap++;
    } else {
      out[i] = NaN;
      gap++;
    }
  }
  return out;
}

function zNormalize(arr: number[]): number[] | null {
  const valid = arr.filter((v) => !Number.isNaN(v));
  if (valid.length < 20) return null;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((a, b) => a + (b - mean) ** 2, 0) / valid.length;
  const std = Math.sqrt(variance);
  if (std === 0) return null;
  return arr.map((v) => (Number.isNaN(v) ? NaN : (v - mean) / std));
}

function pearson(a: number[], b: number[], shiftB: number): { r: number; n: number } {
  // shiftB > 0 means B is delayed (A leads B): compare a[i] with b[i+shiftB]
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < a.length; i++) {
    const j = i + shiftB;
    if (j < 0 || j >= b.length) continue;
    const x = a[i];
    const y = b[j];
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    xs.push(x);
    ys.push(y);
  }
  const n = xs.length;
  if (n < 3) return { r: 0, n };
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx;
    const vy = ys[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  if (dx === 0 || dy === 0) return { r: 0, n };
  return { r: num / Math.sqrt(dx * dy), n };
}

type PairScan = {
  fromSignalId: string;
  toSignalId: string;
  domainA: Domain;
  domainB: Domain;
  bestLag: number;
  bestCorr: number;
  bestN: number;
  zeroLagCorr: number;
};

function dedupePairs(candidates: CandidateLink[]): CandidateLink[] {
  const byPair = new Map<string, CandidateLink>();
  for (const link of candidates) {
    const key = [link.fromSignalId, link.toSignalId].sort().join('||');
    const existing = byPair.get(key);
    if (!existing) {
      byPair.set(key, link);
      continue;
    }
    const preferNew =
      (link.bestLagDays > 0 && existing.bestLagDays <= 0) ||
      (link.bestLagDays > 0 === existing.bestLagDays > 0 && link.score > existing.score) ||
      (link.bestLagDays === 0 && existing.bestLagDays < 0);
    if (preferNew) byPair.set(key, link);
  }
  return Array.from(byPair.values());
}

function toCandidate(scan: PairScan): CandidateLink {
  const surprise = surpriseOf(scan.domainA, scan.domainB);
  const strength = Math.abs(scan.bestCorr);
  const directionality = Math.min(Math.abs(scan.bestLag), 14) / 14;
  const score = strength * (0.5 + 0.3 * surprise + 0.2 * directionality);
  return {
    fromSignalId: scan.fromSignalId,
    toSignalId: scan.toSignalId,
    correlation: scan.bestCorr,
    bestLagDays: scan.bestLag,
    sampleSize: scan.bestN,
    surprise,
    score,
  };
}

export function discover(signals: Signal[], region: Region, window: TimeWindow): DiscoveryResult {
  try {
    if (!signals?.length) {
      return { region, window, signals: signals ?? [], links: [] };
    }

    const dates = dateRange(window.start, window.end);
    const prepared: { signal: Signal; z: number[] }[] = [];
    for (const s of signals) {
      const daily = resampleDaily(s, dates);
      const z = zNormalize(daily);
      if (z) prepared.push({ signal: s, z });
    }

    const scans: PairScan[] = [];

    for (let i = 0; i < prepared.length; i++) {
      for (let j = 0; j < prepared.length; j++) {
        if (i === j) continue;
        const A = prepared[i];
        const B = prepared[j];
        if (A.signal.domain === B.signal.domain) continue;

        let bestLag = 0;
        let bestCorr = 0;
        let bestN = 0;
        let zeroLagCorr = 0;

        for (let lag = -14; lag <= 14; lag++) {
          // Convention: bestLagDays > 0 means `from` (A) leads `to` (B)
          const { r, n } = pearson(A.z, B.z, lag);
          if (lag === 0) zeroLagCorr = r;
          if (n >= 20 && Math.abs(r) > Math.abs(bestCorr)) {
            bestCorr = r;
            bestLag = lag;
            bestN = n;
          }
        }

        if (bestN < 20) continue;

        scans.push({
          fromSignalId: A.signal.id,
          toSignalId: B.signal.id,
          domainA: A.signal.domain,
          domainB: B.signal.domain,
          bestLag,
          bestCorr,
          bestN,
          zeroLagCorr,
        });
      }
    }

    // Strict pass (BRAIN-SPEC thresholds)
    const strict = scans.filter((s) => {
      if (Math.abs(s.bestCorr) < 0.5) return false;
      return (
        Math.abs(s.bestCorr) >= 0.65 || Math.abs(s.bestCorr) > Math.abs(s.zeroLagCorr) + 0.05
      );
    });

    let links = dedupePairs(strict.map(toCandidate))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    // Relaxed fallback when strict finds nothing — always give Granite candidates
    if (links.length === 0) {
      const relaxed = scans
        .filter((s) => s.bestN >= 20 && Math.abs(s.bestCorr) >= 0.35)
        .map(toCandidate);
      links = dedupePairs(relaxed)
        .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
        .slice(0, 5);
      if (links.length) {
        console.info('[HELM] discovery used relaxed link fallback', links.length);
      }
    }

    return { region, window, signals, links };
  } catch {
    return { region, window, signals: signals ?? [], links: [] };
  }
}
