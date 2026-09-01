import React, { useEffect, useMemo, useState } from 'react';
import {
  Analysis,
  AnalysisEdge,
  AnalysisNode,
  NodeRole,
} from '../brain/contracts';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  ListChecks,
  Sparkles,
} from 'lucide-react';

type AnalysisStatus = 'idle' | 'loading' | 'ready';

interface EvidenceViewProps {
  analysis: Analysis | null;
  status: AnalysisStatus;
  onBackToGraph?: () => void;
}

const ROLE_ORDER: NodeRole[] = ['cause', 'mechanism', 'amplifier', 'effect'];

const ROLE_LABEL: Record<NodeRole, string> = {
  cause: 'Cause',
  mechanism: 'Mechanism',
  amplifier: 'Amplifier',
  effect: 'Effect',
};

function orderByRole(nodes: AnalysisNode[]): AnalysisNode[] {
  return [...nodes].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );
}

/** Prefer edge from the previous trail step; else any inbound edge. */
function connectingEdge(
  node: AnalysisNode,
  ordered: AnalysisNode[],
  edges: AnalysisEdge[],
): AnalysisEdge | undefined {
  const idx = ordered.findIndex((n) => n.id === node.id);
  if (idx > 0) {
    const prevId = ordered[idx - 1].id;
    const fromPrev = edges.find((e) => e.from === prevId && e.to === node.id);
    if (fromPrev) return fromPrev;
  }
  return edges.find((e) => e.to === node.id);
}

const IDLE_COPY =
  'No active investigation — ask a question on Portal first.';

export const EvidenceView: React.FC<EvidenceViewProps> = ({
  analysis,
  status,
  onBackToGraph,
}) => {
  const ordered = useMemo(
    () => (analysis ? orderByRole(analysis.nodes) : []),
    [analysis],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!ordered.length) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) =>
      prev && ordered.some((n) => n.id === prev) ? prev : ordered[0].id,
    );
  }, [ordered]);

  const selected = ordered.find((n) => n.id === selectedId) ?? ordered[0];
  const selectedEdge =
    selected && analysis
      ? connectingEdge(selected, ordered, analysis.edges)
      : undefined;

  if (status === 'loading') {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-[#60d8d8]/40 border-t-[#60d8d8] animate-spin" />
          <p className="text-sm font-mono-data text-[#60d8d8] tracking-wider uppercase">
            Assembling case file…
          </p>
        </div>
      </div>
    );
  }

  if (!analysis || status === 'idle') {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-md">
          {onBackToGraph && (
            <button
              onClick={onBackToGraph}
              className="mx-auto mb-2 p-2 rounded-xl bg-[#0a171c] hover:bg-[#0f1d22] border border-[#1e313a] text-[#9ab3b2] hover:text-[#dee4e3] transition-colors"
              title="Return to graph"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <p className="text-sm font-mono-data text-[#9ab3b2] tracking-wider uppercase">
            Case File
          </p>
          <p className="text-xs text-[#6b8584]">{IDLE_COPY}</p>
        </div>
      </div>
    );
  }

  const confidencePct = Math.round(Math.max(0, Math.min(1, analysis.confidence)) * 100);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] p-6 sm:p-10 max-w-7xl mx-auto z-10 space-y-8 select-none animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1e313a]/50 pb-5">
        <div className="flex items-center gap-3">
          {onBackToGraph && (
            <button
              onClick={onBackToGraph}
              className="p-2 rounded-xl bg-[#0a171c] hover:bg-[#0f1d22] border border-[#1e313a] text-[#9ab3b2] hover:text-[#dee4e3] transition-colors"
              title="Return to Graph Instrument"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#60d8d8]" />
            <span className="text-xs font-semibold font-mono-data uppercase text-[#dee4e3]">
              Case File
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-[#0a171c] border border-[#1e313a] rounded-xl">
          <span className="text-[10px] font-mono-data text-[#6b8584]">CONFIDENCE</span>
          <span className="text-xs font-mono-data text-[#60d8d8] font-bold">
            {confidencePct}%
          </span>
          <span className="w-2 h-2 rounded-full bg-[#60d8d8] animate-ping" />
        </div>
      </div>

      <div className="bg-[#050d10]/90 backdrop-blur-xl border border-[#1e313a] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#fcba62]/10 border border-[#fcba62]/30 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#fcba62]" />
            <span className="text-[10px] font-mono-data uppercase tracking-wider text-[#fcba62] font-bold">
              Verified Case File
            </span>
          </div>
          <span className="text-xs font-mono-data text-[#9ab3b2]">
            REGION · {analysis.region.name}
          </span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-light text-[#dee4e3] max-w-4xl leading-tight">
          {analysis.question}
        </h1>
        <p className="text-sm text-[#9ab3b2] font-light leading-relaxed max-w-3xl">
          {analysis.summary}
        </p>
        <div className="pt-2 text-[11px] font-mono-data text-[#6b8584]">
          {analysis.region.name} · {analysis.region.center.lat.toFixed(2)},{' '}
          {analysis.region.center.lon.toFixed(2)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#60d8d8]" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-[#dee4e3] font-mono-data">
              Evidence trail · causal sequence
            </h2>
          </div>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-[#1e313a]">
            {ordered.map((node) => {
              const isSelected = selected?.id === node.id;
              const edge = connectingEdge(node, ordered, analysis.edges);
              const isAmplifier = node.role === 'amplifier';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedId(node.id)}
                  className={`relative pl-12 transition-all cursor-pointer group ${
                    isSelected ? 'scale-[1.01]' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`absolute left-3.5 top-5 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      isSelected
                        ? 'bg-[#60d8d8] border-[#071317] ring-4 ring-[#60d8d8]/30'
                        : isAmplifier
                          ? 'bg-[#fcba62] border-[#071317]'
                          : 'bg-[#0f1d22] border-[#1e313a]'
                    }`}
                  />

                  <div
                    className={`p-5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-[#0a171c] border-[#60d8d8]/60 shadow-[0_0_25px_rgba(2,160,160,0.15)]'
                        : 'bg-[#0a171c]/70 border-[#1e313a]/50 hover:border-[#1e313a]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-xs font-mono-data flex-wrap">
                        <span className="font-bold text-[#fcba62] uppercase">
                          {ROLE_LABEL[node.role]}
                        </span>
                        <span className="text-[#1e313a]">·</span>
                        <span className="text-[#6b8584] uppercase">{node.domain}</span>
                      </div>
                      <span className="px-2.5 py-0.5 text-[10px] font-mono-data bg-[#0f1d22] text-[#60d8d8] border border-[#1e313a] rounded-md font-semibold shrink-0">
                        {node.metric}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-[#dee4e3] mb-1.5">
                      {node.label}
                    </h3>
                    <p className="text-[11px] font-mono-data text-[#60d8d8] mb-2">
                      {node.source}
                    </p>

                    {edge && (
                      <div className="mt-3 p-3 bg-[#050d10] rounded-xl border border-[#1e313a] space-y-1.5">
                        <p className="text-xs text-[#9ab3b2] leading-relaxed font-light">
                          {edge.rationale}
                        </p>
                        <div className="flex flex-wrap gap-3 text-[10px] font-mono-data text-[#6b8584]">
                          <span>LAG {edge.lag}</span>
                          <span>r = {edge.correlation.toFixed(2)}</span>
                          <span>
                            LINK CONF {Math.round(edge.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="p-5 bg-[#050d10]/90 border border-[#1e313a] rounded-2xl space-y-2">
              <span className="text-[10px] font-mono-data text-[#6b8584] uppercase tracking-wider">
                Selected step detail
              </span>
              <h3 className="text-sm font-semibold text-[#dee4e3]">{selected.label}</h3>
              <p className="text-xs text-[#9ab3b2]">
                {ROLE_LABEL[selected.role]} · {selected.domain} · {selected.source} ·{' '}
                {selected.metric}
              </p>
              {selectedEdge && (
                <p className="text-xs text-[#9ab3b2] leading-relaxed font-light pt-1">
                  {selectedEdge.rationale}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {analysis.blindSpot && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#fcba62]" />
                <h2 className="text-xs font-semibold tracking-wider uppercase text-[#dee4e3] font-mono-data">
                  Blind Spot
                </h2>
              </div>
              <div className="p-5 bg-[#fcba62]/08 border border-[#fcba62]/40 rounded-2xl space-y-2 shadow-[0_0_30px_rgba(252,186,98,0.08)]">
                <h4 className="text-sm font-semibold text-[#fcba62]">
                  {analysis.blindSpot.title}
                </h4>
                <p className="text-xs text-[#9ab3b2] leading-relaxed font-light">
                  {analysis.blindSpot.explanation}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#60d8d8]" />
              <h2 className="text-xs font-semibold tracking-wider uppercase text-[#dee4e3] font-mono-data">
                Effects
              </h2>
            </div>
            <ul className="space-y-2">
              {analysis.effects.map((effect, i) => (
                <li
                  key={`fx-${i}`}
                  className="p-3.5 bg-[#050d10]/90 border border-[#1e313a] rounded-xl text-xs text-[#9ab3b2] leading-relaxed font-light"
                >
                  {effect}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#60d8d8]" />
              <h2 className="text-xs font-semibold tracking-wider uppercase text-[#dee4e3] font-mono-data">
                Recommended actions
              </h2>
            </div>
            <ul className="space-y-2">
              {analysis.actions.map((action, i) => (
                <li
                  key={`act-${i}`}
                  className="p-3.5 bg-[#050d10]/90 border border-[#1e313a] rounded-xl text-xs text-[#9ab3b2] leading-relaxed font-light"
                >
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
