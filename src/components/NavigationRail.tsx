import React, { useState } from 'react';
import { TabType } from '../types';
import { HELM_LOGO_URL } from '../data/mockData';
import { 
  Compass, 
  Activity, 
  FileText, 
  Database, 
  Sliders, 
  Terminal,
  Radio,
  Cpu
} from 'lucide-react';

interface NavigationRailProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({ activeTab, onSelectTab }) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const navItems: { id: TabType; label: string; sub: string; icon: React.ReactNode; badge?: string }[] = [
    { 
      id: 'discover', 
      label: 'Portal', 
      sub: 'Planetary Observation', 
      icon: <Compass className="w-5 h-5" /> 
    },
    { 
      id: 'investigations', 
      label: 'Instrument', 
      sub: 'Spatial Causality Graph', 
      icon: <Activity className="w-5 h-5" />,
      badge: 'LIVE'
    },
    { 
      id: 'evidence', 
      label: 'Case File', 
      sub: 'Odessa Corridor Shock', 
      icon: <FileText className="w-5 h-5" /> 
    },
    { 
      id: 'data-sources', 
      label: 'Signal Library', 
      sub: 'Constellation Feeds', 
      icon: <Database className="w-5 h-5" /> 
    },
    { 
      id: 'settings', 
      label: 'Calibration', 
      sub: 'Node Parameters', 
      icon: <Sliders className="w-5 h-5" /> 
    }
  ];

  return (
    <>
      {/* Desktop Left Command Rail */}
      <aside className="fixed left-0 top-0 h-full w-[72px] bg-[#050d10]/95 backdrop-blur-2xl z-50 flex flex-col justify-between items-center py-5 border-r border-[#1e313a]/50 select-none shadow-2xl transition-all duration-300">
        
        {/* Top: Brand Planetary Glyph */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => onSelectTab('discover')}
            className="group relative p-2.5 rounded-2xl bg-[#0a171c] hover:bg-[#0f1d22] border border-[#1e313a]/70 hover:border-[#60d8d8]/50 transition-all duration-300 shadow-inner flex items-center justify-center"
            title="HELM Planetary Intelligence"
          >
            {/* Pulsing focal reticle */}
            <div className="absolute inset-0 rounded-2xl border border-[#60d8d8]/20 group-hover:border-[#60d8d8]/60 transition-colors animate-pulse" />
            <img
              src={HELM_LOGO_URL}
              alt="HELM Glyph"
              className="w-7 h-7 object-contain group-hover:scale-110 transition-transform duration-300"
            />
          </button>
          <span className="text-[9px] font-mono-data uppercase tracking-[0.25em] text-[#6b8584] font-semibold">
            HELM
          </span>
        </div>

        {/* Center: Mode Switching Rail */}
        <nav className="flex flex-col items-center gap-3 w-full px-2.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div 
                key={item.id} 
                className="relative w-full flex justify-center"
                onMouseEnter={() => setHoveredTab(item.id)}
                onMouseLeave={() => setHoveredTab(null)}
              >
                <button
                  id={`nav-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#02a0a0]/20 text-[#60d8d8] border border-[#60d8d8]/60 shadow-[0_0_20px_rgba(2,160,160,0.35)]'
                      : 'text-[#9ab3b2] hover:text-[#dee4e3] hover:bg-[#0f1d22]/80 border border-transparent hover:border-[#1e313a]'
                  }`}
                >
                  {/* Left indicator tick for active state */}
                  {isActive && (
                    <div className="absolute -left-2.5 top-1/2 transform -translate-y-1/2 w-1.5 h-6 bg-[#60d8d8] rounded-r-full shadow-[0_0_8px_#60d8d8]" />
                  )}

                  {/* Icon */}
                  <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </div>

                  {/* Live Beacon Badge */}
                  {item.badge && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#fcba62] shadow-[0_0_6px_#fcba62] animate-pulse" />
                  )}
                </button>

                {/* Floating Architectural Tooltip */}
                {hoveredTab === item.id && (
                  <div className="absolute left-16 top-1/2 transform -translate-y-1/2 ml-2 px-3 py-1.5 bg-[#0a171c]/95 backdrop-blur-xl border border-[#1e313a] rounded-lg shadow-2xl whitespace-nowrap z-50 pointer-events-none animate-fade-in flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#dee4e3] font-mono-data tracking-wide">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="px-1.5 py-0.2 text-[8px] font-mono-data bg-[#fcba62]/20 text-[#fcba62] border border-[#fcba62]/30 rounded">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#6b8584] font-mono-data">
                      {item.sub}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom: Node Telemetry Ticker & Diagnostics */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Signal Pulse Beacon */}
          <div 
            className="flex flex-col items-center p-2 rounded-xl bg-[#0a171c]/60 border border-[#1e313a]/40 text-center w-full cursor-pointer hover:border-[#60d8d8]/30 transition-colors"
            title="Compute Node 04 Operational"
            onClick={() => onSelectTab('settings')}
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#60d8d8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#60d8d8]"></span>
              </span>
            </div>
            <span className="text-[8px] font-mono-data text-[#6b8584] mt-1 tracking-wider">
              α-04
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile / Compact Responsive Bottom Rail */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#050d10]/95 backdrop-blur-xl border-t border-[#1e313a] z-50 flex items-center justify-around px-3">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                isActive
                  ? 'text-[#60d8d8] bg-[#02a0a0]/15 border border-[#60d8d8]/40'
                  : 'text-[#9ab3b2]'
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-mono-data">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
