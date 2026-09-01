import { Analysis, TimeWindow } from './contracts';
import { resolveRegion } from './geo';
import { fetchSignals } from './ingestion';
import { discover } from './discovery';
import { synthesize } from './reasoning';
import { hasLlmKey } from './llm/client';
import fixture from './__fixtures__/manila-flood.analysis.json';

function defaultWindow(): TimeWindow {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end.getTime() - 120 * 24 * 3600 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/** Spread missing node geo on a ~0.15° ring so arcs read at city zoom. */
function ensureNodeGeo(analysis: Analysis): Analysis {
  const { lat, lon } = analysis.region.center;
  const n = analysis.nodes.length || 1;
  const radius = 0.15;
  return {
    ...analysis,
    nodes: analysis.nodes.map((node, i) => {
      if (node.geo) return node;
      const angle = (2 * Math.PI * i) / n;
      return {
        ...node,
        geo: {
          lat: lat + radius * Math.cos(angle),
          lon: lon + radius * Math.sin(angle),
        },
      };
    }),
  };
}

function fallbackAnalysis(question: string, reason: string): Analysis {
  console.info('[HELM] fallback → fixture:', reason);
  const base = fixture as Analysis;
  return ensureNodeGeo({
    ...base,
    question,
    region: { ...base.region, center: { ...base.region.center } },
    nodes: base.nodes.map((node) => ({ ...node, geo: node.geo ? { ...node.geo } : undefined })),
    edges: base.edges.map((e) => ({ ...e })),
    effects: [...base.effects],
    actions: [...base.actions],
    blindSpot: base.blindSpot ? { ...base.blindSpot } : undefined,
    dataProvenance: base.dataProvenance.map((p) => ({ ...p })),
    meta: { source: 'fixture', fallbackReason: reason },
  });
}

function isUsable(analysis: Analysis | null | undefined): analysis is Analysis {
  return Boolean(
    analysis &&
      analysis.nodes?.length &&
      analysis.edges?.length &&
      analysis.summary &&
      Array.isArray(analysis.effects) &&
      Array.isArray(analysis.actions),
  );
}

export async function analyzeQuestion(question: string): Promise<Analysis> {
  try {
    const llmOn = hasLlmKey();
    console.info('[HELM] hasLlmKey()', llmOn);
    if (!llmOn) {
      return fallbackAnalysis(question, 'llm disabled');
    }

    const region = await resolveRegion(question);
    console.info('[HELM] resolved region', region.name);
    const window = defaultWindow();
    const signals = await fetchSignals(region, window);
    console.info('[HELM] signals.length', signals.length);
    if (!signals.length) {
      return fallbackAnalysis(question, 'no signals');
    }

    const discovery = discover(signals, region, window);
    console.info('[HELM] discovery.links.length', discovery.links.length);
    if (!discovery.links.length) {
      return fallbackAnalysis(question, 'no links');
    }

    const analysis = await synthesize(question, discovery);
    console.info('[HELM] granite parsed OK');
    if (!isUsable(analysis)) {
      return fallbackAnalysis(question, 'granite invalid: unusable analysis shape');
    }
    return ensureNodeGeo({
      ...analysis,
      meta: { source: 'live' },
    });
  } catch (err) {
    console.error('[HELM] live pipeline failed:', err);
    const detail = err instanceof Error ? err.message : String(err);
    return fallbackAnalysis(question, `granite invalid: ${detail}`);
  }
}
