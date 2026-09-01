import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import DeckGL from '@deck.gl/react';
import { Map as MapLibreMap } from 'react-map-gl/maplibre';
import { ArcLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { FlyToInterpolator, WebMercatorViewport } from '@deck.gl/core';
import type { MapViewState, PickingInfo } from '@deck.gl/core';
import type { MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import { Analysis, AnalysisNode, NodeRole } from '../brain/contracts';
import 'maplibre-gl/dist/maplibre-gl.css';

const ROLE_COLOR: Record<NodeRole, string> = {
  cause: '#60d8d8',
  mechanism: '#fcba62',
  amplifier: '#ffb692',
  effect: '#9ab3b2',
};

const ROLE_ORDER: Record<NodeRole, number> = {
  cause: 0,
  mechanism: 1,
  amplifier: 1,
  effect: 2,
};

const LABEL_OFFSETS: [number, number][] = [
  [0, -22],
  [22, -8],
  [-22, -8],
  [0, 24],
  [26, 12],
  [-26, 12],
];

const OCEAN = '#0a2430';
const GLOBE_ZOOM = 1.45;
const FLY_MS = 2500;
const ARC_STAGGER_MS = 300;
const IDLE_ZOOM_MAX = 3.2;
const TILE_FALLBACK_MS = 1200;
const RASTER_FADE_MS = 350;

const ESRI_STYLE: StyleSpecification = {
  version: 8,
  name: 'helm-esri-imagery',
  projection: { type: 'globe' },
  sources: {
    esri: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': OCEAN },
    },
    {
      id: 'esri-world-imagery',
      type: 'raster',
      source: 'esri',
      paint: {
        'raster-opacity': 1,
        'raster-fade-duration': RASTER_FADE_MS,
      },
    },
  ],
};

export interface RealMapViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface RealMapViewProps {
  analysis: Analysis;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

type NodeDatum = AnalysisNode & { lon: number; lat: number; color: string; index: number };

type ArcDatum = {
  id: string;
  from: [number, number];
  to: [number, number];
  mid: [number, number];
  lag: string;
  correlation: number;
  isBlindSpot: boolean;
  order: number;
};

function isBlindSpotEdge(analysis: Analysis, from: AnalysisNode, to: AnalysisNode): boolean {
  if (!analysis.blindSpot) return false;
  return (
    from.role === 'amplifier' ||
    to.role === 'amplifier' ||
    from.domain === 'air_quality' ||
    to.domain === 'air_quality'
  );
}

function midLonLat(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function hexToRgba(hex: string, a = 255): [number, number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
}

function nodeBounds(nodes: { lon: number; lat: number }[]): [[number, number], [number, number]] {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const n of nodes) {
    minLon = Math.min(minLon, n.lon);
    minLat = Math.min(minLat, n.lat);
    maxLon = Math.max(maxLon, n.lon);
    maxLat = Math.max(maxLat, n.lat);
  }
  if (!Number.isFinite(minLon)) {
    return [
      [-1, -1],
      [1, 1],
    ];
  }
  const pad = Math.max(0.04, (maxLon - minLon) * 0.15, (maxLat - minLat) * 0.15);
  if (maxLon - minLon < 0.02) {
    minLon -= pad;
    maxLon += pad;
  }
  if (maxLat - minLat < 0.02) {
    minLat -= pad;
    maxLat += pad;
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}

function fitViewForNodes(
  nodes: { lon: number; lat: number }[],
  fallback: { lon: number; lat: number },
): MapViewState {
  const width = typeof window !== 'undefined' ? Math.max(640, window.innerWidth) : 1280;
  const height = typeof window !== 'undefined' ? Math.max(480, window.innerHeight) : 800;
  const points = nodes.length
    ? nodes
    : [{ lon: fallback.lon, lat: fallback.lat }];
  const bounds = nodeBounds(points);
  const viewport = new WebMercatorViewport({
    width,
    height,
    longitude: fallback.lon,
    latitude: fallback.lat,
    zoom: 2,
  });
  const fitted = viewport.fitBounds(bounds, {
    padding: {
      top: 140,
      bottom: 260,
      left: Math.min(380, width * 0.28),
      right: Math.min(400, width * 0.3),
    },
    maxZoom: 13.5,
  });
  return {
    longitude: fitted.longitude,
    latitude: fitted.latitude,
    zoom: fitted.zoom,
    pitch: 46,
    bearing: -16,
  };
}

/** Warm Esri cache for the dive target while the globe is still visible. */
function prefetchRegionTiles(lon: number, lat: number, zoom: number) {
  if (typeof Image === 'undefined') return;
  const z = Math.min(12, Math.max(8, Math.floor(zoom)));
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y + dy}/${x + dx}`;
    }
  }
}

export const RealMapView = forwardRef<RealMapViewHandle, RealMapViewProps>(
  function RealMapView({ analysis, selectedNodeId, onSelectNode }, ref) {
    const mapRef = useRef<MapRef>(null);
    const [pulse, setPulse] = useState(0);
    const [tilesFailed, setTilesFailed] = useState(false);
    const [tilesPainted, setTilesPainted] = useState(false);
    const [visibleArcCount, setVisibleArcCount] = useState(0);
    const [userInteracting, setUserInteracting] = useState(false);
    const sequenceRef = useRef(0);
    const flownFor = useRef('');
    /** Sequence id waiting for first post-dive idle (or fallback). */
    const awaitTilesRef = useRef(0);
    const revealStartedRef = useRef(0);
    const diveCompleteRef = useRef(false);
    const timersRef = useRef<number[]>([]);

    const clearTimers = useCallback(() => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    }, []);

    const schedule = useCallback((fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms);
      timersRef.current.push(id);
      return id;
    }, []);

    const globeView = useCallback((): MapViewState => {
      const { lat, lon } = analysis.region.center;
      return {
        longitude: lon,
        latitude: lat,
        zoom: GLOBE_ZOOM,
        pitch: 0,
        bearing: 0,
      };
    }, [analysis.region.center]);

    const [viewState, setViewState] = useState<MapViewState>(() => globeView());

    const nodes: NodeDatum[] = useMemo(() => {
      return analysis.nodes
        .filter((n) => n.geo)
        .map((n, index) => ({
          ...n,
          lon: n.geo!.lon,
          lat: n.geo!.lat,
          color: ROLE_COLOR[n.role],
          index,
        }));
    }, [analysis.nodes]);

    const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

    const arcs: ArcDatum[] = useMemo(() => {
      const raw = analysis.edges
        .map((e) => {
          const from = byId.get(e.from);
          const to = byId.get(e.to);
          if (!from || !to) return null;
          const src: [number, number] = [from.lon, from.lat];
          const tgt: [number, number] = [to.lon, to.lat];
          const order = ROLE_ORDER[from.role] * 10 + ROLE_ORDER[to.role];
          return {
            id: `${e.from}->${e.to}`,
            from: src,
            to: tgt,
            mid: midLonLat(src, tgt),
            lag: e.lag,
            correlation: e.correlation,
            isBlindSpot: isBlindSpotEdge(analysis, from, to),
            order,
          };
        })
        .filter((a): a is ArcDatum => a !== null);

      return raw.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return Math.abs(b.correlation) - Math.abs(a.correlation);
      });
    }, [analysis, byId]);

    const visibleArcs = useMemo(
      () => (tilesPainted ? arcs.slice(0, visibleArcCount) : []),
      [arcs, tilesPainted, visibleArcCount],
    );

    const visibleNodes = useMemo(
      () => (tilesPainted ? nodes : []),
      [nodes, tilesPainted],
    );

    const beginArcReveal = useCallback(
      (seq: number) => {
        // #region agent log
        fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'E',location:'RealMapView.tsx:beginArcReveal',message:'beginArcReveal called',data:{seq,currentSeq:sequenceRef.current,alreadyStarted:revealStartedRef.current,seqMismatch:seq!==sequenceRef.current},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (seq !== sequenceRef.current) return;
        if (revealStartedRef.current === seq) return;
        revealStartedRef.current = seq;
        awaitTilesRef.current = 0;
        diveCompleteRef.current = true;
        setTilesPainted(true);
        // #region agent log
        fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'E',location:'RealMapView.tsx:beginArcReveal:ok',message:'tilesPainted set true',data:{seq},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        arcs.forEach((_, i) => {
          schedule(() => {
            if (seq !== sequenceRef.current) return;
            setVisibleArcCount(i + 1);
          }, i * ARC_STAGGER_MS);
        });
      },
      [arcs, schedule],
    );

    const tryRevealAfterTiles = useCallback(() => {
      const seq = awaitTilesRef.current;
      const map = mapRef.current?.getMap();
      const zoom = map?.getZoom?.() ?? 0;
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'B',location:'RealMapView.tsx:tryRevealAfterTiles',message:'tryReveal gate',data:{seq,currentSeq:sequenceRef.current,diveComplete:diveCompleteRef.current,zoom,hasMap:!!map,areTilesLoaded:map?.areTilesLoaded?.()??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      if (!seq || seq !== sequenceRef.current) return;
      if (!diveCompleteRef.current) return;
      if (zoom < 5) return;
      beginArcReveal(seq);
    }, [beginArcReveal]);

    const runSequence = useCallback(() => {
      const seq = ++sequenceRef.current;
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'C',location:'RealMapView.tsx:runSequence',message:'runSequence start',data:{seq,timerCountBeforeClear:timersRef.current.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      clearTimers();
      setUserInteracting(false);
      setVisibleArcCount(0);
      setTilesPainted(false);
      awaitTilesRef.current = seq;
      revealStartedRef.current = 0;
      diveCompleteRef.current = false;

      const fitted = fitViewForNodes(nodes, analysis.region.center);
      prefetchRegionTiles(
        fitted.longitude ?? analysis.region.center.lon,
        fitted.latitude ?? analysis.region.center.lat,
        fitted.zoom ?? 11,
      );

      const start = globeView();
      setViewState({ ...start, transitionDuration: 0 });

      // Dive immediately so destination tiles warm during the flight
      schedule(() => {
        if (seq !== sequenceRef.current) {
          // #region agent log
          fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'C',location:'RealMapView.tsx:flyTimer',message:'fly timer aborted seq mismatch',data:{seq,currentSeq:sequenceRef.current},timestamp:Date.now()})}).catch(()=>{});
          // #endregion
          return;
        }
        // #region agent log
        fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'A',location:'RealMapView.tsx:flyTimer',message:'flyTo scheduled',data:{seq,fittedZoom:fitted.zoom},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        setViewState({
          ...fitted,
          transitionDuration: FLY_MS,
          transitionInterpolator: new FlyToInterpolator({ speed: 1.15 }),
        });
      }, 40);

      schedule(() => {
        if (seq !== sequenceRef.current) return;
        diveCompleteRef.current = true;
        const map = mapRef.current?.getMap();
        // #region agent log
        fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'B',location:'RealMapView.tsx:postFly',message:'post-fly check',data:{seq,zoom:map?.getZoom?.()??null,areTilesLoaded:map?.areTilesLoaded?.()??null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (map?.areTilesLoaded()) {
          beginArcReveal(seq);
          return;
        }
        tryRevealAfterTiles();
      }, 40 + FLY_MS);

      // Hard fallback — never leave the loader up forever
      schedule(() => {
        // #region agent log
        fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',hypothesisId:'C',location:'RealMapView.tsx:fallback',message:'fallback timer fired',data:{seq,currentSeq:sequenceRef.current,awaitTiles:awaitTilesRef.current,willReveal:seq===sequenceRef.current&&awaitTilesRef.current===seq},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (seq !== sequenceRef.current) return;
        if (awaitTilesRef.current === seq) beginArcReveal(seq);
      }, 40 + FLY_MS + TILE_FALLBACK_MS);
    }, [
      analysis.region.center,
      beginArcReveal,
      clearTimers,
      globeView,
      nodes,
      schedule,
      tryRevealAfterTiles,
    ]);

    const onMapIdleRef = useRef(() => {});
    onMapIdleRef.current = () => {
      // Only act while a dive is waiting on tiles — stops idle spam / leftover map listeners
      if (!awaitTilesRef.current) return;
      tryRevealAfterTiles();
    };

    const runSequenceRef = useRef(runSequence);
    runSequenceRef.current = runSequence;

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          setUserInteracting(true);
          setViewState((v) => ({
            ...v,
            zoom: Math.min((v.zoom ?? 12) + 1, 18),
            transitionDuration: 350,
          }));
        },
        zoomOut: () => {
          setUserInteracting(true);
          setViewState((v) => ({
            ...v,
            zoom: Math.max((v.zoom ?? 12) - 1, 1),
            transitionDuration: 350,
          }));
        },
        resetView: () => {
          flownFor.current = '';
          runSequenceRef.current();
        },
      }),
      [],
    );

    const nodeIdsKey = nodes.map((n) => n.id).join(',');

    useEffect(() => {
      const key = `${analysis.question}|${analysis.region.center.lat}|${analysis.region.center.lon}|${nodeIdsKey}`;
      // #region agent log
      fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',runId:'post-fix',hypothesisId:'D',location:'RealMapView.tsx:effect',message:'effect mount/run',data:{keyLen:key.length,prevKeyMatch:flownFor.current===key},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      flownFor.current = key;
      runSequenceRef.current();

      return () => {
        // Strict Mode remounts: clear in-flight timers and allow the next
        // effect pass to start a fresh sequence (do NOT keep flownFor set).
        // #region agent log
        fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',runId:'post-fix',hypothesisId:'D',location:'RealMapView.tsx:effect:cleanup',message:'effect cleanup reset',data:{timerCount:timersRef.current.length,seq:sequenceRef.current},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        clearTimers();
        sequenceRef.current += 1;
        flownFor.current = '';
      };
    }, [
      analysis.question,
      analysis.region.center.lat,
      analysis.region.center.lon,
      nodeIdsKey,
      clearTimers,
    ]);

    // Blind-spot pulse
    useEffect(() => {
      let raf = 0;
      const start = performance.now();
      const tick = (now: number) => {
        const t = ((now - start) % 1800) / 1800;
        setPulse(0.55 + 0.45 * Math.sin(t * Math.PI * 2));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, []);

    // Slow idle drift only while zoomed out, not interacting, and imagery already revealed
    useEffect(() => {
      if (!tilesPainted) return;
      if (userInteracting) return;
      if ((viewState.zoom ?? 0) > IDLE_ZOOM_MAX) return;
      let driftLogs = 0;
      const id = window.setInterval(() => {
        setViewState((v) => {
          if ((v.zoom ?? 0) > IDLE_ZOOM_MAX) return v;
          // #region agent log
          if (driftLogs < 3) {
            driftLogs += 1;
            fetch('http://127.0.0.1:7926/ingest/4999d449-a169-4e2b-a551-e4cab10a5962',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'740224'},body:JSON.stringify({sessionId:'740224',runId:'post-fix',hypothesisId:'A',location:'RealMapView.tsx:idleDrift',message:'idle drift tick',data:{zoom:v.zoom},timestamp:Date.now()})}).catch(()=>{});
          }
          // #endregion
          return {
            ...v,
            bearing: ((v.bearing ?? 0) + 0.06) % 360,
            transitionDuration: 0,
          };
        });
      }, 40);
      return () => window.clearInterval(id);
    }, [tilesPainted, userInteracting, viewState.zoom]);

    const layers = useMemo(() => {
      const blindVisible = visibleArcs.filter((a) => a.isBlindSpot);
      return [
        new ArcLayer<ArcDatum>({
          id: 'helm-arcs',
          data: visibleArcs,
          greatCircle: true,
          getSourcePosition: (d) => d.from,
          getTargetPosition: (d) => d.to,
          getSourceColor: (d) => (d.isBlindSpot ? [96, 216, 216, 255] : [96, 216, 216, 200]),
          getTargetColor: (d) => (d.isBlindSpot ? [255, 182, 146, 255] : [252, 186, 98, 210]),
          getWidth: (d) => {
            const base = d.isBlindSpot ? 6.5 : 2.2;
            const corr = Math.min(1, Math.abs(d.correlation));
            return (base + corr * 2.5) * (d.isBlindSpot ? pulse : 0.9);
          },
          getHeight: (d) => (d.isBlindSpot ? 0.6 : 0.28) + Math.abs(d.correlation) * 0.2,
          getTilt: (d) => (d.isBlindSpot ? 18 : 0) * pulse,
          pickable: false,
          updateTriggers: {
            getWidth: pulse,
            getTilt: pulse,
          },
        }),
        new ScatterplotLayer<NodeDatum>({
          id: 'helm-nodes',
          data: visibleNodes,
          getPosition: (d) => [d.lon, d.lat],
          getFillColor: (d) => hexToRgba(d.color, selectedNodeId === d.id ? 255 : 220),
          getRadius: (d) => (selectedNodeId === d.id ? 110 : 70),
          radiusUnits: 'meters',
          radiusMinPixels: 5,
          radiusMaxPixels: 18,
          stroked: true,
          getLineColor: [7, 19, 23, 230],
          lineWidthMinPixels: 1.5,
          pickable: true,
          autoHighlight: true,
          onClick: (info: PickingInfo<NodeDatum>) => {
            if (info.object?.id) onSelectNode(info.object.id);
          },
        }),
        new TextLayer<NodeDatum>({
          id: 'helm-node-labels',
          data: visibleNodes,
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => d.label,
          getColor: [222, 228, 227, 245],
          getSize: 12,
          sizeUnits: 'pixels',
          getPixelOffset: (d) => {
            const base = LABEL_OFFSETS[d.index % LABEL_OFFSETS.length];
            return [base[0], base[1] - 6];
          },
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          background: true,
          getBackgroundColor: [5, 13, 16, 210],
          backgroundPadding: [4, 2, 4, 2],
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 600,
          pickable: true,
          onClick: (info: PickingInfo<NodeDatum>) => {
            if (info.object?.id) onSelectNode(info.object.id);
          },
        }),
        new TextLayer<NodeDatum>({
          id: 'helm-node-sources',
          data: visibleNodes,
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => d.source,
          getColor: [96, 216, 216, 255],
          getSize: 9,
          sizeUnits: 'pixels',
          getPixelOffset: (d) => {
            const base = LABEL_OFFSETS[d.index % LABEL_OFFSETS.length];
            return [base[0], base[1] + 10];
          },
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          background: true,
          getBackgroundColor: [5, 13, 16, 220],
          backgroundPadding: [3, 1, 3, 1],
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
          pickable: false,
        }),
        new TextLayer<ArcDatum>({
          id: 'helm-arc-lags',
          data: visibleArcs,
          getPosition: (d) => d.mid,
          getText: (d) => d.lag,
          getColor: (d) => (d.isBlindSpot ? [252, 186, 98, 255] : [154, 179, 178, 240]),
          getSize: 10,
          sizeUnits: 'pixels',
          getPixelOffset: (_d, info) => {
            const idx = info.index ?? 0;
            return [0, -14 - (idx % 3) * 10];
          },
          getTextAnchor: 'middle',
          background: true,
          getBackgroundColor: [5, 13, 16, 200],
          backgroundPadding: [3, 1, 3, 1],
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
          pickable: false,
        }),
        new TextLayer<ArcDatum>({
          id: 'helm-blind-spot-badge',
          data: blindVisible,
          getPosition: (d) => d.mid,
          getText: () => '⚠ Blind Spot',
          getColor: [252, 186, 98, Math.round(200 + 55 * pulse)],
          getSize: 12,
          sizeUnits: 'pixels',
          getPixelOffset: [0, 16],
          getTextAnchor: 'middle',
          background: true,
          getBackgroundColor: [5, 13, 16, 230],
          backgroundPadding: [6, 3, 6, 3],
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
          pickable: false,
          updateTriggers: { getColor: pulse },
        }),
      ];
    }, [onSelectNode, pulse, selectedNodeId, visibleArcs, visibleNodes]);

    return (
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, #0d3a4a 0%, #0a2430 42%, #061820 100%)',
        }}
      >
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState: next, interactionState }) => {
            if (interactionState?.isDragging || interactionState?.isZooming || interactionState?.isPanning) {
              setUserInteracting(true);
            }
            setViewState(next as unknown as MapViewState);
          }}
          controller
          layers={layers}
          getTooltip={() => null}
          style={{ background: 'transparent' }}
        >
          <MapLibreMap
            ref={mapRef}
            mapStyle={ESRI_STYLE}
            attributionControl={false}
            reuseMaps
            onLoad={(e) => {
              e.target.on('idle', () => onMapIdleRef.current());
            }}
            onError={() => {
              setTilesFailed(true);
              const seq = awaitTilesRef.current || sequenceRef.current;
              if (seq) beginArcReveal(seq);
            }}
            style={{ width: '100%', height: '100%' }}
          />
        </DeckGL>

        {!tilesPainted && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3 px-4 py-3 rounded-xl bg-[#050d10]/55 border border-[#1e313a]/80 backdrop-blur-sm">
              <div
                className="w-8 h-8 rounded-full border-2 border-[#60d8d8]/25 border-t-[#60d8d8] animate-spin"
                style={{ animationDuration: '0.9s' }}
              />
              <span className="text-[10px] font-mono-data text-[#9ab3b2] uppercase tracking-wider">
                Downlinking multi-satellite signals…
              </span>
            </div>
          </div>
        )}

        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[min(90vw,36rem)]">
          <div className="px-3 py-1.5 rounded-full bg-[#050d10]/90 border border-[#1e313a] backdrop-blur-md text-center">
            <span className="text-[10px] font-mono-data text-[#60d8d8] uppercase tracking-wider font-bold">
              {analysis.region.name}
            </span>
            <span className="text-[10px] font-mono-data text-[#6b8584] mx-2">·</span>
            <span className="text-[10px] font-mono-data text-[#9ab3b2] truncate">
              {analysis.question}
            </span>
          </div>
        </div>

        <div className="absolute bottom-28 left-6 z-10 pointer-events-none">
          <div className="bg-[#050d10]/92 backdrop-blur-md border border-[#1e313a] rounded-xl px-3 py-2.5 shadow-xl space-y-2 min-w-[12rem]">
            <div className="text-[9px] font-mono-data uppercase tracking-wider text-[#60d8d8] font-bold">
              Mission console · satellite data
            </div>
            {(Object.keys(ROLE_COLOR) as NodeRole[]).map((role) => (
              <div key={role} className="flex items-center gap-2 text-[10px] font-mono-data text-[#dee4e3]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ROLE_COLOR[role] }} />
                <span className="capitalize">{role}</span>
              </div>
            ))}
            <div className="border-t border-[#1e313a] pt-2 space-y-1 text-[9px] font-mono-data text-[#9ab3b2] leading-snug">
              <div>Dot = EO phenomenon node</div>
              <div>Arc = discovered causal link</div>
              <div>Cyan label = satellite / mission</div>
              <div>⚠ = blind spot</div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[min(94vw,42rem)]">
          <div className="px-3 py-1.5 rounded-lg bg-[#050d10]/88 border border-[#1e313a]/90 backdrop-blur-md text-center">
            <span className="text-[9px] font-mono-data uppercase tracking-wider text-[#6b8584] font-bold mr-2">
              Data from orbit
            </span>
            <span className="text-[9px] font-mono-data text-[#9ab3b2]">
              GPM/IMERG · Sentinel-5P TROPOMI / CAMS · SMAP / Sentinel-1 · NASA EONET · Sentinel-2 / Landsat · ERA5
              <span className="text-[#6b8584]"> (derived / assimilated)</span>
            </span>
          </div>
        </div>

        <div className="absolute bottom-2 right-3 z-10 pointer-events-none">
          <span className="text-[9px] font-mono-data text-[#6b8584] bg-[#050d10]/80 px-2 py-0.5 rounded">
            Basemap: Esri, Maxar, Earthstar Geographics
            {tilesFailed ? ' · imagery offline (arcs still live)' : ''}
          </span>
        </div>
      </div>
    );
  },
);
