import React, { useState, useRef } from 'react';
import { Upload, FileType, Play, Loader2, FileText, MonitorPlay, CheckCircle2, ArrowRight, WifiOff, ShieldCheck } from 'lucide-react';
import { parseTsxToLayout } from './services/layoutEngine';
import { generatePDF, generatePPTX } from './services/generatorService';
import { DocumentLayout, ExportFormat, ProgressState, ErrorInfo, ExportOptions } from './types';
import { LayoutPreview } from './components/LayoutPreview';
import { ProgressIndicator } from './components/ProgressIndicator';
import { ErrorDisplay } from './components/ErrorDisplay';

function App() {
  const [tsxContent, setTsxContent] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [targetFormat, setTargetFormat] = useState<ExportFormat | null>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'preview' | 'error'>('idle');
  const [layout, setLayout] = useState<DocumentLayout | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [forceSinglePage, setForceSinglePage] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [quality, setQuality] = useState<ExportOptions['quality']>('standard');
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const readyToRender = Boolean(fileName && targetFormat);
  const slideSummary = layout ? `${layout.pages.length} page${layout.pages.length > 1 ? 's' : ''}` : 'No pages yet';

  const resetProgress = () => setProgress(null);

  const buildErrorInfo = (message: string): ErrorInfo => ({
    code: 'render-failed',
    message,
    suggestion: 'Ensure the file exports a valid React component and avoid imports that require network access.',
    canRetry: true,
  });

  const handleIncomingFile = (file: File) => {
    const allowed = ['.tsx', '.ts', '.jsx', '.js'];
    const lowerName = file.name.toLowerCase();
    const isAllowed = allowed.some((ext) => lowerName.endsWith(ext));

    if (!isAllowed) {
      setStatus('error');
      setErrorMsg(`Unsupported file type. Please drop a TSX/TS/JSX/JS file — received ${file.name || 'unknown'}.`);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTsxContent(event.target?.result as string);
      setStatus('idle');
      setLayout(null);
      setTargetFormat(null);
      resetProgress();
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleIncomingFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleIncomingFile(file);
  };

  const processFile = async () => {
    if (!tsxContent || !targetFormat) return;

    setStatus('analyzing');
    setErrorMsg('');
    setProgress({
      stage: 'transpiling',
      percent: 8,
      message: 'Compiling TSX locally with the bundled TypeScript compiler',
    });

    try {
      setProgress({
        stage: 'rendering',
        percent: 32,
        message: 'Mounting the component in a hidden 1280x720 stage',
      });
      const result = await parseTsxToLayout({
        content: tsxContent,
        format: targetFormat,
        sourceName: fileName,
        forceSinglePage,
      });
      setProgress({
        stage: 'extracting',
        percent: 78,
        message: 'Extracting text, images, and geometry from the DOM',
      });
      setLayout(result);
      setStatus('preview');
      setProgress({
        stage: 'extracting',
        percent: 100,
        message: 'Layout captured — ready to preview and export',
      });
      setTimeout(resetProgress, 700);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to render component. Check console for details.');
      setProgress(null);
    }
  };

  const handleDownload = async () => {
    if (!layout || !targetFormat) return;
    setIsExporting(true);
    setProgress({
      stage: 'generating',
      percent: 10,
      message: `Building a ${targetFormat} with ${quality} quality settings`,
    });

    const onProgress = (percent: number, message?: string) => {
      setProgress({
        stage: 'generating',
        percent,
        message: message || `Exporting ${targetFormat}…`,
      });
    };

    try {
      if (targetFormat === 'PDF') {
        await generatePDF(layout, { quality }, onProgress);
      } else {
        await generatePPTX(layout, { quality }, onProgress);
      }
      setProgress({
        stage: 'generating',
        percent: 100,
        message: 'Export finished — saving file locally',
      });
      setTimeout(resetProgress, 900);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err?.message || 'Failed to generate export.');
      setProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  const reset = () => {
    setStatus('idle');
    setLayout(null);
    setTargetFormat(null);
    setErrorMsg('');
    setForceSinglePage(false);
    setQuality('standard');
    setProgress(null);
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
            <div className="brand-subtitle">Convert TSX files to PDF or PPTX</div>
          </div>
        </div>

        <div className="badge">
          <ShieldCheck size={14} />
          Runs locally fully in your browser!
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
          <button
            className={`dropzone ${fileName ? 'dropzone-ready' : ''} ${isDragging ? 'dropzone-active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
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

          <div className="quality-row">
            <div className="quality-header">
              <div className="quality-title">Export quality</div>
              <div className="quality-subtitle">Pick a balance of fidelity and file size.</div>
            </div>
            <div className="quality-options">
              {(['draft', 'standard', 'high'] as ExportOptions['quality'][]).map((level) => (
                <button
                  key={level}
                  className={`quality-chip ${quality === level ? 'quality-chip-active' : ''}`}
                  onClick={() => setQuality(level)}
                  disabled={!fileName}
                >
                  <span className="quality-label">{level}</span>
                  <span className="quality-copy">
                    {level === 'draft' && 'Smaller file, softer images'}
                    {level === 'standard' && 'Balanced (default)'}
                    {level === 'high' && 'Sharpest images, larger file'}
                  </span>
                </button>
              ))}
            </div>
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

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={forceSinglePage}
              onChange={(e) => setForceSinglePage(e.target.checked)}
            />
            <div>
              <div className="toggle-title">Single slide mode</div>
              <div className="toggle-subtitle">Scale long content into one page instead of paginating.</div>
            </div>
          </label>

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
                  Start Rendering
                </>
              )}
            </button>
          ) : (
            <button className="primary success" onClick={handleDownload} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="spin" size={16} />
                  Exporting…
                </>
              ) : (
                <>
                  <ArrowRight size={16} />
                  Download {targetFormat}
                </>
              )}
            </button>
          )}

          {status === 'error' && (
            <ErrorDisplay
              error={buildErrorInfo(errorMsg)}
              onRetry={readyToRender && status !== 'analyzing' ? processFile : undefined}
            />
          )}
        </section>

        <div className="footer">
          <div className="footer-line">
            <WifiOff size={12} />
            Fully offline - nothing leaves this browser tab.
          </div>
          <div className="footer-line muted">Standard fonts (Segoe UI/Arial) are used to avoid missing glyphs.</div>
        </div>
      </aside>

      <main className="preview-shell">
        <header className="preview-header">
          <div>
            <div className="preview-eyebrow">Instant TSX visualizer</div>
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

        <div className="session-grid">
          <div className="session-card">
            <div className="session-label">File</div>
            <div className="session-value">{fileName || 'Drop a TSX/JSX file'}</div>
            <div className="session-hint">{readyToRender ? 'Loaded locally' : 'Nothing selected yet'}</div>
          </div>
          <div className="session-card">
            <div className="session-label">Target</div>
            <div className="session-value">{targetFormat || 'PDF or PPTX'}</div>
            <div className="session-hint">Stage: 1280x720 sandbox</div>
          </div>
          <div className="session-card">
            <div className="session-label">Quality</div>
            <div className="session-value">{quality}</div>
            <div className="session-hint">{forceSinglePage ? 'Forcing single slide' : 'Auto paginate'}</div>
          </div>
          <div className="session-card accent">
            <div className="session-label">Status</div>
            <div className="session-value">
              {status === 'preview' && layout
                ? slideSummary
                : status === 'analyzing'
                  ? 'Measuring layout…'
                  : 'Ready to render'}
            </div>
            <div className="session-hint">Offline • No network calls</div>
          </div>
        </div>

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

          {progress && <ProgressIndicator state={progress} />}

          {status === 'preview' && layout && <LayoutPreview layout={layout} />}
        </div>
      </main>
    </div>
  );
}

export default App;
