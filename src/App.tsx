import React, { useState } from 'react';
import { TabType, SystemNotification } from './types';
import { Analysis } from './brain/contracts';
import { analyzeQuestion } from './brain';
import { NOTIFICATIONS } from './data/mockData';
import { ShaderBackground } from './components/ShaderBackground';
import { NavigationRail } from './components/NavigationRail';
import { Header } from './components/Header';
import { DiscoverView } from './components/DiscoverView';
import { InvestigationsView } from './components/InvestigationsView';
import { EvidenceView } from './components/EvidenceView';
import { DataSourcesView } from './components/DataSourcesView';
import { SettingsView } from './components/SettingsView';
import { SearchModal } from './components/SearchModal';
import { NotificationsModal } from './components/NotificationsModal';

type AnalysisStatus = 'idle' | 'loading' | 'ready';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [activeInquiryQuery, setActiveInquiryQuery] = useState<string>('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>(NOTIFICATIONS);

  const runAnalysis = async (query: string) => {
    setActiveInquiryQuery(query);
    setStatus('loading');
    setActiveTab('investigations');
    try {
      const result = await analyzeQuestion(query);
      setAnalysis(result);
      setStatus('ready');
    } catch {
      setStatus('idle');
    }
  };

  const handleStartInvestigation = (query?: string) => {
    if (query?.trim()) {
      void runAnalysis(query.trim());
      return;
    }
    setActiveTab('investigations');
  };

  const handleNavigateToEvidence = () => {
    setActiveTab('evidence');
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleSelectNotification = (notif: SystemNotification) => {
    if (notif.type === 'insight') {
      setActiveTab('evidence');
    } else {
      setActiveTab('investigations');
    }
  };

  const handleSelectSearchQuery = (query: string) => {
    if (query.toLowerCase().includes('odessa') || query.toLowerCase().includes('corridor')) {
      setActiveTab('evidence');
    } else if (query.toLowerCase().includes('sentinel') || query.toLowerCase().includes('feed')) {
      setActiveTab('data-sources');
    } else {
      void runAnalysis(query);
    }
  };

  return (
    <div className="min-h-screen bg-[#071317] text-[#dee4e3] flex relative overflow-x-hidden font-sans">
      <ShaderBackground />

      <NavigationRail activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      <div className="flex-1 flex flex-col min-w-0 z-10">
        <Header
          activeTab={activeTab}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          notifications={notifications}
        />

        <main className="flex-1 ml-0 md:ml-[72px] pb-16 md:pb-0">
          {activeTab === 'discover' && (
            <DiscoverView onStartInvestigation={handleStartInvestigation} />
          )}

          {activeTab === 'investigations' && (
            <InvestigationsView
              currentQuery={activeInquiryQuery}
              analysis={analysis}
              status={status}
              onNavigateToEvidence={handleNavigateToEvidence}
            />
          )}

          {activeTab === 'evidence' && (
            <EvidenceView
              analysis={analysis}
              status={status}
              onBackToGraph={() => setActiveTab('investigations')}
            />
          )}

          {activeTab === 'data-sources' && (
            <DataSourcesView analysis={analysis} status={status} />
          )}

          {activeTab === 'settings' && <SettingsView analysis={analysis} />}
        </main>
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectQuery={handleSelectSearchQuery}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onSelectNotification={handleSelectNotification}
      />
    </div>
  );
}
