import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { Analysis, AnalysisNode, NodeRole } from '../brain/contracts';
import earthTexture from '../assets/earth-night.jpg';

const ROLE_COLOR: Record<NodeRole, string> = {
  cause: '#60d8d8',
  mechanism: '#fcba62',
  amplifier: '#ffb692',
  effect: '#9ab3b2',
};

export interface GlobeViewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface GlobeViewProps {
  analysis: Analysis;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  autoRotate: boolean;
}

type GlobePoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
  altitude: number;
  radius: number;
};

type GlobeArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string[];
  stroke: number;
  altitude: number;
  dashAnimate: number;
  isBlindSpot: boolean;
};

function nodeMap(nodes: AnalysisNode[]): Map<string, AnalysisNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

function isBlindSpotEdge(
  analysis: Analysis,
  from: AnalysisNode,
  to: AnalysisNode,
): boolean {
  if (!analysis.blindSpot) return false;
  // Headline link usually involves the amplifier / air-quality co-signal
  return (
    from.role === 'amplifier' ||
    to.role === 'amplifier' ||
    from.domain === 'air_quality' ||
    to.domain === 'air_quality'
  );
}

export const GlobeView = forwardRef<GlobeViewHandle, GlobeViewProps>(
  function GlobeView({ analysis, selectedNodeId, onSelectNode, autoRotate }, ref) {
    const globeRef = useRef<GlobeMethods | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const [hovering, setHovering] = useState(false);
    const altitudeRef = useRef(0.72);

    const byId = useMemo(() => nodeMap(analysis.nodes), [analysis.nodes]);

    const points: GlobePoint[] = useMemo(() => {
      return analysis.nodes
        .filter((n) => n.geo)
        .map((n) => ({
          id: n.id,
          lat: n.geo!.lat,
          lng: n.geo!.lon,
          label: n.label,
          color: ROLE_COLOR[n.role],
          altitude: selectedNodeId === n.id ? 0.04 : 0.02,
          radius: selectedNodeId === n.id ? 0.7 : 0.5,
        }));
    }, [analysis.nodes, selectedNodeId]);

    const arcs: GlobeArc[] = useMemo(() => {
      return analysis.edges
        .map((e) => {
          const from = byId.get(e.from);
          const to = byId.get(e.to);
          if (!from?.geo || !to?.geo) return null;
          const blind = isBlindSpotEdge(analysis, from, to);
          const strength = Math.min(1, Math.abs(e.correlation));
          return {
            startLat: from.geo.lat,
            startLng: from.geo.lon,
            endLat: to.geo.lat,
            endLng: to.geo.lon,
            color: blind ? ['#60d8d8', '#fcba62', '#ffb692'] : ['#60d8d8', '#fcba62'],
            stroke: blind ? 1.6 + strength : 0.7 + strength * 0.7,
            altitude: blind ? 0.35 + strength * 0.15 : 0.22 + strength * 0.12,
            dashAnimate: blind ? 1100 : 2000,
            isBlindSpot: blind,
          };
        })
        .filter((a): a is GlobeArc => a !== null);
    }, [analysis, byId]);

    const labels = useMemo(
      () =>
        points.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          text: p.label,
          color: p.color,
          size: selectedNodeId === p.id ? 1.35 : 1.05,
          altitude: 0.03,
        })),
      [points, selectedNodeId],
    );

    const flyToRegion = useCallback(() => {
      const g = globeRef.current;
      if (!g) return;
      const { lat, lon } = analysis.region.center;
      altitudeRef.current = 0.72;
      g.pointOfView({ lat, lng: lon, altitude: altitudeRef.current }, 1500);
    }, [analysis.region.center]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          const g = globeRef.current;
          if (!g) return;
          altitudeRef.current = Math.max(0.35, altitudeRef.current - 0.18);
          const pov = g.pointOfView();
          g.pointOfView({ ...pov, altitude: altitudeRef.current }, 400);
        },
        zoomOut: () => {
          const g = globeRef.current;
          if (!g) return;
          altitudeRef.current = Math.min(3.2, altitudeRef.current + 0.25);
          const pov = g.pointOfView();
          g.pointOfView({ ...pov, altitude: altitudeRef.current }, 400);
        },
        resetView: () => flyToRegion(),
      }),
      [flyToRegion],
    );

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const sync = () => setSize({ w: el.clientWidth, h: el.clientHeight });
      sync();
      const ro = new ResizeObserver(sync);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      // Delay fly-in until globe canvas is ready
      const t = window.setTimeout(flyToRegion, 200);
      return () => window.clearTimeout(t);
    }, [flyToRegion, analysis.question]);

    useEffect(() => {
      const g = globeRef.current;
      if (!g) return;
      const controls = g.controls();
      controls.autoRotate = autoRotate && !hovering;
      controls.autoRotateSpeed = 0.35;
      controls.enableDamping = true;
    }, [autoRotate, hovering]);

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 bg-[#03080a]"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(3,8,10,0)"
          globeImageUrl={earthTexture}
          atmosphereColor="#60d8d8"
          atmosphereAltitude={0.18}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude="altitude"
          pointRadius="radius"
          pointsMerge={false}
          onPointClick={(p) => {
            const pt = p as GlobePoint;
            if (pt?.id) onSelectNode(pt.id);
          }}
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcStroke="stroke"
          arcAltitude="altitude"
          arcDashLength={0.35}
          arcDashGap={0.55}
          arcDashAnimateTime="dashAnimate"
          labelsData={labels}
          labelLat="lat"
          labelLng="lng"
          labelText="text"
          labelColor="color"
          labelSize="size"
          labelAltitude="altitude"
          labelDotRadius={0}
          labelResolution={2}
          labelsTransitionDuration={300}
        />
      </div>
    );
  },
);
