import { DiscoveryResult } from '../contracts';

export function buildPrompt(question: string, discovery: DiscoveryResult): string {
  const signalSummaries = discovery.signals.map((s) => ({
    id: s.id,
    domain: s.domain,
    label: s.label,
    unit: s.unit,
    sourceId: s.sourceId,
    anomaly: s.anomaly ?? null,
    points: s.series.length,
    latest: s.series.length ? s.series[s.series.length - 1] : null,
  }));

  const linkSummaries = discovery.links.map((l) => {
    const from = discovery.signals.find((s) => s.id === l.fromSignalId);
    const to = discovery.signals.find((s) => s.id === l.toSignalId);
    return {
      fromSignalId: l.fromSignalId,
      toSignalId: l.toSignalId,
      fromLabel: from?.label ?? l.fromSignalId,
      toLabel: to?.label ?? l.toSignalId,
      fromDomain: from?.domain,
      toDomain: to?.domain,
      correlation: l.correlation,
      bestLagDays: l.bestLagDays,
      sampleSize: l.sampleSize,
      surprise: l.surprise,
      score: l.score,
    };
  });

  return `You are a satellite Earth-observation intelligence analyst. You are given a question, a set of real observed signals, and a set of statistically discovered candidate links between them. Your job: (1) select which links are genuinely causal vs coincidental, (2) assign direction, confidence, and a plain-language rationale, (3) describe concrete real-world effects, (4) recommend concrete actions, (5) identify the single most surprising-yet-valid connection as the 'blind spot'.

HARD RULE: You may ONLY use nodes/links derived from the provided signals and candidate links. Do NOT introduce any connection not supported by the provided data. If evidence is weak, say so and lower confidence.

Respond with ONLY valid JSON matching this schema (field names exact):
{
  "question": string,
  "region": { "name": string, "center": { "lat": number, "lon": number } },
  "summary": string,
  "confidence": number,
  "nodes": [{ "id": string, "label": string, "domain": string, "source": string, "metric": string, "role": "cause"|"mechanism"|"amplifier"|"effect", "signalId"?: string }],
  "edges": [{ "from": string, "to": string, "lag": string, "correlation": number, "confidence": number, "rationale": string }],
  "effects": string[],
  "actions": string[],
  "blindSpot": { "title": string, "explanation": string },
  "dataProvenance": [{ "sourceId": string, "satellite": string }]
}

COMPLETE ANALYSIS IS MANDATORY — every field below MUST be present and non-empty. Incomplete JSON is a failure:
- summary: ALWAYS 2–3 plain sentences a non-expert understands. Never empty.
- confidence: ALWAYS a number from 0 to 1.
- nodes: ALWAYS 3–6 items. Each MUST include non-empty label, domain, source (satellite/mission name), metric, and role.
- edges: ALWAYS 2–5 items grounded in the candidate links. Each MUST include lag, correlation, confidence (0..1), and a plain-language rationale.
- effects: ALWAYS at least 2 concrete real-world effects (what is happening on the ground). Never empty.
- actions: ALWAYS at least 3 concrete recommended actions. Never empty.
- blindSpot: ALWAYS present with non-empty title AND explanation. Name the single most surprising yet valid discovered link (there is always at least one candidate link — pick the highest-surprise valid one). Never omit blindSpot.
- dataProvenance: list the missions/sources used for this answer.

Region context: ${JSON.stringify(discovery.region)}
Time window: ${JSON.stringify(discovery.window)}

Question: ${question}

Observed signals:
${JSON.stringify(signalSummaries, null, 2)}

Discovered candidate links (from the deterministic engine — these are the ONLY allowed connections):
${JSON.stringify(linkSummaries, null, 2)}

Rules for the JSON:
- Every edge.from and edge.to MUST be an id present in nodes.
- Prefer 3–6 nodes and 2–5 edges grounded in the candidate links.
- For each node's "source" field, name the real originating satellite / mission where the signal is derived from (be truthful that feeds may be reanalysis or model-assimilated products):
  · rainfall / precipitation → "GPM/IMERG (derived)"
  · aerosols / PM2.5 / AOD → "Sentinel-5P TROPOMI / CAMS (derived)"
  · soil moisture → "SMAP / Sentinel-1 (derived)"
  · events / disaster reports → "NASA EONET (derived)"
  · optical imagery / land cover context → "Sentinel-2 / Landsat (derived)"
  · temperature → "ERA5 (satellite-assimilated)"
- Omit markdown. JSON only.`;
}
