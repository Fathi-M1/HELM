import React, { useState } from 'react';
import { Search, X, Sparkles, ArrowRight } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const quickItems = [
    { label: 'Odessa Maritime Corridor Shock', category: 'Case Study', tag: 'Verified Causality' },
    { label: 'Thermal Bloom Anomaly in Sector 7-G', category: 'Satellite Anomaly', tag: '+45°C Delta' },
    { label: 'Copernicus Sentinel-2 MSI Multi-Spectral', category: 'Telemetry Feed', tag: 'Streaming' },
    { label: 'Panama Canal Draft Restrictions', category: 'Logistics Cascade', tag: 'Monitored' },
    { label: 'Global Grain Futures Volatility', category: 'Market Index', tag: 'T-14 Lag' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSelectQuery(query.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#03080a]/85 backdrop-blur-md flex items-start justify-center pt-20 p-4 select-none animate-fade-in">
      <div className="bg-[#050d10] border border-[#1e313a] focus-within:border-[#60d8d8]/60 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Search className="w-4 h-4 text-[#60d8d8] absolute left-4" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anomalies, feeds, evidence, or hypotheses..."
            className="w-full pl-11 pr-10 py-3.5 bg-[#0a171c] text-[#dee4e3] placeholder-[#6b8584] border border-[#1e313a] focus:border-[#60d8d8] rounded-2xl outline-none text-xs sm:text-sm font-mono-data"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 text-[#6b8584] hover:text-[#dee4e3] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Targets List */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono-data text-[#6b8584] uppercase tracking-wider block">
            RECOMMENDED INTELLIGENCE TARGETS
          </span>
          <div className="space-y-1.5">
            {quickItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectQuery(item.label);
                  onClose();
                }}
                className="w-full p-3 rounded-xl bg-[#0a171c] hover:bg-[#0f1d22] border border-[#1e313a]/60 hover:border-[#60d8d8]/40 text-left flex items-center justify-between transition-colors group"
              >
                <div>
                  <h4 className="text-xs font-semibold text-[#dee4e3] group-hover:text-[#60d8d8]">
                    {item.label}
                  </h4>
                  <span className="text-[10px] font-mono-data text-[#6b8584]">
                    {item.category}
                  </span>
                </div>
                <span className="text-[10px] font-mono-data px-2 py-0.5 bg-[#050d10] text-[#fcba62] border border-[#1e313a] rounded">
                  {item.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
