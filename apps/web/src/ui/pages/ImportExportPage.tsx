import { useMemo, useState } from 'react';
import { api, getToken } from '../../api/client';

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ImportExportPage() {
  const [exportPromptId, setExportPromptId] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [importMode, setImportMode] = useState<'merge' | 'create'>('merge');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);

  const canImport = useMemo(() => importText.trim().length > 0, [importText]);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Import / Export</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          style={{
            border: '1px solid #eee',
            background: '#fff',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Export</h2>
          <div style={{ color: '#666', fontSize: 12 }}>
            Enter a prompt ID to export its bundle as JSON.
          </div>

          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            <input
              placeholder="Prompt ID"
              value={exportPromptId}
              onChange={(e) => setExportPromptId(e.target.value)}
            />

            {exportError ? (
              <div style={{ color: 'crimson' }}>{exportError}</div>
            ) : null}

            <button
              disabled={exporting || exportPromptId.trim().length === 0}
              onClick={async () => {
                setExportError(null);
                setExporting(true);
                try {
                  const data = await api.exportPrompt(exportPromptId.trim());
                  downloadJson(`prompt-${exportPromptId.trim()}.json`, data);
                } catch (e: any) {
                  setExportError(e?.error?.message || 'Export failed');
                } finally {
                  setExporting(false);
                }
              }}
            >
              {exporting ? 'Exporting…' : 'Download JSON'}
            </button>
          </div>
        </div>

        <div
          style={{
            border: '1px solid #eee',
            background: '#fff',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Import</h2>
          {!getToken() ? (
            <div style={{ color: '#666' }}>Login to import bundles.</div>
          ) : (
            <>
              <div style={{ color: '#666', fontSize: 12 }}>
                Paste a JSON bundle and import.
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                <div style={{ color: '#666', fontSize: 12 }}>Mode</div>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                >
                  <option value="merge">merge</option>
                  <option value="create">create</option>
                </select>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={14}
                style={{
                  width: '100%',
                  marginTop: 10,
                  fontFamily:
                    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                }}
                placeholder="{ ...bundle json... }"
              />

              {importError ? (
                <div style={{ marginTop: 10, color: 'crimson' }}>
                  {importError}
                </div>
              ) : null}
              {importOk ? (
                <div style={{ marginTop: 10, color: 'green' }}>{importOk}</div>
              ) : null}

              <button
                style={{ marginTop: 10 }}
                disabled={importing || !canImport}
                onClick={async () => {
                  setImportError(null);
                  setImportOk(null);
                  setImporting(true);
                  try {
                    const bundle = JSON.parse(importText);
                    const result = await api.importPrompt({
                      bundle,
                      mode: importMode,
                    });
                    setImportOk(`Imported prompt: ${result?.id || 'OK'}`);
                  } catch (e: any) {
                    if (e instanceof SyntaxError) {
                      setImportError('Invalid JSON');
                    } else {
                      setImportError(e?.error?.message || 'Import failed');
                    }
                  } finally {
                    setImporting(false);
                  }
                }}
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
