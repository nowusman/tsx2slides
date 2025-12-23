import React, { useState, useRef } from 'react';
import { Upload, FileType, Play, Loader2, FileText, MonitorPlay, AlertCircle, CheckCircle2, ArrowRight, WifiOff, ShieldCheck } from 'lucide-react';
import { parseTsxToLayout } from './services/layoutEngine';
import { generatePDF, generatePPTX } from './services/generatorService';
import { DocumentLayout, ExportFormat } from './types';
import { LayoutPreview } from './components/LayoutPreview';

function App() {
  const [tsxContent, setTsxContent] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<ExportFormat | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'preview' | 'error'>('idle');
  const [layout, setLayout] = useState<DocumentLayout | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const readyToRender = Boolean(fileName && targetFormat);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTsxContent(event.target?.result as string);
      setStatus('idle');
      setLayout(null);
      setTargetFormat(null);
    };
    reader.readAsText(file);
  };

  const processFile = async () => {
    if (!tsxContent || !targetFormat) return;

    setStatus('analyzing');
    setErrorMsg('');

    try {
      const result = await parseTsxToLayout({
        content: tsxContent,
        format: targetFormat,
        sourceName: fileName,
      });
      setLayout(result);
      setStatus('preview');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to render component. Check console for details.');
    }
  };

  const handleDownload = () => {
    if (!layout || !targetFormat) return;
    if (targetFormat === 'PDF') {
      generatePDF(layout);
    } else {
      generatePPTX(layout);
    }
  };

  const reset = () => {
    setStatus('idle');
    setLayout(null);
    setTargetFormat(null);
    setErrorMsg('');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <FileText size={18} />
          </div>
          <div>
            <div className="brand-title">TSX to Slides</div>
            <div className="brand-subtitle">100% offline rendering</div>
          </div>
        </div>

        <div className="badge">
          <ShieldCheck size={14} />
          Runs locally — no network or AI calls.
        </div>

        <section className="panel">
          <header className="panel-header">
            <span className="step">1</span>
            <div>
              <div className="panel-title">Add a TSX/JSX file</div>
              <div className="panel-subtitle">Components render inside a sandboxed 1280x720 stage.</div>
            </div>
          </header>
          <input type="file" accept=".tsx,.ts,.jsx,.js" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
          <button className={`dropzone ${fileName ? 'dropzone-ready' : ''}`} onClick={() => fileInputRef.current?.click()}>
            {fileName ? (
              <>
                <CheckCircle2 size={18} />
                <span className="truncate">{fileName}</span>
              </>
            ) : (
              <>
                <Upload size={18} />
                <div>
                  <div className="dropzone-title">Upload a TSX component</div>
                  <div className="dropzone-subtitle">We read it locally and never send it anywhere.</div>
                </div>
              </>
            )}
          </button>
        </section>

        <section className="panel">
          <header className="panel-header">
            <span className="step">2</span>
            <div>
              <div className="panel-title">Choose output</div>
              <div className="panel-subtitle">Vector-friendly PDF or editable PPTX.</div>
            </div>
          </header>
          <div className="option-row">
            <button className={`option ${targetFormat === 'PDF' ? 'option-active' : ''}`} onClick={() => setTargetFormat('PDF')} disabled={!fileName}>
              <FileType size={16} />
              <span>PDF</span>
            </button>
            <button className={`option ${targetFormat === 'PPTX' ? 'option-active' : ''}`} onClick={() => setTargetFormat('PPTX')} disabled={!fileName}>
              <Play size={16} />
              <span>PPTX</span>
            </button>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <span className="step">3</span>
            <div>
              <div className="panel-title">Render & export</div>
              <div className="panel-subtitle">We transpile TSX with the embedded TypeScript compiler.</div>
            </div>
          </header>

          {status !== 'preview' ? (
            <button className="primary" onClick={processFile} disabled={!readyToRender || status === 'analyzing'}>
              {status === 'analyzing' ? (
                <>
                  <Loader2 className="spin" size={16} />
                  Measuring layout…
                </>
              ) : (
                <>
                  <MonitorPlay size={16} />
                  Render offline
                </>
              )}
            </button>
          ) : (
            <button className="primary success" onClick={handleDownload}>
              <ArrowRight size={16} />
              Download {targetFormat}
            </button>
          )}

          {status === 'error' && (
            <div className="error">
              <AlertCircle size={16} />
              <div>
                <div className="error-title">Couldn&apos;t render the component</div>
                <div className="error-copy">{errorMsg}</div>
              </div>
            </div>
          )}
        </section>

        <div className="footer">
          <div className="footer-line">
            <WifiOff size={12} />
            Offline mode locked — nothing leaves this browser tab.
          </div>
          <div className="footer-line muted">Standard fonts (Segoe UI/Arial) are used to avoid missing glyphs.</div>
        </div>
      </aside>

      <main className="preview-shell">
        <header className="preview-header">
          <div>
            <div className="preview-title">Layout capture</div>
            <div className="preview-subtitle">
              {status === 'preview' && layout ? `${layout.pages.length} page(s) ready` : 'Awaiting a TSX component'}
            </div>
          </div>
          <div className="preview-actions">
            <button className="ghost" onClick={reset}>
              Reset
            </button>
            {layout && targetFormat && (
              <button className="ghost" onClick={handleDownload}>
                Download {targetFormat}
              </button>
            )}
          </div>
        </header>

        <div className="preview-area">
          {status === 'idle' && (
            <div className="empty">
              <div className="empty-icon">
                <Upload size={22} />
              </div>
              <div className="empty-title">Drop in a TSX/JSX file to start</div>
              <div className="empty-copy">
                We transpile with TypeScript, render the component in a hidden 1280x720 surface, and map every visible text and shape before
                generating export-friendly vectors.
              </div>
            </div>
          )}

          {status === 'analyzing' && (
            <div className="empty">
              <div className="spinner">
                <Loader2 className="spin" size={20} />
              </div>
              <div className="empty-title">Compiling & measuring layout…</div>
              <div className="empty-copy">No AI or cloud calls — just DOM geometry and the embedded TypeScript compiler.</div>
            </div>
          )}

          {status === 'preview' && layout && <LayoutPreview layout={layout} />}
        </div>
      </main>
    </div>
  );
}

export default App;
