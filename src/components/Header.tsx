import React, { useState, useEffect } from 'react';
import { TabType, SystemNotification } from '../types';
import { Search, Bell, Radio, Globe, Terminal, ChevronRight } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  notifications: SystemNotification[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenSearch,
  onOpenNotifications,
  notifications,
}) => {
  const [timeUtc, setTimeUtc] = useState<string>('');
  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toISOString().slice(11, 19) + 'Z');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabContexts: Record<TabType, { section: string; title: string; coordinates?: string }> = {
    discover: { 
      section: 'PLANETARY OBSERVATION', 
      title: 'Portal',
      coordinates: 'GLOBAL APERTURE [0.0000° N, 0.0000° E]'
    },
    investigations: { 
      section: 'ORBITAL MISSION CONSOLE', 
      title: 'Causal Dive / Active Pass',
      coordinates: 'MULTI-SATELLITE DOWNLINK'
    },
    evidence: { 
      section: 'EVIDENCE DOSSIER', 
      title: 'Case 09: Odessa Supply Shock',
      coordinates: 'ODESSA MARITIME TERMINAL [46.4825° N, 30.7233° E]'
    },
    'data-sources': { 
      section: 'TELEMETRY CONSTELLATION', 
      title: 'Signal Feeds Registry',
      coordinates: 'ORBITAL MULTI-SPECTRAL ARRAY'
    },
    settings: { 
      section: 'SYSTEM CALIBRATION', 
      title: 'Node-04 Diagnostics',
      coordinates: 'EU-CENTRAL-01 COMPUTE POD'
    },
  };

  const current = tabContexts[activeTab] || tabContexts.discover;

  return (
    <header className="sticky top-0 z-40 h-14 bg-[#071317]/85 backdrop-blur-xl border-b border-[#1e313a]/50 px-6 sm:px-8 flex items-center justify-between ml-0 md:ml-[72px] transition-all">
      {/* Left: Scientific Breadcrumbs & Telemetry Coordinates */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#60d8d8] shrink-0" />
          <span className="text-[10px] font-mono-data uppercase tracking-widest text-[#6b8584] font-semibold hidden sm:inline-block">
            {current.section}
          </span>
          <ChevronRight className="w-3 h-3 text-[#1e313a] hidden sm:inline-block shrink-0" />
          <span className="text-xs font-mono-data font-semibold text-[#dee4e3] truncate">
            {current.title}
          </span>
        </div>

        {current.coordinates && (
          <span className="hidden xl:inline-block text-[10px] font-mono-data text-[#9ab3b2] bg-[#0a171c] px-2 py-0.5 rounded border border-[#1e313a]/60">
            {current.coordinates}
          </span>
        )}
      </div>

      {/* Center: Query Aperture Shortcut Button */}
      <div className="flex-1 max-w-sm mx-4 hidden lg:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 bg-[#0a171c]/90 hover:bg-[#0f1d22] border border-[#1e313a]/70 hover:border-[#60d8d8]/50 rounded-xl text-xs text-[#9ab3b2] hover:text-[#dee4e3] transition-all group shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#60d8d8] group-hover:scale-110 transition-transform" />
            <span className="font-mono-data text-[11px] truncate">
              Search signals, vessels, or anomalies...
            </span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono-data bg-[#16262d] border border-[#1e313a] rounded text-[#6b8584]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Instrument Status Bar */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="lg:hidden p-2 text-[#9ab3b2] hover:text-[#dee4e3] rounded-lg border border-transparent hover:border-[#1e313a]"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Live Ingestion Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#0a171c] border border-[#1e313a]/70 rounded-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#60d8d8] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#60d8d8]"></span>
          </span>
          <span className="text-[10px] font-mono-data text-[#60d8d8] font-medium">
            4.2 TB/s
          </span>
        </div>

        {/* Anomaly Alerts Notification Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-[#9ab3b2] hover:text-[#dee4e3] hover:bg-[#0f1d22] rounded-xl transition-colors border border-[#1e313a]/40 hover:border-[#1e313a]"
          title="System Alerts & Anomalies"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#fcba62] rounded-full shadow-[0_0_6px_#fcba62] animate-pulse" />
          )}
        </button>

        {/* Live UTC Atomic Time */}
        <div className="text-right pl-1 hidden sm:block">
          <span className="text-[11px] font-mono-data text-[#dee4e3] font-semibold tracking-wider">
            {timeUtc || '00:00:00Z'}
          </span>
        </div>
      </div>
    </header>
  );
};
