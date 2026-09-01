import { jsonrepair } from 'jsonrepair';
import { Analysis, AnalysisEdge, AnalysisNode, DiscoveryResult, NodeRole } from './contracts';
import { getLlmClient } from './llm/client';
import { buildPrompt } from './llm/prompt';

const SATELLITE_BY_SOURCE: Record<string, string> = {
  'open-meteo-precip': 'GPM/IMERG (derived)',
  'open-meteo-temp': 'ECMWF / GFS (derived)',
  'open-meteo-soil': 'ECMWF soil (derived)',
  'open-meteo-pm25': 'Sentinel-5P (derived)',
  'open-meteo-aod': 'Sentinel-5P (derived)',
};

const ROLES = new Set<NodeRole>(['cause', 'mechanism', 'amplifier', 'effect']);

function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in LLM response');
  }
  // Granite occasionally emits trailing commas / broken JSON
  const jsonText = text.slice(start, end + 1).replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(jsonText);
  } catch {
    return JSON.parse(jsonrepair(jsonText));
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function parseNode(n: unknown): AnalysisNode | null {
  if (!n || typeof n !== 'object') return null;
  const o = n as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id.trim()) return null;
  if (typeof o.label !== 'string' || !o.label.trim()) return null;
  if (typeof o.domain !== 'string' || !o.domain.trim()) return null;
  if (typeof o.source !== 'string' || !o.source.trim()) return null;
  if (typeof o.metric !== 'string' || !o.metric.trim()) return null;
  if (typeof o.role !== 'string' || !ROLES.has(o.role as NodeRole)) return null;
  const node: AnalysisNode = {
    id: o.id.trim(),
    label: o.label.trim(),
    domain: o.domain as AnalysisNode['domain'],
    source: o.source.trim(),
    metric: o.metric.trim(),
    role: o.role as NodeRole,
  };
  if (typeof o.signalId === 'string') node.signalId = o.signalId;
  if (o.geo && typeof o.geo === 'object') {
    const g = o.geo as { lat?: unknown; lon?: unknown };
    if (typeof g.lat === 'number' && typeof g.lon === 'number') {
      node.geo = { lat: g.lat, lon: g.lon };
    }
  }
  return node;
}

function parseEdge(e: unknown, nodeIds: Set<string>): AnalysisEdge | null {
  if (!e || typeof e !== 'object') return null;
  const o = e as Record<string, unknown>;
  if (typeof o.from !== 'string' || typeof o.to !== 'string') return null;
  if (!nodeIds.has(o.from) || !nodeIds.has(o.to)) return null;
  if (typeof o.lag !== 'string' || !o.lag.trim()) return null;
  if (typeof o.rationale !== 'string' || !o.rationale.trim()) return null;
  const correlation = typeof o.correlation === 'number' ? o.correlation : Number(o.correlation);
  const confidence = typeof o.confidence === 'number' ? o.confidence : Number(o.confidence);
  if (!Number.isFinite(correlation)) return null;
  return {
    from: o.from,
    to: o.to,
    lag: o.lag.trim(),
    correlation,
    confidence: clamp01(confidence),
    rationale: o.rationale.trim(),
  };
}

/**
 * Tolerant: drop bad nodes/edges; throw only if core structure is unusable.
 * Short effects/actions/missing blindSpot do NOT throw — repair retry fills them.
 */
function validateAnalysis(value: unknown): Analysis {
  if (!value || typeof value !== 'object') throw new Error('Analysis is not an object');
  const o = value as Record<string, unknown>;
  if (typeof o.question !== 'string') throw new Error('missing question');
  if (!o.region || typeof o.region !== 'object') throw new Error('missing region');
  if (typeof o.summary !== 'string') throw new Error('missing summary');

  const rawConfidence =
    typeof o.confidence === 'number' ? o.confidence : Number(o.confidence);
  const confidence = clamp01(Number.isFinite(rawConfidence) ? rawConfidence : 0);

  const nodeList = Array.isArray(o.nodes) ? o.nodes : [];
  const nodes = nodeList.map(parseNode).filter((n): n is AnalysisNode => n !== null);
  if (nodes.length < 1) throw new Error('no valid nodes after filter');

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeList = Array.isArray(o.edges) ? o.edges : [];
  const edges = edgeList
    .map((e) => parseEdge(e, nodeIds))
    .filter((e): e is AnalysisEdge => e !== null);
  if (edges.length < 1) throw new Error('no valid edges after filter');

  const effects = Array.isArray(o.effects)
    ? o.effects.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const actions = Array.isArray(o.actions)
    ? o.actions.map((x) => String(x).trim()).filter(Boolean)
    : [];

  let blindSpot: Analysis['blindSpot'];
  if (o.blindSpot && typeof o.blindSpot === 'object') {
    const title = String((o.blindSpot as { title?: unknown }).title ?? '').trim();
    const explanation = String((o.blindSpot as { explanation?: unknown }).explanation ?? '').trim();
    if (title && explanation) blindSpot = { title, explanation };
  }

  return {
    question: o.question,
    region: o.region as Analysis['region'],
    summary: o.summary.trim(),
    confidence,
    nodes,
    edges,
    effects,
    actions,
    blindSpot,
    dataProvenance: [],
  };
}

/** Soft completeness gaps — trigger repair, not fixture fallback. */
function completenessGaps(a: Analysis): string[] {
  const gaps: string[] = [];
  const sentences = a.summary
    .split(/[.!?]+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
  // Require real multi-sentence content (or a long enough paragraph as a stand-in)
  if (!a.summary || (sentences.length < 2 && a.summary.length < 140)) {
    gaps.push('summary — MUST be 2–3 plain sentences, non-empty');
  }
  if (a.nodes.length < 3) {
    gaps.push(
      `nodes — MUST have 3–6 items with label, domain, satellite source, metric, role (have ${a.nodes.length})`,
    );
  }
  if (a.edges.length < 2) {
    gaps.push(
      `edges — MUST have 2–5 items with lag, correlation, confidence, rationale (have ${a.edges.length})`,
    );
  }
  if (a.effects.length < 2) {
    gaps.push(
      `effects — MUST have at least 2 concrete real-world effects (have ${a.effects.length})`,
    );
  }
  if (a.actions.length < 3) {
    gaps.push(
      `actions — MUST have at least 3 concrete recommended actions (have ${a.actions.length})`,
    );
  }
  if (!a.blindSpot?.title || !a.blindSpot?.explanation) {
    gaps.push(
      'blindSpot — MUST always be present with non-empty title + explanation naming the most surprising valid discovered link',
    );
  }
  return gaps;
}

function provenanceFrom(discovery: DiscoveryResult): Analysis['dataProvenance'] {
  const seen = new Set<string>();
  const out: Analysis['dataProvenance'] = [];
  for (const s of discovery.signals) {
    if (seen.has(s.sourceId)) continue;
    seen.add(s.sourceId);
    out.push({
      sourceId: s.sourceId,
      satellite: SATELLITE_BY_SOURCE[s.sourceId] ?? s.sourceId,
    });
  }
  return out;
}

function finalize(
  parsed: Analysis,
  question: string,
  discovery: DiscoveryResult,
): Analysis {
  parsed.dataProvenance = provenanceFrom(discovery);
  parsed.question = question;
  parsed.region = discovery.region;
  return parsed;
}

export async function synthesize(question: string, discovery: DiscoveryResult): Promise<Analysis> {
  const client = getLlmClient();
  const prompt = buildPrompt(question, discovery);

  let raw = await client.complete(prompt);
  let parsed: Analysis | null = null;
  let firstErr: string | null = null;
  let gaps: string[] = [];

  try {
    parsed = finalize(validateAnalysis(extractJson(raw)), question, discovery);
    gaps = completenessGaps(parsed);
  } catch (err) {
    firstErr = err instanceof Error ? err.message : String(err);
  }

  // Single repair-retry: fix hard validation failures and/or missing completeness fields
  if (firstErr || gaps.length > 0) {
    const demands = [
      firstErr ? `Validation error: ${firstErr}` : null,
      gaps.length
        ? `These required fields were missing or empty — you MUST fill ALL of them with non-empty values:\n- ${gaps.join('\n- ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const repair = `${prompt}\n\nYour previous reply was incomplete or invalid.\n${demands}\n\nReturn ONLY corrected, complete JSON. Every required field must be non-empty.`;
    raw = await client.complete(repair);
    try {
      parsed = finalize(validateAnalysis(extractJson(raw)), question, discovery);
    } catch (retryErr) {
      // After retry: accept prior parse if we had one; otherwise surface the error
      if (!parsed) throw retryErr;
    }
  }

  if (!parsed) throw new Error('synthesize produced no analysis');
  return parsed;
}
