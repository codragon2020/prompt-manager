import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { api, getToken } from '../../api/client';
import { extractVariables, renderTemplate } from '../lib/renderPrompt';

type PromptDetail = Awaited<ReturnType<typeof api.getPrompt>>;

type VarRow = {
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  required: boolean;
  defaultValue?: string;
};

export function VersionEditorPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  const promptId = params.promptId || '';
  const fromVersionId = searchParams.get('from') || '';

  const [data, setData] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState('');
  const [modelName, setModelName] = useState('');
  const [temperature, setTemperature] = useState('');
  const [maxTokens, setMaxTokens] = useState('');
  const [topP, setTopP] = useState('');
  const [notes, setNotes] = useState('');

  const [variables, setVariables] = useState<VarRow[]>([]);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

  const baseVersion = useMemo(() => {
    if (!data) return null;
    if (fromVersionId)
      return data.versions.find((v) => v.id === fromVersionId) || null;
    return data.versions[0] || null;
  }, [data, fromVersionId]);

  useEffect(() => {
    if (!promptId) return;
    setLoading(true);
    setError(null);
    api
      .getPrompt(promptId)
      .then((d) => {
        setData(d);
        const base = fromVersionId
          ? d.versions.find((v) => v.id === fromVersionId)
          : d.versions[0];
        const v = base || d.versions[0];
        if (v) {
          setContent(v.content || '');
          setModelName(v.modelName || '');
          setTemperature(
            v.temperature === null || v.temperature === undefined
              ? ''
              : String(v.temperature),
          );
          setMaxTokens(
            v.maxTokens === null || v.maxTokens === undefined
              ? ''
              : String(v.maxTokens),
          );
          setTopP(
            v.topP === null || v.topP === undefined ? '' : String(v.topP),
          );
          setNotes('');
          setVariables(
            (v.variables || []).map((vv) => ({
              name: vv.name,
              type: (vv.type as any) || 'STRING',
              required: vv.required,
              defaultValue: vv.defaultValue || undefined,
            })),
          );
        }
      })
      .catch((e: any) => setError(e?.error?.message || 'Failed to load prompt'))
      .finally(() => setLoading(false));
  }, [promptId, fromVersionId]);

  const templateVars = useMemo(() => extractVariables(content), [content]);

  const rendered = useMemo(
    () => renderTemplate(content, previewVars),
    [content, previewVars],
  );

  const missingPreview = useMemo(() => {
    const missing: string[] = [];
    for (const v of templateVars) {
      if (!previewVars[v] || previewVars[v].trim().length === 0)
        missing.push(v);
    }
    return missing;
  }, [templateVars, previewVars]);

  if (!promptId) {
    return <div style={{ padding: 24 }}>Missing promptId</div>;
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>New Version</h1>
          <div style={{ color: '#666', marginTop: 6 }}>
            Base: {baseVersion ? `v${baseVersion.version}` : '—'}
          </div>
        </div>
        <div>
          <Link to={`/prompts/${promptId}`}>Back to prompt</Link>
        </div>
      </div>

      {loading ? <div style={{ marginTop: 12 }}>Loading…</div> : null}
      {error ? (
        <div style={{ marginTop: 12, color: 'crimson' }}>{error}</div>
      ) : null}

      {!getToken() ? (
        <div style={{ marginTop: 12, color: '#666' }}>
          Login to create versions.
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                background: '#fff',
                padding: 16,
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Editor</h2>

              <label style={{ display: 'grid', gap: 6 }}>
                <div>Content</div>
                <textarea
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                />
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <label style={{ display: 'grid', gap: 6 }}>
                  <div>Model</div>
                  <input
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div>Temperature</div>
                  <input
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div>Max tokens</div>
                  <input
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(e.target.value)}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <div>Top P</div>
                  <input
                    value={topP}
                    onChange={(e) => setTopP(e.target.value)}
                  />
                </label>
              </div>

              <label style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                <div>Notes</div>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={() => navigate(`/prompts/${promptId}`)}>
                  Cancel
                </button>
                <button
                  disabled={saving || content.trim().length === 0}
                  onClick={async () => {
                    setSaving(true);
                    setError(null);
                    try {
                      await api.createVersion(promptId, {
                        fromVersionId: baseVersion?.id || undefined,
                        content,
                        modelName: modelName.trim() || undefined,
                        temperature: temperature.trim()
                          ? Number(temperature)
                          : undefined,
                        maxTokens: maxTokens.trim()
                          ? Number(maxTokens)
                          : undefined,
                        topP: topP.trim() ? Number(topP) : undefined,
                        notes: notes.trim() || undefined,
                        variables: variables.map((v) => ({
                          name: v.name,
                          type: v.type,
                          required: v.required,
                          defaultValue: v.defaultValue,
                        })),
                      });

                      navigate(`/prompts/${promptId}`);
                    } catch (e: any) {
                      setError(e?.error?.message || 'Failed to create version');
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Saving…' : 'Create version'}
                </button>
              </div>
            </div>

            <div
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                background: '#fff',
                padding: 16,
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: 16 }}>Render Preview</h2>

              {templateVars.length === 0 ? (
                <div style={{ color: '#666' }}>No {'{{variables}}'} found.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {templateVars.map((v) => (
                    <label key={v} style={{ display: 'grid', gap: 6 }}>
                      <div style={{ fontSize: 12, color: '#666' }}>{v}</div>
                      <input
                        value={previewVars[v] || ''}
                        onChange={(e) =>
                          setPreviewVars((prev) => ({
                            ...prev,
                            [v]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              )}

              {missingPreview.length > 0 ? (
                <div style={{ marginTop: 10, color: '#b45309' }}>
                  Missing values for: {missingPreview.join(', ')}
                </div>
              ) : null}

              <div
                style={{
                  marginTop: 12,
                  borderTop: '1px solid #eee',
                  paddingTop: 12,
                }}
              >
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                  Rendered
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  {rendered}
                </pre>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              border: '1px solid #eee',
              borderRadius: 8,
              background: '#fff',
              padding: 16,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Variables</h2>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() =>
                  setVariables((prev) => [
                    ...prev,
                    {
                      name: '',
                      type: 'STRING',
                      required: false,
                      defaultValue: '',
                    },
                  ])
                }
              >
                Add variable
              </button>
              <button
                onClick={() => {
                  const inferred = extractVariables(content);
                  setVariables((prev) => {
                    const existing = new Set(prev.map((v) => v.name));
                    const next = [...prev];
                    for (const v of inferred) {
                      if (!existing.has(v)) {
                        next.push({
                          name: v,
                          type: 'STRING',
                          required: true,
                          defaultValue: '',
                        });
                      }
                    }
                    return next;
                  });
                }}
              >
                Add inferred from content
              </button>
            </div>

            {variables.length === 0 ? (
              <div style={{ marginTop: 10, color: '#666' }}>
                No variables defined.
              </div>
            ) : (
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {variables.map((v, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 0.8fr 0.6fr 1fr auto',
                      gap: 8,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      placeholder="name"
                      value={v.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setVariables((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, name } : row,
                          ),
                        );
                      }}
                    />

                    <select
                      value={v.type}
                      onChange={(e) => {
                        const type = e.target.value as VarRow['type'];
                        setVariables((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, type } : row,
                          ),
                        );
                      }}
                    >
                      <option value="STRING">STRING</option>
                      <option value="NUMBER">NUMBER</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                      <option value="JSON">JSON</option>
                    </select>

                    <label
                      style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                    >
                      <input
                        type="checkbox"
                        checked={v.required}
                        onChange={(e) => {
                          const required = e.target.checked;
                          setVariables((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, required } : row,
                            ),
                          );
                        }}
                      />
                      required
                    </label>

                    <input
                      placeholder="default"
                      value={v.defaultValue || ''}
                      onChange={(e) => {
                        const defaultValue = e.target.value;
                        setVariables((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, defaultValue } : row,
                          ),
                        );
                      }}
                    />

                    <button
                      onClick={() =>
                        setVariables((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
