export type ApiError = {
  error: { code: string; message: string; details?: unknown };
};

export type PromptDetailResponse = {
  id: string;
  name: string;
  description: string | null;
  ownerTeam: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  tags: string[];
  versions: Array<{
    id: string;
    version: number;
    content: string;
    modelName: string | null;
    temperature: number | null;
    maxTokens: number | null;
    topP: number | null;
    notes: string | null;
    createdBy: string | null;
    createdAt: string;
    variables: Array<{
      name: string;
      type: string;
      required: boolean;
      defaultValue: string | null;
    }>;
  }>;
  publications: Array<{
    id: string;
    env: string;
    promptVersionId: string;
    publishedAt: string;
    publishedBy: string | null;
    notes: string | null;
  }>;
};

const TOKEN_KEY = 'pm_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const err = (body || {
      error: { code: 'HTTP_ERROR', message: `Request failed: ${res.status}` },
    }) as ApiError;
    throw err;
  }

  return body as T;
}

export const api = {
  login: (params: { email: string; password: string }) =>
    request<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  createPrompt: (body: {
    name: string;
    description?: string;
    ownerTeam?: string;
    status?: 'ACTIVE' | 'ARCHIVED';
    tags: string[];
    initialVersion: {
      content: string;
      modelName?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      notes?: string;
      variables: Array<{
        name: string;
        type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
        required: boolean;
        defaultValue?: string;
      }>;
    };
  }) =>
    request<PromptDetailResponse>('/api/prompts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listPrompts: (params?: {
    q?: string;
    tag?: string;
    env?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.tag) sp.set('tag', params.tag);
    if (params?.env) sp.set('env', params.env);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.pageSize) sp.set('pageSize', String(params.pageSize));
    const qs = sp.toString();
    return request<{
      page: number;
      pageSize: number;
      total: number;
      items: Array<{
        id: string;
        name: string;
        description: string | null;
        ownerTeam: string | null;
        status: 'ACTIVE' | 'ARCHIVED';
        updatedAt: string;
        tags: string[];
        publications: Array<{
          env: string;
          promptVersionId: string;
          publishedAt: string;
        }>;
      }>;
    }>(`/api/prompts${qs ? `?${qs}` : ''}`);
  },

  getPrompt: (promptId: string) =>
    request<PromptDetailResponse>(
      `/api/prompts/${encodeURIComponent(promptId)}`,
    ),

  createVersion: (
    promptId: string,
    body: {
      fromVersionId?: string;
      content?: string;
      modelName?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      notes?: string;
      variables?: Array<{
        name: string;
        type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
        required: boolean;
        defaultValue?: string;
      }>;
    },
  ) =>
    request<{ id: string; version: number }>(
      `/api/prompts/${encodeURIComponent(promptId)}/versions`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),

  publish: (
    promptId: string,
    body: { env: string; promptVersionId: string; notes?: string },
  ) =>
    request<any>(`/api/prompts/${encodeURIComponent(promptId)}/publish`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  exportPrompt: (promptId: string) =>
    request<any>(`/api/prompts/${encodeURIComponent(promptId)}/export`),

  importPrompt: (body: { bundle: any; mode?: 'create' | 'merge' }) =>
    request<any>(`/api/prompts/import`, {
      method: 'POST',
      body: JSON.stringify({ bundle: body.bundle, mode: body.mode || 'merge' }),
    }),
};
