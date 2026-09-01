import { DataSource, SignalNode, CounterHypothesis, InvestigationInquiry, SystemNotification } from '../types';

export const HELM_LOGO_URL = '/Helm-logo.png';

export const IMAGES = {
  globalSystem: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQ8plIcKfBukUn496GV7w6y-QLNMf8qPmIu4Xaq89DVZBFl0dE2J0F51LYYsO4_8tKf2XxdZoNSWFrJ1h4onDDSYJEohZ6NLpiL2bp2DAYIJgkpK-IzrR0I2etw8MsAUtzqWN5TpeC5Ex9N9bqj0HSNNLxNv8kzFr9huyDfjNtbouUODdfg12sFoN3BHU0nbrQEPZyNCa7tRdqFsqqBeI-0em_srp2mAq27lRrrDEqL22oBeOWnm2N',
  coastalErosion: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWnB65nLRCLayqGcjK6W0Cfjm2VCGimBPJDHHZm-m_3v7UxQL72PNKf4p_6XOWAzeTDSulj1fxATGUXcEGaaeDvrD5D40G4I3bIx8-FyNlNVAYkLFDEY741hwFUp8cSvwfVll2h9mun3fpkCwug9OZ3GiZwZLFzsaMje5jSaHL617h5fp0MGHayu2H6FSbbsUzTeSYjc6XTqjUkkCktMhilX1uUyilqQxiuHkq9W0WV4shrLgROAzd',
  hypothesisTheory: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAz1ODbd79-uaWrElOnYtRLW35URyLyvkyNAoq2KhCU5_OfFmkx9P9PlpyuJYpU_QGtKvAg9eCS3dmoCTVB3ueTpdOs23G6zuhDT9Ts-YzWe-hufBST21IMGF-FhaJJd96lJArzgqlXYuTDqRkpzQkYJgLiPc4Ct1XNZAKPDR2eylpiVFoTbW6iJoahFPGVRy-4G94glL1GV6It8U3bx1SbCMk6VeSAZ4zwCCRbK_UzUkABiAK1esrH',
  discoverConnections: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtQOXW92WcpG0OJnbqJ1vzD3aQdB4XfuIXFw7gsN-4_4balOxK4IyxFjY0HTJQbhN4bKQwCmRr9qlKF8qQ0dMzdpVoV7f4Wz8D7LhZeYNnVunqmzQ_aZEzd8lCvKmi-yNtaPgSSPvAseuBWRQCeMtKo1yluHvClsDlzAHSrnYQwGa48NjcCpdU80gqXhd0kohpetQnsZwjOzMh8oZHq6AAzz6FOQNj2ZOlakYqw57ATzdTgGFegcfQ',
  odessaPortMap: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuq2h7TKEtJzskAjsafTlGCxfJWvyKYfmbMLTblgAKPmm6-1ZokcryZo8nacnzsRCZ440hQE-RJwUiK1pQmX2dY2rGT22IDMNem8ycbWvQd0ELQGX4r-tkaHSvEJ4CzPbsk2R_-DkcF1X1vNcZqCpRgRD5X_mOlAtFBoGIPXln7T4YqMXekgq57prd-y0zm7VpEv0ajLNN7nHRNQp8WDTQnGetkoOgVkENr7cBKl2CZClSBXcpU7mL',
  sentinel2: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEIlXKK9NTiSjI-_GitFT8wNtsG95pER5wI3su-v2lCLh34SS_Adzzhu8z2Fsb63cRWjNIteEiRuD35BqpaW-IKqIYm_t7MhtAe42iqnDnbvjYOqCY5xOWLOs2rxOiLJBR9YwjIZAO_N-wD_R3LJfwS6wi-cyWOMpbGOHc2FIfeUlz-iAbpN5xFwwgqruxas1-R1O71S5pYrwb3DkQP7q9G3kGrJ_ce-cQ25xLl1gxiLt2fjCkHVQd',
  globalAIS: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCM9tNZskC2hqpkot7O8yvIhz9XMcmDOi0njdneW0W7FvhHlFw3nu8KRONe_nv6EHE7xXQnD3VQJnC2qWhtCeCA37fPypW_qK19udvLGse6jLd_p5rCTgHPJg1cLIbb3Ly6kaBj_LB9H1t84lipS-SR6eLNaXUAKAMdY8kfuRzXT5WZeq7IHkpzYQRKb33LxB4DmKO5apeZRNis5_2zpoPsPbFD2Fk7m47Fe8Fooqref1TkAng7-jsn',
  macroCommodities: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjT3y-uuug1eQCNsIfyufu1Zj8lh5lznYkMfvK6j2z47jHHkVm7tTRo41qIBKB65VKJ9_RPrzMHaa6CoKEz4_GmmulTM5snMviguVJBHrgFWxYz7102acfnrDBWBNFT4LBAY3zjMpt_lDaKm44L7zFWwjzT91Pjp7_xyj08mDckvW-3e-EIYbrYQOg2X5DGmKFnfSrmYMealVZhI7ZiTFl-tGYb6Tj9JKeQUXyFohfhURwnKxwI7J0',
  tundraAnomaly: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6Web05AJWun81mpAUPgJFqGugm0MZT16OvAyNNDR8_PDfxNUCUvE0sn-xloZfQfT_CMNKYobNDSgufk-bgz7IP2B38DNN4vY-c0abiAK4_XkrM3FO4xaHpf-X-0lRf254QHuATQ5Ay9j0vrKdBU2CcQx_dER-MBEu4MMizEZ_n46SJqRrteuyNDOcHf2o3KDNB02j9kZTH8F7e9hARRfGUeInifLSPbX9vp5J5y8LIGGGZq8y0rSJ',
};

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'sentinel-2',
    name: 'Sentinel-2 MSI',
    code: 'EO-S2-MSI-A/B',
    category: 'satellite',
    categoryLabel: 'Optical',
    description: "High-resolution multispectral imaging mission capturing systematic optical coverage of Earth's land surfaces and coastal waters. Crucial for vegetation health and surface change detection.",
    coverage: 'Global Landmass',
    frequency: '5 Days (Equator)',
    status: 'ingesting',
    statusText: 'Ingesting',
    imageUrl: IMAGES.sentinel2,
    icon: 'satellite_alt',
    latencyMs: 142,
    throughputRate: '1.8 GB/s',
    lastUpdate: 'Just now'
  },
  {
    id: 'global-ais',
    name: 'Global AIS Feed',
    code: 'LOG-AIS-SAT-01',
    category: 'logistics',
    categoryLabel: 'Telemetry',
    description: 'Aggregated satellite and terrestrial Automatic Identification System (AIS) transponder data. Tracks commercial maritime vessel movements, drafts, and port congestion metrics globally.',
    coverage: 'Global Oceans',
    frequency: 'Continuous / NRT',
    status: 'ingesting',
    statusText: 'Ingesting',
    imageUrl: IMAGES.globalAIS,
    icon: 'directions_boat',
    latencyMs: 88,
    throughputRate: '840 MB/s',
    lastUpdate: '12s ago'
  },
  {
    id: 'macro-commod',
    name: 'Macro Commod-Index',
    code: 'ECO-CMD-IDX-99',
    category: 'economics',
    categoryLabel: 'Index',
    description: 'Synthesized market data feed covering raw material futures, spot prices, and strategic reserve inventories. Correlated against production hub operational statuses.',
    coverage: 'G20 Markets',
    frequency: 'Daily (EOD)',
    status: 'synced',
    statusText: 'Synced 4h ago',
    imageUrl: IMAGES.macroCommodities,
    icon: 'query_stats',
    latencyMs: 310,
    throughputRate: '45 MB/s',
    lastUpdate: '4h ago'
  },
  {
    id: 'sentinel-1',
    name: 'Copernicus Sentinel-1 SAR',
    code: 'EO-S1-C-BAND',
    category: 'satellite',
    categoryLabel: 'Synthetic Aperture Radar',
    description: 'All-weather, day-and-night radar imaging providing continuous surface deformation tracking, sea-ice extent measurements, and vessel detection regardless of cloud cover.',
    coverage: 'Global Terrestrial & Maritime',
    frequency: '6 Days Repeat',
    status: 'ingesting',
    statusText: 'Ingesting',
    imageUrl: IMAGES.coastalErosion,
    icon: 'radar',
    latencyMs: 195,
    throughputRate: '2.4 GB/s',
    lastUpdate: '1m ago'
  },
  {
    id: 'noaa-gfs',
    name: 'NOAA GFS Atmospheric',
    code: 'MET-GFS-025',
    category: 'atmospheric',
    categoryLabel: 'Numerical Forecast',
    description: 'Global Forecast System weather numerical framework delivering thermodynamic profiles, wind shear vectors, and precipitation probability indices at 0.25-degree resolution.',
    coverage: 'Global Atmosphere',
    frequency: '4x Daily (6-Hour)',
    status: 'ingesting',
    statusText: 'Ingesting',
    imageUrl: IMAGES.tundraAnomaly,
    icon: 'air',
    latencyMs: 160,
    throughputRate: '1.2 GB/s',
    lastUpdate: '8m ago'
  },
  {
    id: 'baltic-dry',
    name: 'Baltic Dry Index (BDI)',
    code: 'BDI-SPOT-USD',
    category: 'logistics',
    categoryLabel: 'Maritime Rate',
    description: 'Composite freight cost benchmark tracking Capesize, Panamax, and Supramax vessel charter rates across 20 key raw material shipping routes worldwide.',
    coverage: 'Global Shipping Lanes',
    frequency: 'Real-Time Intraday',
    status: 'synced',
    statusText: 'Synced 1h ago',
    imageUrl: IMAGES.globalSystem,
    icon: 'monitoring',
    latencyMs: 220,
    throughputRate: '12 MB/s',
    lastUpdate: '1h ago'
  }
];

export const ODESSA_SIGNALS: SignalNode[] = [
  {
    id: 'sig-00',
    code: 'SIG-00',
    title: 'Extended Late-Summer Heat Dome',
    category: 'Environmental Context',
    type: 'environmental',
    dateStr: 'SEP 15',
    metricLabel: 'Anomaly',
    metricValue: '+2.4°C Anomaly',
    icon: 'thermostat',
    description: 'Regional meteorological data confirms a prolonged period of elevated temperatures and zero precipitation across the central agrarian belt, significantly exceeding historical 10-year averages.'
  },
  {
    id: 'sig-00b',
    code: 'SIG-00b',
    title: 'Severe Crop Stress Registered',
    category: 'Agronomic Indicator',
    type: 'agronomic',
    dateStr: 'OCT 02',
    metricLabel: 'Indicator',
    metricValue: 'NDVI Deviation',
    icon: 'eco',
    description: 'Multispectral satellite imagery (Sentinel-2) detected sharp declines in Normalized Difference Vegetation Index (NDVI) values in key winter wheat and sunflower producing regions, indicating widespread physiological stress prior to harvest.'
  },
  {
    id: 'sig-01',
    code: 'SIG-01',
    title: 'Port Activity Plummeted',
    category: 'Primary Catalyst',
    type: 'primary-catalyst',
    dateStr: 'OCT 12',
    metricLabel: 'Terminal Data',
    metricValue: 'Crane Terminal Data',
    icon: 'crane',
    description: 'Crane operational hours and container throughput metrics indicate a 40% reduction in processing volume starting Oct 12, correlating with the expected arrival window of the compromised regional harvest.',
    chartData: [80, 75, 85, 90, 40, 35, 38, 30]
  },
  {
    id: 'sig-02',
    code: 'SIG-02',
    title: 'Shipping Traffic Rerouted',
    category: 'Secondary Shift',
    type: 'secondary-shift',
    dateStr: 'OCT 15',
    metricLabel: 'Vessel Tracking',
    metricValue: 'AIS Transponders',
    icon: 'directions_boat',
    description: 'AIS transponder data shows 14 bulk carriers anchoring outside standard territorial zones, significantly increasing dwell times before unloading, likely due to reduced terminal processing capacity.'
  },
  {
    id: 'sig-03',
    code: 'SIG-03',
    title: 'Regional Prices Spiked',
    category: 'Observed Impact',
    type: 'observed-impact',
    dateStr: 'OCT 26',
    metricLabel: 'Market Feed',
    metricValue: 'Retail Indices',
    icon: 'trending_up',
    description: 'Within 14 days of initial port delays, localized consumer price indices for staples (wheat, sunflower oil) rose by 12% above seasonal norms, completing the transmission from supply shock to retail inflation.'
  }
];

export const COUNTER_HYPOTHESES: CounterHypothesis[] = [
  {
    id: 'hyp-1',
    title: 'Seasonal Weather Anomaly',
    summary: 'Severe maritime conditions were reported in the Black Sea during week 2, potentially explaining AIS dwell times independently of structural port issues or crop yields.',
    author: 'Black Sea Hydrographic Node',
    status: 'under-review',
    confidenceImpact: '-8.2%'
  },
  {
    id: 'hyp-2',
    title: 'Missing Rail Data',
    summary: 'Overland transport volume data for Oct 15-20 is incomplete. If rail offset the port deficit, the price hike correlation weakens significantly.',
    author: 'Eurasia Logistics Registry',
    status: 'under-review',
    confidenceImpact: '-11.4%'
  }
];

export const PRIMARY_INQUIRY: InvestigationInquiry = {
  id: 'inq-commod-fluct',
  title: 'Commodity Fluctuations',
  query: 'Why are food prices changing?',
  summary: 'Tracing the impact of unseasonal weather patterns on global supply chains.',
  confidence: 78,
  sources: [
    { name: 'NOAA Weather API', icon: 'satellite_alt', status: 'Active', updated: '2m ago' },
    { name: 'Global Port Authority', icon: 'directions_boat', status: 'Live stream active', updated: 'Live' },
    { name: 'Agri-Index Historical', icon: 'agriculture', status: 'Syncing...', updated: 'Syncing' }
  ],
  crucialDiscovery: {
    title: 'Supply movement slowed significantly 14 days before global prices reacted.',
    narrative: 'Analysis of maritime shipping lanes correlates directly with minor meteorological anomalies in the Pacific corridor, suggesting early strategic hoarding by regional distributors.',
    correlationFactor: '0.89 (High)',
    correlationScore: 0.89,
    trendData: [
      { x: 0, y: 50 },
      { x: 20, y: 45 },
      { x: 40, y: 48 },
      { x: 60, y: 30 },
      { x: 80, y: 35 },
      { x: 100, y: 50 },
      { x: 120, y: 48 },
      { x: 140, y: 20 },
      { x: 160, y: 15 },
      { x: 180, y: 5 },
      { x: 200, y: 2 }
    ]
  },
  networkNodes: [
    { id: 'node-weather', label: 'WEATHER (METEO)', x: 300, y: 200, type: 'primary', status: 'Trigger Anomaly (+2.4°C)' },
    { id: 'node-crop', label: 'CROP STRESS', x: 600, y: 400, type: 'central', status: 'NDVI Deviation -34%' },
    { id: 'node-port', label: 'PORT_ACTIVITY', x: 900, y: 300, type: 'primary', status: 'Throughput Down -40%' },
    { id: 'node-agri', label: 'AGRI_YIELD', x: 400, y: 650, type: 'data', status: 'Yield Deficit' },
    { id: 'node-comm', label: 'COMM_INDEX', x: 850, y: 550, type: 'data', status: 'Retail Price Spike +12%' }
  ],
  connections: [
    { from: 'node-weather', to: 'node-crop', active: true, illuminated: true },
    { from: 'node-crop', to: 'node-port', active: true, illuminated: true },
    { from: 'node-crop', to: 'node-agri', active: true, illuminated: false },
    { from: 'node-crop', to: 'node-comm', active: true, illuminated: false },
    { from: 'node-port', to: 'node-comm', active: true, illuminated: false }
  ]
};

export const NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    timestamp: '10 min ago',
    type: 'anomaly',
    title: 'Thermal Bloom Anomaly in Sector 7-G',
    description: 'Spectrometry array GEO-SAT-44 registered +45°C spike over tundra zone.',
    nodeId: 'Node-04',
    unread: true
  },
  {
    id: 'notif-2',
    timestamp: '42 min ago',
    type: 'insight',
    title: 'Correlation Synthesized: Black Sea Port Corridor',
    description: 'Supply throughput shock propagation modeled with 87.4% confidence.',
    nodeId: 'Alpha Node',
    unread: true
  },
  {
    id: 'notif-3',
    timestamp: '2 hours ago',
    type: 'system',
    title: 'Copernicus Sentinel-1 Ingestion Stream Restored',
    description: 'Bandwidth scaled to 2.4 GB/s; zero frame packet loss reported.',
    nodeId: 'Node-04',
    unread: false
  }
];
