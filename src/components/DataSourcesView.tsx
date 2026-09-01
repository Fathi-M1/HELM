import React, { useMemo, useState } from 'react';
import { Analysis, AnalysisNode } from '../brain/contracts';
import {
  Activity,
  Database,
  Layers,
  Radio,
  Search,
  X,
} from 'lucide-react';

type AnalysisStatus = 'idle' | 'loading' | 'ready';

interface DataSourcesViewProps {
  analysis: Analysis | null;
  status: AnalysisStatus;
}

type MissionCategory =
  | 'precipitation'
  | 'aerosol'
  | 'soil'
  | 'temperature'
  | 'events'
  | 'basemap';

interface MissionDef {
  id: string;
  name: string;
  code: string;
  category: MissionCategory;
  categoryLabel: string;
  /** What this mission provides */
  provides: string;
  description: string;
  /** Honest labeling when the feed is derived / reanalysis */
  honestyLabel: string;
  /** Match provenance satellite strings and node.source values */
  match: (text: string) => boolean;
}

interface SignalMission {
  id: string;
  name: string;
  code: string;
  category: MissionCategory;
  categoryLabel: string;
  provides: string;
  description: string;
  honestyLabel: string;
  /** Raw satellite strings from this analysis that mapped here */
  rawLabels: string[];
  /** Nodes that cite this mission */
  usedBy: { label: string; domain: string; metric: string; source: string }[];
  alwaysOn?: boolean;
}

const MISSION_DEFS: MissionDef[] = [
  {
    id: 'gpm-imerg',
    name: 'GPM/IMERG',
    code: 'GPM-IMERG',
    category: 'precipitation',
    categoryLabel: 'Precipitation',
    provides: 'Rainfall / precipitation',
    description:
      'Global Precipitation Measurement Integrated Multi-satellitE Retrievals. Used for rainfall intensity and anomaly against recent baselines.',
    honestyLabel: '(derived)',
    match: (t) => /gpm|imerg|precip/i.test(t),
  },
  {
    id: 's5p-cams',
    name: 'Sentinel-5P TROPOMI / CAMS',
    code: 'S5P-CAMS',
    category: 'aerosol',
    categoryLabel: 'Aerosols / AQ',
    provides: 'Aerosols, PM2.5, AOD',
    description:
      'Sentinel-5P TROPOMI and Copernicus Atmosphere Monitoring Service products for aerosol optical depth and particulate matter.',
    honestyLabel: '(derived)',
    match: (t) => /sentinel-5|tropomi|cams|aerosol|pm2\.?5|aod|air.?quality/i.test(t),
  },
  {
    id: 'smap-s1',
    name: 'SMAP / Sentinel-1',
    code: 'SMAP-S1',
    category: 'soil',
    categoryLabel: 'Soil moisture',
    provides: 'Near-surface soil moisture',
    description:
      'SMAP soil moisture and Sentinel-1 SAR-informed moisture proxies used for saturation and runoff readiness.',
    honestyLabel: '(derived)',
    match: (t) => /smap|sentinel-1|soil/i.test(t),
  },
  {
    id: 'era5',
    name: 'ERA5',
    code: 'ERA5',
    category: 'temperature',
    categoryLabel: 'Temperature',
    provides: 'Temperature (reanalysis)',
    description:
      'ECMWF ERA5 reanalysis with satellite-assimilated fields for surface temperature and heat context.',
    honestyLabel: '(satellite-assimilated)',
    match: (t) =>
      !/soil/i.test(t) &&
      (/era5/i.test(t) ||
        /(?:^|[\s/(])(?:ecmwf|gfs)(?:[\s/)]|$)/i.test(t) ||
        /^temperature$/i.test(t)),
  },
  {
    id: 'eonet',
    name: 'NASA EONET',
    code: 'EONET',
    category: 'events',
    categoryLabel: 'Natural events',
    provides: 'Natural-event feed',
    description:
      'NASA Earth Observatory Natural Event Tracker — wildfires, storms, floods, and other curated event reports.',
    honestyLabel: '',
    match: (t) => /eonet|natural.?event/i.test(t),
  },
  {
    id: 'esri-basemap',
    name: 'Esri World Imagery',
    code: 'ESRI-WI',
    category: 'basemap',
    categoryLabel: 'Basemap',
    provides: 'Optical basemap',
    description:
      'Esri World Imagery mosaic (Maxar / Sentinel-2 / Landsat). Always-on globe basemap for spatial context — not a causal signal.',
    honestyLabel: '(Maxar / Sentinel-2 / Landsat)',
    match: (t) => /esri|world.?imagery|maxar|sentinel-2|landsat|basemap/i.test(t),
  },
];

const CATEGORY_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All feeds' },
  { id: 'precipitation', label: 'Precipitation' },
  { id: 'aerosol', label: 'Aerosols' },
  { id: 'soil', label: 'Soil' },
  { id: 'temperature', label: 'Temperature' },
  { id: 'events', label: 'Events' },
  { id: 'basemap', label: 'Basemap' },
];

const IDLE_COPY =
  'No active investigation — ask a question on Portal first.';

function collectRawLabels(analysis: Analysis): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of analysis.dataProvenance) {
    const label = p.satellite.trim() || p.sourceId;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  for (const n of analysis.nodes) {
    const label = n.source.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function nodesForMission(
  nodes: AnalysisNode[],
  def: MissionDef,
): SignalMission['usedBy'] {
  return nodes
    .filter((n) => def.match(n.source) || def.match(n.domain))
    .map((n) => ({
      label: n.label,
      domain: n.domain,
      metric: n.metric,
      source: n.source,
    }));
}

function buildMissions(analysis: Analysis): SignalMission[] {
  const rawLabels = collectRawLabels(analysis);
  const missions: SignalMission[] = [];
  const esri = MISSION_DEFS.find((d) => d.id === 'esri-basemap')!;

  for (const def of MISSION_DEFS) {
    if (def.id === 'esri-basemap') continue;

    const hits = rawLabels.filter((label) => def.match(label));
    const usedBy = nodesForMission(analysis.nodes, def);
    if (hits.length === 0 && usedBy.length === 0) continue;

    missions.push({
      id: def.id,
      name: def.name,
      code: def.code,
      category: def.category,
      categoryLabel: def.categoryLabel,
      provides: def.provides,
      description: def.description,
      honestyLabel: def.honestyLabel,
      rawLabels: hits.length ? hits : usedBy.map((u) => u.source),
      usedBy,
    });
  }

  // Unmatched provenance/node sources (not covered by catalog or Esri optical)
  for (const label of rawLabels) {
    if (MISSION_DEFS.some((d) => d.match(label))) continue;
    const id = `raw-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    missions.push({
      id,
      name: label.replace(/\s*\(derived\)\s*/gi, '').trim() || label,
      code: 'CUSTOM',
      category: 'events',
      categoryLabel: 'Other',
      provides: 'Analysis-cited source',
      description: `Cited in the current analysis as "${label}".`,
      honestyLabel: /\(derived\)/i.test(label)
        ? '(derived)'
        : /\(satellite-assimilated\)/i.test(label)
          ? '(satellite-assimilated)'
          : '',
      rawLabels: [label],
      usedBy: analysis.nodes
        .filter((n) => n.source.toLowerCase() === label.toLowerCase())
        .map((n) => ({
          label: n.label,
          domain: n.domain,
          metric: n.metric,
          source: n.source,
        })),
    });
  }

  const esriHits = rawLabels.filter((label) => esri.match(label));
  missions.push({
    id: esri.id,
    name: esri.name,
    code: esri.code,
    category: esri.category,
    categoryLabel: esri.categoryLabel,
    provides: esri.provides,
    description: esri.description,
    honestyLabel: esri.honestyLabel,
    rawLabels: esriHits.length ? ['Esri World Imagery', ...esriHits] : ['Esri World Imagery'],
    usedBy: nodesForMission(analysis.nodes, esri),
    alwaysOn: true,
  });

  return missions;
}

export const DataSourcesView: React.FC<DataSourcesViewProps> = ({
  analysis,
  status,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<SignalMission | null>(null);

  const missions = useMemo(
    () => (analysis ? buildMissions(analysis) : []),
    [analysis],
  );

  const presentCategories = useMemo(() => {
    const ids = new Set(missions.map((m) => m.category));
    return CATEGORY_FILTERS.filter(
      (c) => c.id === 'all' || ids.has(c.id as MissionCategory),
    );
  }, [missions]);

  const filtered = missions.filter((src) => {
    const matchesCategory =
      activeCategory === 'all' || src.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      src.name.toLowerCase().includes(q) ||
      src.code.toLowerCase().includes(q) ||
      src.description.toLowerCase().includes(q) ||
      src.provides.toLowerCase().includes(q) ||
      src.rawLabels.some((r) => r.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  if (status === 'loading') {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-[#60d8d8]/40 border-t-[#60d8d8] animate-spin" />
          <p className="text-sm font-mono-data text-[#60d8d8] tracking-wider uppercase">
            Resolving signal feeds…
          </p>
        </div>
      </div>
    );
  }

  if (!analysis || status === 'idle') {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-md">
          <Database className="w-8 h-8 mx-auto text-[#6b8584]" />
          <p className="text-sm font-mono-data text-[#9ab3b2] tracking-wider uppercase">
            Signal Library
          </p>
          <p className="text-xs text-[#6b8584]">{IDLE_COPY}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] p-6 sm:p-10 max-w-7xl mx-auto z-10 space-y-8 select-none animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e313a]/50 pb-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-light text-[#dee4e3] tracking-tight">
            Signal Library
          </h1>
          <p className="text-xs sm:text-sm text-[#9ab3b2] mt-1 font-light max-w-2xl">
            Missions feeding the current investigation for {analysis.region.name}.
          </p>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-[#050d10] border border-[#1e313a] rounded-xl shadow-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#60d8d8] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#60d8d8]" />
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-mono-data font-bold text-[#60d8d8]">
              {missions.length} FEEDS
            </span>
            <span className="text-[9px] font-mono-data text-[#6b8584] truncate max-w-[14rem]">
              {analysis.question}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {presentCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono-data transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#02a0a0] text-[#003737] shadow-md shadow-[#02a0a0]/30'
                  : 'bg-[#0a171c] text-[#9ab3b2] hover:text-[#dee4e3] hover:bg-[#0f1d22]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-[#6b8584] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter signal feeds…"
            className="w-full pl-9 pr-3.5 py-1.5 bg-[#050d10] text-xs text-[#dee4e3] border border-[#1e313a] focus:border-[#60d8d8] rounded-xl outline-none font-mono-data"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((source) => (
          <div
            key={source.id}
            onClick={() => setSelected(source)}
            className="group bg-[#050d10]/90 backdrop-blur-xl border border-[#1e313a] hover:border-[#60d8d8]/60 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-1 shadow-xl flex flex-col"
          >
            <div className="h-28 w-full relative overflow-hidden bg-gradient-to-br from-[#0a171c] via-[#071317] to-[#03080a] flex items-center justify-center">
              <Radio className="w-10 h-10 text-[#60d8d8]/40 group-hover:text-[#60d8d8]/70 transition-colors" />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-0.5 text-[9px] font-mono-data bg-[#03080a]/90 text-[#fcba62] border border-[#1e313a] rounded-md font-semibold">
                  {source.categoryLabel}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-mono-data bg-[#03080a]/90 text-[#60d8d8] border border-[#1e313a] rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60d8d8]" />
                  <span>{source.alwaysOn ? 'Basemap' : 'In analysis'}</span>
                </span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-base font-semibold text-[#dee4e3] group-hover:text-[#60d8d8] transition-colors">
                    {source.name}
                    {source.honestyLabel ? (
                      <span className="ml-1.5 text-[10px] font-mono-data font-normal text-[#6b8584]">
                        {source.honestyLabel}
                      </span>
                    ) : null}
                  </h3>
                  <span className="text-[10px] font-mono-data text-[#6b8584] shrink-0">
                    {source.code}
                  </span>
                </div>
                <p className="text-xs text-[#9ab3b2] line-clamp-2 leading-relaxed font-light mt-1">
                  {source.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#1e313a]/50 text-[10px] font-mono-data">
                <div className="bg-[#0a171c] p-2 rounded-lg border border-[#1e313a]">
                  <span className="text-[#6b8584] block uppercase text-[8px]">Provides</span>
                  <span className="text-[#60d8d8] font-bold">{source.provides}</span>
                </div>
                <div className="bg-[#0a171c] p-2 rounded-lg border border-[#1e313a]">
                  <span className="text-[#6b8584] block uppercase text-[8px]">Nodes</span>
                  <span className="text-[#dee4e3]">
                    {source.alwaysOn ? 'Basemap' : `${source.usedBy.length} cited`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-[#03080a]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#050d10] border border-[#60d8d8]/50 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-5 right-5 text-[#9ab3b2] hover:text-[#dee4e3] p-2 hover:bg-[#0f1d22] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pr-10">
              <div className="w-12 h-12 rounded-2xl bg-[#0a171c] border border-[#1e313a] flex items-center justify-center text-[#60d8d8]">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#dee4e3]">
                  {selected.name}{' '}
                  {selected.honestyLabel ? (
                    <span className="text-sm font-mono-data font-normal text-[#6b8584]">
                      {selected.honestyLabel}
                    </span>
                  ) : null}
                </h2>
                <span className="text-xs font-mono-data text-[#fcba62]">
                  {selected.code} · {selected.categoryLabel}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#9ab3b2] leading-relaxed font-light">
              {selected.description}
            </p>

            <div className="grid grid-cols-2 gap-3 font-mono-data text-xs">
              <div className="p-3 bg-[#0a171c] rounded-xl border border-[#1e313a]">
                <span className="text-[#6b8584] text-[9px] block">PROVIDES</span>
                <span className="text-sm font-bold text-[#60d8d8]">{selected.provides}</span>
              </div>
              <div className="p-3 bg-[#0a171c] rounded-xl border border-[#1e313a]">
                <span className="text-[#6b8584] text-[9px] block">LABELING</span>
                <span className="text-sm font-bold text-[#fcba62]">
                  {selected.honestyLabel || 'direct feed'}
                </span>
              </div>
            </div>

            {selected.rawLabels.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono-data text-[#6b8584] uppercase tracking-wider block">
                  As cited in analysis
                </span>
                <div className="flex flex-wrap gap-2">
                  {selected.rawLabels.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 text-[10px] font-mono-data bg-[#0a171c] border border-[#1e313a] rounded-lg text-[#9ab3b2]"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] font-mono-data text-[#6b8584] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                Where used in this answer
              </span>
              {selected.usedBy.length === 0 ? (
                <p className="text-xs text-[#6b8584] font-light">
                  {selected.alwaysOn
                    ? 'Globe basemap only — not a causal node.'
                    : 'Present in provenance; no node currently cites this mission by name.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {selected.usedBy.map((u, i) => (
                    <li
                      key={`${u.label}-${i}`}
                      className="p-3 bg-[#03080a] border border-[#1e313a] rounded-xl text-xs space-y-1"
                    >
                      <div className="font-semibold text-[#dee4e3]">{u.label}</div>
                      <div className="font-mono-data text-[10px] text-[#6b8584]">
                        {u.domain} · {u.metric}
                      </div>
                      <div className="font-mono-data text-[10px] text-[#60d8d8]">
                        {u.source}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1e313a]">
              <button
                onClick={() => setSelected(null)}
                className="py-2.5 px-5 bg-[#02a0a0] hover:bg-[#60d8d8] text-[#003737] rounded-xl text-xs font-bold font-mono-data"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
