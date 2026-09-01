export type TabType = 'discover' | 'investigations' | 'evidence' | 'data-sources' | 'settings';

export type EvidenceSubView = 'key-insight' | 'evidence-explorer';

export interface DataSource {
  id: string;
  name: string;
  code: string;
  category: 'satellite' | 'logistics' | 'economics' | 'atmospheric';
  categoryLabel: string;
  description: string;
  coverage: string;
  frequency: string;
  status: 'ingesting' | 'synced' | 'degraded';
  statusText: string;
  imageUrl: string;
  icon: string;
  latencyMs: number;
  throughputRate: string;
  lastUpdate: string;
}

export interface SignalNode {
  id: string;
  code: string;
  title: string;
  category: string;
  type: 'primary-catalyst' | 'secondary-shift' | 'observed-impact' | 'environmental' | 'agronomic';
  dateStr: string;
  metricLabel: string;
  metricValue: string;
  icon: string;
  description: string;
  chartData?: number[];
}

export interface CounterHypothesis {
  id: string;
  title: string;
  summary: string;
  author?: string;
  status: 'verified' | 'refuted' | 'under-review';
  confidenceImpact: string;
}

export interface InvestigationInquiry {
  id: string;
  title: string;
  query: string;
  summary: string;
  confidence: number;
  sources: {
    name: string;
    icon: string;
    status: string;
    updated: string;
  }[];
  crucialDiscovery: {
    title: string;
    narrative: string;
    correlationFactor: string;
    correlationScore: number;
    trendData: { x: number; y: number }[];
  };
  networkNodes: {
    id: string;
    label: string;
    x: number;
    y: number;
    type: 'primary' | 'anomaly' | 'data' | 'central';
    status?: string;
  }[];
  connections: {
    from: string;
    to: string;
    active?: boolean;
    illuminated?: boolean;
  }[];
}

export interface SystemNotification {
  id: string;
  timestamp: string;
  type: 'anomaly' | 'system' | 'insight';
  title: string;
  description: string;
  nodeId: string;
  unread: boolean;
}
