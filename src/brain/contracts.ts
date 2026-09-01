// ============ Geography ============
export type Domain =
  | 'precipitation' | 'temperature' | 'soil_moisture' | 'air_quality'
  | 'fire' | 'flood' | 'seismic' | 'ocean' | 'vegetation' | 'event';

export interface GeoPoint { lat: number; lon: number; }

export interface Region {
  name: string;
  center: GeoPoint;
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

export interface TimeWindow { start: string; end: string; } // ISO dates

// ============ Signals (ingestion output) ============
export interface SignalPoint { t: string; value: number; } // t = ISO date

export interface Signal {
  id: string;            // stable: `${sourceId}:${domain}`
  sourceId: string;      // matches DataSourceMeta.id
  domain: Domain;
  label: string;         // human label, e.g. "Rainfall (Metro Manila)"
  unit: string;          // e.g. "mm/day"
  region: Region;
  series: SignalPoint[]; // time-ordered ascending
  anomaly?: number;      // z-score of recent window vs baseline (optional)
}

export interface DataSourceMeta {
  id: string;            // e.g. "open-meteo-precip"
  name: string;          // e.g. "Open-Meteo Precipitation"
  satellite: string;     // e.g. "GPM/IMERG (derived)"
  domain: Domain;
  unit: string;
  endpoint: string;      // base URL used
  cadence: string;       // e.g. "hourly", "daily"
  attribution: string;
}

// ============ Discovery engine output ============
export interface CandidateLink {
  fromSignalId: string;
  toSignalId: string;
  correlation: number;   // -1..1 (at bestLagDays)
  bestLagDays: number;   // >0 means `from` leads `to`
  sampleSize: number;    // overlapping points used
  surprise: number;      // 0..1, higher = more cross-domain/novel
  score: number;         // ranking score (see BRAIN-SPEC.md)
}

export interface DiscoveryResult {
  region: Region;
  window: TimeWindow;
  signals: Signal[];
  links: CandidateLink[]; // sorted desc by score
}

// ============ Final analysis (LLM output) ============
export type NodeRole = 'cause' | 'mechanism' | 'amplifier' | 'effect';

export interface AnalysisNode {
  id: string;            // short slug, e.g. "monsoon"
  label: string;         // "SW Monsoon Surge"
  domain: Domain;
  source: string;        // satellite/source name shown to user
  metric: string;        // "+180% vs normal"
  role: NodeRole;
  signalId?: string;     // back-reference to a Signal.id when applicable
  geo?: GeoPoint;        // where this node sits on Earth (for the globe)
}

export interface AnalysisEdge {
  from: string;          // AnalysisNode.id
  to: string;            // AnalysisNode.id
  lag: string;           // "T+2 days"
  correlation: number;   // carried from the CandidateLink
  confidence: number;    // 0..1, LLM-assigned
  rationale: string;     // plain-language why this link is causal
}

export interface BlindSpot { title: string; explanation: string; }

export interface Analysis {
  question: string;
  region: Region;
  summary: string;       // 2-3 plain sentences a non-expert understands
  confidence: number;    // overall 0..1
  nodes: AnalysisNode[];
  edges: AnalysisEdge[];
  effects: string[];     // what is happening on Earth, concrete
  actions: string[];     // concrete recommended actions
  blindSpot?: BlindSpot; // the headline surprising connection
  dataProvenance: { sourceId: string; satellite: string }[];
  /** Observability: how this Analysis was produced (additive; UI may ignore). */
  meta?: { source: 'live' | 'fixture'; fallbackReason?: string };
}
