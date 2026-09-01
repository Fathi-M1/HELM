import React, { useEffect, useState } from 'react';
import { IMAGES } from '../data/mockData';
import { 
  Search, 
  ArrowUpRight, 
  Radio, 
  Orbit, 
} from 'lucide-react';

interface DiscoverViewProps {
  onStartInvestigation: (query?: string, mode?: string) => void;
}

const PLACEHOLDER_QUESTIONS = [
  'Why is there flooding in the Philippines?',
  'Why did Black Sea grain shipments drop before regional food prices spiked?',
  'Trace drought propagation into fertilizer and maritime corridors.',
  'Detect thermal anomalies and seismic resonances along sub-permafrost pipelines.',
  'Explain crane idle rate anomalies in Eastern Mediterranean maritime ports.',
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({ onStartInvestigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (inputFocused || searchQuery.trim()) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_QUESTIONS.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [inputFocused, searchQuery]);

  const suggestions = [
    'Why did Black Sea grain shipments drop before regional food prices spiked?',
    'Trace drought propagation into fertilizer and maritime corridors.',
    'Detect thermal anomalies and seismic resonances along sub-permafrost pipelines.',
    'Explain crane idle rate anomalies in Eastern Mediterranean maritime ports.',
  ];

  const planetaryLenses = [
    {
      id: 'system',
      num: '01',
      title: 'Macro Earth System',
      lensType: 'Topological Invariant',
      description: 'Map interconnected nodes and cascading systemic shockwaves across agriculture, logistics, energy, and retail transmission.',
      image: IMAGES.globalSystem,
      query: 'Explore global agricultural and logistics network topology',
      tag: 'Macro Cascade'
    },
    {
      id: 'temporal',
      num: '02',
      title: 'Temporal Delta Scan',
      lensType: 'Multi-Temporal Differential',
      description: 'Isolate localized temporal shifts, port throughput contractions, and coastal maritime vector variances.',
      image: IMAGES.coastalErosion,
      query: 'Investigate temporal throughput collapse in maritime corridors',
      tag: 'Delta Shift'
    },
    {
      id: 'adversarial',
      num: '03',
      title: 'Adversarial Hypothesis',
      lensType: 'Falsification Protocol',
      description: 'Build rigorous evidence chains to test hypotheses against real-world multi-spectral satellite telemetry feeds.',
      image: IMAGES.hypothesisTheory,
      query: 'Test hypothesis: Weather anomaly vs Export embargo in Black Sea',
      tag: 'Falsification'
    },
    {
      id: 'autonomous',
      num: '04',
      title: 'Autonomous Synthesis',
      lensType: 'Cross-Domain Anomaly Wave',
      description: 'Let the planetary engine surface hidden correlations, multi-spectral thermal flares, and market delay multipliers.',
      image: IMAGES.discoverConnections,
      query: 'Autonomous cross-domain correlation synthesis',
      tag: 'Telemetry Wave'
    }
  ];

  const liveAnomalies = [
    { loc: 'ODESSA MARITIME TERMINAL', desc: '40% Crane Contraction', delta: '-40%', status: 'Active Investigation' },
    { loc: 'PANAMA CANAL LOCKS', desc: 'Draft Depth Restriction', delta: '-18%', status: 'Monitoring' },
    { loc: 'CERRADO BIOME SATELLITE', desc: 'NDVI Stress Band Deviation', delta: '-34%', status: 'Synthesizing' },
    { loc: 'RHINE LOGISTICS CORRIDOR', desc: 'Low-Water Freight Surcharge', delta: '+22%', status: 'Nominal Alert' }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim() || PLACEHOLDER_QUESTIONS[placeholderIndex];
    if (q) {
      onStartInvestigation(q, 'custom');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-6 sm:p-10 max-w-7xl mx-auto z-10 select-none animate-fade-in">
      
      {/* ========================================================================= */}
      {/* 1. CENTRAL QUERY INTERFACE                                                */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full pt-4 pb-8 text-center relative">
        
        {/* Subtle Animated Focal Reticle Rings behind the aperture */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] pointer-events-none -z-10 opacity-30 flex items-center justify-center">
          <div className="w-full h-full rounded-full border border-[#60d8d8]/30 animate-spin-slow" />
          <div className="absolute w-[400px] h-[400px] rounded-full border border-dashed border-[#fcba62]/20 animate-spin-reverse-slow" />
          <div className="absolute w-[280px] h-[280px] rounded-full border border-[#60d8d8]/40 animate-pulse-glow" />
        </div>

        <h1 className="text-2xl sm:text-4xl font-light tracking-tight text-[#dee4e3] mb-8 font-sans max-w-xl leading-snug">
          What&apos;s really happening on Earth.
        </h1>

        {/* Search is the focal element */}
        <form onSubmit={handleSearchSubmit} className="w-full relative group">
          <div className="relative flex items-center bg-[#0a171c]/95 border border-[#1e313a] focus-within:border-[#60d8d8] rounded-2xl shadow-[0_0_40px_rgba(3,8,10,0.8)] focus-within:shadow-[0_0_50px_rgba(2,160,160,0.25)] transition-all duration-300 backdrop-blur-2xl p-1.5 sm:p-2">
            <div className="pl-4 pr-2 text-[#60d8d8]">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 group-focus-within:scale-110 transition-transform" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={PLACEHOLDER_QUESTIONS[placeholderIndex]}
              className="w-full py-4 sm:py-5 px-2 bg-transparent text-[#dee4e3] placeholder-[#6b8584] outline-none text-sm sm:text-base font-light font-mono-data transition-[opacity] duration-500"
              aria-label="Discover inquiry"
            />

            <button
              type="submit"
              className="px-5 py-3.5 bg-[#02a0a0] hover:bg-[#60d8d8] text-[#003737] font-mono-data font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-[#02a0a0]/30 active:scale-95 shrink-0"
            >
              <span>TUNE APERTURE</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <span className="text-[10px] text-[#6b8584] font-mono-data mr-1 uppercase tracking-wider">
            EXAMPLE QUERIES:
          </span>
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSearchQuery(item);
                onStartInvestigation(item, 'suggestion');
              }}
              className="px-3 py-1 bg-[#0f1d22]/70 hover:bg-[#16262d] border border-[#1e313a]/60 hover:border-[#60d8d8]/50 text-[11px] text-[#9ab3b2] hover:text-[#dee4e3] rounded-lg transition-all font-mono-data text-left"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FOUR SCIENTIFIC EXPLORATION LENSES (SPATIAL OBSERVATION APERTURES)     */}
      {/* ========================================================================= */}
      <div className="w-full pt-4 pb-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1e313a]/40 pb-2">
          <div className="flex items-center gap-2">
            <Orbit className="w-4 h-4 text-[#fcba62]" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-[#dee4e3] font-mono-data">
              Orbital observation lenses
            </h2>
          </div>
          <span className="text-[10px] text-[#6b8584] font-mono-data">
            4 Autonomous Scientific Paradigms
          </span>
        </div>

        {/* 4 Architectural Aperture Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planetaryLenses.map((lens, idx) => (
            <div
              key={lens.id}
              onClick={() => onStartInvestigation(lens.query, lens.id)}
              className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer border border-[#1e313a]/70 hover:border-[#60d8d8]/80 transition-all duration-300 p-5 flex flex-col justify-between bg-[#0a171c]/90 backdrop-blur-md shadow-xl hover:shadow-[0_10px_30px_rgba(2,160,160,0.2)]"
            >
              {/* Background Satellite Imagery with Gradient */}
              <img
                src={lens.image}
                alt={lens.title}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071317] via-[#071317]/70 to-[#071317]/20" />
              <div className="absolute inset-0 bg-[#02a0a0]/0 group-hover:bg-[#02a0a0]/10 transition-colors duration-300" />

              {/* Top Meta Bar */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] font-mono-data font-bold text-[#60d8d8]">
                  {lens.num} // {lens.tag}
                </span>
                <div className="w-6 h-6 rounded-full bg-[#0a171c]/80 border border-[#1e313a] flex items-center justify-center text-[#dee4e3] group-hover:border-[#60d8d8] group-hover:text-[#60d8d8] transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bottom Body */}
              <div className="relative z-10 space-y-1.5">
                <span className="text-[9px] font-mono-data uppercase tracking-widest text-[#fcba62] block">
                  {lens.lensType}
                </span>
                <h3 className="text-base font-semibold text-[#dee4e3] group-hover:text-[#60d8d8] transition-colors leading-snug">
                  {lens.title}
                </h3>
                <p className="text-xs text-[#9ab3b2] line-clamp-2 leading-relaxed font-light">
                  {lens.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. REAL-TIME PLANETARY ANOMALIES TICKER                                   */}
      {/* ========================================================================= */}
      <div className="w-full pt-2">
        <div className="bg-[#0a171c]/80 backdrop-blur-md border border-[#1e313a]/60 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-mono-data text-[#fcba62] shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-bold tracking-wider uppercase">Live Telemetry Anomalies:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full text-xs font-mono-data">
            {liveAnomalies.map((anom, idx) => (
              <div 
                key={idx}
                onClick={() => onStartInvestigation(anom.loc, 'anomaly')}
                className="flex items-center justify-between p-2 rounded-lg bg-[#0f1d22]/80 hover:bg-[#16262d] border border-[#1e313a]/50 hover:border-[#60d8d8]/40 cursor-pointer transition-colors"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[10px] text-[#dee4e3] font-semibold truncate">{anom.loc}</span>
                  <span className="text-[9px] text-[#9ab3b2] truncate">{anom.desc}</span>
                </div>
                <span className={`text-[10px] font-bold shrink-0 ${anom.delta.startsWith('-') ? 'text-[#ffb692]' : 'text-[#60d8d8]'}`}>
                  {anom.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
