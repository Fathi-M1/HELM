import React, { useEffect, useRef, useState } from 'react';
import { Analysis } from '../brain/contracts';
import { RealMapView, RealMapViewHandle } from './RealMapView';
import {
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface InvestigationsViewProps {
  currentQuery?: string;
  analysis: Analysis | null;
  status: 'idle' | 'loading' | 'ready';
  onNavigateToEvidence: (caseId?: string) => void;
}

export const InvestigationsView: React.FC<InvestigationsViewProps> = ({
  currentQuery,
  analysis,
  status,
  onNavigateToEvidence,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [graphMode, setGraphMode] = useState<'causality' | 'anomaly' | 'correlation'>('causality');
  const mapRef = useRef<RealMapViewHandle>(null);

  useEffect(() => {
    if (!analysis?.nodes.length) return;
    setSelectedNodeId((prev) => {
      if (prev && analysis.nodes.some((n) => n.id === prev)) return prev;
      return analysis.nodes.find((n) => n.role === 'mechanism')?.id ?? analysis.nodes[0].id;
    });
  }, [analysis]);

  const selectedNode = analysis?.nodes.find((n) => n.id === selectedNodeId) ?? analysis?.nodes[0];

  if (status === 'loading') {
    return (
      <div className="relative w-full h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#071317]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#60d8d8]/40 border-t-[#60d8d8] animate-spin" />
          <p className="text-sm font-mono-data text-[#60d8d8] tracking-wider uppercase">
            Downlinking multi-satellite signals…
          </p>
          <p className="text-xs text-[#9ab3b2] max-w-sm mx-auto">
            {currentQuery || 'Fusing orbital EO feeds and discovering cross-domain links'}
          </p>
        </div>
      </div>
    );
  }

  if (!analysis || status === 'idle') {
    return (
      <div className="relative w-full h-[calc(100vh-3.5rem)] flex items-center justify-center bg-[#071317]">
        <div className="text-center space-y-2 max-w-md px-6">
          <p className="text-sm font-mono-data text-[#9ab3b2] tracking-wider uppercase">
            No active investigation
          </p>
          <p className="text-xs text-[#6b8584]">
            Ask a question on Discover — try &ldquo;Why is there flooding in the Philippines?&rdquo;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col justify-between select-none bg-[#071317]">
      <RealMapView
        ref={mapRef}
        analysis={analysis}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
      />

      <div className="relative z-20 m-6 flex flex-wrap items-center justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center bg-[#050d10]/90 backdrop-blur-xl border border-[#1e313a] rounded-xl p-1 shadow-2xl">
          {(['causality', 'anomaly', 'correlation'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setGraphMode(mode)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono-data font-semibold transition-all ${
                graphMode === mode ? 'bg-[#02a0a0] text-[#003737] shadow-md' : 'text-[#9ab3b2] hover:text-[#dee4e3]'
              }`}
            >
              {mode === 'causality' ? 'Causality Vectors' : mode === 'anomaly' ? 'Anomaly Field' : 'Transmission Matrix'}
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#050d10]/90 backdrop-blur-xl border border-[#1e313a] rounded-xl p-1 shadow-2xl">
          <button
            onClick={() => mapRef.current?.resetView()}
            className="px-3 py-1.5 rounded-lg text-xs font-mono-data font-semibold flex items-center gap-1.5 transition-all bg-[#fcba62] text-[#003737] shadow-[0_0_12px_rgba(252,186,98,0.4)]"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Replay Dive</span>
          </button>
          <div className="h-4 w-px bg-[#1e313a] mx-1" />
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-1.5 text-[#9ab3b2] hover:text-[#dee4e3] hover:bg-[#0f1d22] rounded-lg"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-1.5 text-[#9ab3b2] hover:text-[#dee4e3] hover:bg-[#0f1d22] rounded-lg"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapRef.current?.resetView()}
            className="p-1.5 text-[#9ab3b2] hover:text-[#dee4e3] hover:bg-[#0f1d22] rounded-lg"
            title="Reset Frame"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative z-20 mx-6 mb-6 flex flex-col lg:flex-row items-end justify-between gap-6 pointer-events-none">
        <div className="pointer-events-auto max-w-sm w-full bg-[#050d10]/95 backdrop-blur-2xl border border-[#1e313a] rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e313a]/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#60d8d8] animate-ping" />
              <span className="text-[10px] font-mono-data uppercase tracking-widest text-[#60d8d8] font-bold">
                ACTIVE INQUIRY
              </span>
            </div>
            <span className="text-[10px] font-mono-data text-[#6b8584]">
              {(analysis.confidence * 100).toFixed(0)}% CONF
            </span>
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#dee4e3] leading-snug">
              {currentQuery || analysis.question}
            </h2>
            <p className="text-xs text-[#9ab3b2] mt-1.5 font-light leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono-data">
              <span className="text-[#9ab3b2]">Synthesis Convergence</span>
              <span className="text-[#60d8d8] font-bold">{(analysis.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[#0f1d22] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#02a0a0] to-[#60d8d8] h-full rounded-full"
                style={{ width: `${Math.round(analysis.confidence * 100)}%` }}
              />
            </div>
          </div>

          {selectedNode && (
            <div className="p-3 bg-[#0a171c] rounded-xl border border-[#1e313a] space-y-2 font-mono-data text-xs">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#6b8584] uppercase">INSPECTED NODE</span>
                <span className="text-[#fcba62]">{selectedNode.role}</span>
              </div>
              <div className="text-sm font-bold text-[#dee4e3]">{selectedNode.label}</div>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#02a0a0]/15 border border-[#60d8d8]/35">
                <span className="text-[9px] uppercase tracking-wider text-[#6b8584]">Satellite</span>
                <span className="text-[11px] font-bold text-[#60d8d8]">{selectedNode.source}</span>
              </div>
              <div className="text-[11px] text-[#9ab3b2]">Metric: {selectedNode.metric}</div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-[10px] font-mono-data uppercase tracking-wider text-[#6b8584]">Effects</div>
            <ul className="space-y-1.5">
              {analysis.effects.map((e, i) => (
                <li key={i} className="text-[11px] text-[#9ab3b2] leading-snug flex gap-2">
                  <span className="text-[#60d8d8] shrink-0">▸</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pointer-events-auto max-w-md w-full bg-[#050d10]/95 backdrop-blur-2xl border border-[#fcba62]/40 rounded-2xl p-5 shadow-2xl space-y-4">
          {analysis.blindSpot && (
            <>
              <div>
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#fcba62]/15 border border-[#fcba62]/30 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-[#fcba62]" />
                  <span className="text-[10px] font-mono-data text-[#fcba62] font-bold uppercase tracking-wider">
                    Blind Spot
                  </span>
                </div>
                <span className="text-[10px] font-mono-data text-[#6b8584]">CROSS-DOMAIN</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#dee4e3] leading-snug">{analysis.blindSpot.title}</h3>
                <p className="text-xs text-[#9ab3b2] mt-1.5 leading-relaxed font-light">
                  {analysis.blindSpot.explanation}
                </p>
              </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <div className="text-[10px] font-mono-data uppercase tracking-wider text-[#6b8584]">Recommended Actions</div>
            <ul className="space-y-1.5">
              {analysis.actions.map((a, i) => (
                <li key={i} className="text-[11px] text-[#dee4e3] leading-snug flex gap-2">
                  <span className="text-[#fcba62] shrink-0">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => onNavigateToEvidence('flood-case')}
            className="w-full py-3 px-4 bg-[#02a0a0] hover:bg-[#60d8d8] text-[#003737] font-bold text-xs font-mono-data rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#02a0a0]/30 active:scale-98 group"
          >
            <span>INSPECT EVIDENCE DOSSIER & PROOFS</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
