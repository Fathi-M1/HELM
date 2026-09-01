import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Analysis } from '../brain/contracts';
import {
  Sliders,
  Cpu,
  Download,
  CheckCircle2,
  FileJson,
  FileText,
} from 'lucide-react';

interface SettingsViewProps {
  analysis: Analysis | null;
}

function regionSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'region';
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/Helm-logo.png');
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return `data:image/png;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/** Normalize whitespace; rely on jsPDF splitTextToSize for wrapping (never stretch). */
function preparableText(text: string): string {
  return String(text ?? '')
    .replace(/\u2192/g, '->')          // arrow: NOT in base PDF font -> caused letter-spacing
    .replace(/[\u2190-\u21ff]/g, '-')  // any other arrows
    .replace(/[\u2013\u2014]/g, '-')   // en/em dash
    .replace(/[\u201c\u201d]/g, '"')   // curly double quotes
    .replace(/[\u2018\u2019]/g, "'")   // curly single quotes
    .replace(/[^\x00-\xff]/g, '')      // drop any remaining non-Latin1 glyphs the base font can't encode
    .replace(/\u00a0/g, ' ')   // nbsp -> normal space
    .replace(/\u200b/g, '')    // strip any stray zero-width spaces
    .replace(/\s+/g, ' ')      // collapse runs of whitespace
    .trim();
}

async function buildPdf(analysis: Analysis): Promise<{ filename: string; blob: Blob }> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - 2 * margin;
  const lineHeight = 15;
  let y = margin;

  doc.setCharSpace(0);

  /**
   * SINGLE text path for the entire report.
   * Every string on the page must go through here — no other doc.text calls.
   */
  const writeLine = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: [number, number, number]; gapAfter?: number },
  ) => {
    const size = opts?.size ?? 10;
    const gapAfter = opts?.gapAfter ?? 4;

    doc.setCharSpace(0);
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    if (opts?.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
    else doc.setTextColor(20, 30, 34);

    const lines = doc.splitTextToSize(preparableText(text), maxWidth) as string[];
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
        doc.setCharSpace(0);
      }
      // Left-align only — never justify, never letter-spacing
      doc.text(line, margin, y, { align: 'left' });
      y += lineHeight;
    }
    y += gapAfter;
  };

  const nodeLabel = (id: string) =>
    analysis.nodes.find((n) => n.id === id)?.label ?? id;

  const logo = await loadLogoDataUrl();
  if (logo) {
    try {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.addImage(logo, 'PNG', margin, y, 22, 22);
      y += 28;
    } catch {
      /* logo optional */
    }
  }

  writeLine('HELM Intelligence Report', {
    bold: true,
    size: 16,
    color: [2, 160, 160],
    gapAfter: 6,
  });
  writeLine(`Generated ${new Date().toISOString()}`, {
    size: 8,
    color: [100, 120, 120],
    gapAfter: 10,
  });

  writeLine('Question', { bold: true, size: 12, color: [2, 160, 160], gapAfter: 2 });
  writeLine(analysis.question, { bold: true, size: 11, gapAfter: 8 });

  writeLine('Region', { bold: true, size: 12, color: [2, 160, 160], gapAfter: 2 });
  writeLine(
    `${analysis.region.name} (${analysis.region.center.lat.toFixed(2)}, ${analysis.region.center.lon.toFixed(2)})`,
    { gapAfter: 8 },
  );

  writeLine('Confidence', { bold: true, size: 12, color: [2, 160, 160], gapAfter: 2 });
  writeLine(`${Math.round(Math.max(0, Math.min(1, analysis.confidence)) * 100)}%`, {
    gapAfter: 10,
  });

  if (analysis.summary.trim()) {
    writeLine('Summary', { bold: true, size: 12, color: [2, 160, 160], gapAfter: 2 });
    writeLine(analysis.summary, { gapAfter: 10 });
  }

  if (analysis.nodes.length > 0) {
    writeLine('Causal chain (nodes)', {
      bold: true,
      size: 12,
      color: [2, 160, 160],
      gapAfter: 2,
    });
    for (const n of analysis.nodes) {
      writeLine(`${n.label} · ${n.role} · ${n.source} · ${n.metric}`, { gapAfter: 4 });
    }
    y += 4;
  }

  if (analysis.edges.length > 0) {
    writeLine('Causal chain (edges)', {
      bold: true,
      size: 12,
      color: [2, 160, 160],
      gapAfter: 2,
    });
    for (const e of analysis.edges) {
      writeLine(
        `${nodeLabel(e.from)} → ${nodeLabel(e.to)} · ${e.lag} · r=${e.correlation.toFixed(2)} · ${e.rationale}`,
        { gapAfter: 4 },
      );
    }
    y += 4;
  }

  if (analysis.blindSpot?.title && analysis.blindSpot?.explanation) {
    writeLine('Blind Spot', { bold: true, size: 12, color: [2, 160, 160], gapAfter: 2 });
    writeLine(analysis.blindSpot.title, { bold: true, gapAfter: 2 });
    writeLine(analysis.blindSpot.explanation, { gapAfter: 10 });
  }

  if (analysis.effects.length > 0) {
    writeLine('Effects', { bold: true, size: 12, color: [2, 160, 160], gapAfter: 2 });
    for (const fx of analysis.effects) {
      writeLine(`• ${fx}`, { gapAfter: 4 });
    }
    y += 4;
  }

  if (analysis.actions.length > 0) {
    writeLine('Actions', { bold: true, size: 12, color: [2, 160, 160], gapAfter: 2 });
    for (const act of analysis.actions) {
      writeLine(`• ${act}`, { gapAfter: 4 });
    }
    y += 4;
  }

  if (analysis.dataProvenance.length > 0) {
    writeLine('Data provenance (missions)', {
      bold: true,
      size: 12,
      color: [2, 160, 160],
      gapAfter: 2,
    });
    for (const p of analysis.dataProvenance) {
      writeLine(`${p.satellite} (${p.sourceId})`, { gapAfter: 4 });
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `HELM-${regionSlug(analysis.region.name)}-${stamp}.pdf`;
  return { filename, blob: doc.output('blob') };
}

export const SettingsView: React.FC<SettingsViewProps> = ({ analysis }) => {
  const [shaderEnabled, setShaderEnabled] = useState(true);
  const [anomalyThreshold, setAnomalyThreshold] = useState('0.85');
  const [autoCorrelate, setAutoCorrelate] = useState(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasAnalysis = analysis != null;
  const slug = analysis ? regionSlug(analysis.region.name) : '';

  const flash = (msg: string) => {
    setExportNotice(msg);
    window.setTimeout(() => setExportNotice(null), 4000);
  };

  const handleDownloadJson = () => {
    if (!analysis) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `HELM-${slug}-${stamp}.json`;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], {
      type: 'application/json',
    });
    downloadBlob(filename, blob);
    flash(filename);
  };

  const handleDownloadPdf = async () => {
    if (!analysis) return;
    setBusy(true);
    try {
      const { filename, blob } = await buildPdf(analysis);
      downloadBlob(filename, blob);
      flash(filename);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'PDF export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] p-6 sm:p-10 max-w-7xl mx-auto z-10 space-y-8 select-none animate-fade-in">
      <div className="border-b border-[#1e313a]/50 pb-6">
        <h1 className="text-2xl sm:text-4xl font-light text-[#dee4e3] tracking-tight">
          System Calibration & Diagnostics
        </h1>
        <p className="text-xs sm:text-sm text-[#9ab3b2] mt-1 font-light">
          Configure Node α-04 planetary synthesis engine parameters, telemetry filter thresholds, and intelligence exports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#050d10] border border-[#1e313a] rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-mono-data text-[#dee4e3] uppercase tracking-wider font-semibold">
              <Cpu className="w-4 h-4 text-[#60d8d8]" />
              <span>Compute Node Cluster [Node α-04]</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono-data text-xs">
              <div className="p-4 bg-[#0a171c] rounded-2xl border border-[#1e313a]">
                <span className="text-[#6b8584] block text-[9px] uppercase">CPU Core Load</span>
                <span className="text-xl font-bold text-[#60d8d8]">24.2%</span>
                <div className="w-full bg-[#03080a] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#60d8d8] h-full w-1/4 rounded-full" />
                </div>
              </div>

              <div className="p-4 bg-[#0a171c] rounded-2xl border border-[#1e313a]">
                <span className="text-[#6b8584] block text-[9px] uppercase">Tensor VRAM</span>
                <span className="text-xl font-bold text-[#fcba62]">18.4 / 48 GB</span>
                <div className="w-full bg-[#03080a] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#fcba62] h-full w-2/5 rounded-full" />
                </div>
              </div>

              <div className="p-4 bg-[#0a171c] rounded-2xl border border-[#1e313a]">
                <span className="text-[#6b8584] block text-[9px] uppercase">Graph Convergence</span>
                <span className="text-xl font-bold text-[#dee4e3]">142 μs</span>
                <div className="w-full bg-[#03080a] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#02a0a0] h-full w-4/5 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#050d10] border border-[#1e313a] rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono-data text-[#dee4e3] uppercase tracking-wider font-semibold">
              <Sliders className="w-4 h-4 text-[#fcba62]" />
              <span>Autonomous Synthesis Engine Controls</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#0a171c] rounded-2xl border border-[#1e313a]">
                <div>
                  <h4 className="text-sm font-semibold text-[#dee4e3]">WebGL Planetary Simplex Shader</h4>
                  <p className="text-xs text-[#9ab3b2] font-light">Organic noise simulation rendering Earth telemetry pulses.</p>
                </div>
                <button
                  onClick={() => setShaderEnabled(!shaderEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    shaderEnabled ? 'bg-[#02a0a0]' : 'bg-[#1e313a]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 bg-[#dee4e3] rounded-full absolute top-1 transition-transform ${
                      shaderEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#0a171c] rounded-2xl border border-[#1e313a]">
                <div>
                  <h4 className="text-sm font-semibold text-[#dee4e3]">Anomaly Filter Threshold</h4>
                  <p className="text-xs text-[#9ab3b2] font-light">Suppress signal noise below standard deviation threshold.</p>
                </div>
                <select
                  value={anomalyThreshold}
                  onChange={(e) => setAnomalyThreshold(e.target.value)}
                  className="bg-[#03080a] text-xs font-mono-data text-[#60d8d8] px-3 py-2 border border-[#1e313a] rounded-xl outline-none"
                >
                  <option value="0.75">0.75 σ (Broad Sensitivity)</option>
                  <option value="0.85">0.85 σ (Recommended)</option>
                  <option value="0.95">0.95 σ (Strict Causality Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#0a171c] rounded-2xl border border-[#1e313a]">
                <div>
                  <h4 className="text-sm font-semibold text-[#dee4e3]">Autonomous Multi-Feed Auto-Correlation</h4>
                  <p className="text-xs text-[#9ab3b2] font-light">Continuously map correlations across agricultural and logistics feeds.</p>
                </div>
                <button
                  onClick={() => setAutoCorrelate(!autoCorrelate)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    autoCorrelate ? 'bg-[#02a0a0]' : 'bg-[#1e313a]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 bg-[#dee4e3] rounded-full absolute top-1 transition-transform ${
                      autoCorrelate ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#050d10] border border-[#1e313a] rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono-data text-[#dee4e3] uppercase tracking-wider font-semibold">
              <Download className="w-4 h-4 text-[#60d8d8]" />
              <span>Intelligence Dossier Compiler</span>
            </div>

            <p className="text-xs text-[#9ab3b2] leading-relaxed font-light">
              Export the current investigation as a PDF brief or raw Analysis JSON.
            </p>

            {!hasAnalysis && (
              <p className="text-[11px] font-mono-data text-[#fcba62]">
                Run an investigation first.
              </p>
            )}

            {hasAnalysis && (
              <p className="text-[10px] font-mono-data text-[#6b8584] line-clamp-2">
                Active: {analysis.question}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={!hasAnalysis || busy}
              className="w-full py-3 bg-[#02a0a0] hover:bg-[#60d8d8] disabled:opacity-40 disabled:hover:bg-[#02a0a0] disabled:cursor-not-allowed text-[#003737] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 font-mono-data shadow-lg shadow-[#02a0a0]/30"
            >
              <FileText className="w-4 h-4" />
              <span>{busy ? 'COMPILING PDF…' : 'DOWNLOAD PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              disabled={!hasAnalysis}
              className="w-full py-3 bg-[#0a171c] hover:bg-[#0f1d22] disabled:opacity-40 disabled:cursor-not-allowed text-[#60d8d8] border border-[#60d8d8]/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 font-mono-data"
            >
              <FileJson className="w-4 h-4" />
              <span>DOWNLOAD JSON</span>
            </button>

            {exportNotice && (
              <div className="p-3 bg-[#03080a] border border-[#60d8d8]/50 rounded-xl text-center text-xs font-mono-data text-[#60d8d8] animate-fade-in flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{exportNotice}</span>
              </div>
            )}
          </div>

          <div className="p-6 bg-[#050d10] border border-[#1e313a] rounded-3xl font-mono-data text-xs space-y-2.5 text-[#6b8584]">
            <div className="flex justify-between">
              <span>SYSTEM CORE</span>
              <span className="text-[#dee4e3]">HELM Planetary Core</span>
            </div>
            <div className="flex justify-between">
              <span>VERSION</span>
              <span className="text-[#60d8d8]">v3.0.0-INSTRUMENT</span>
            </div>
            <div className="flex justify-between">
              <span>SECURITY PROTOCOL</span>
              <span className="text-[#dee4e3]">TLS 1.3 / Quantum-Safe</span>
            </div>
            <div className="flex justify-between">
              <span>CLUSTER REGION</span>
              <span className="text-[#dee4e3]">EU-CENTRAL-01</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
