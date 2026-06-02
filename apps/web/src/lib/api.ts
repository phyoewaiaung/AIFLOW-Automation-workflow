const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } else {
        localStorage.removeItem('auth_token');
        document.cookie = 'auth_token=; path=/; max-age=0';
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

export const auth = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<{ user: any; token: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: any; token: string }>('/auth/login', data),
  me: () => api.get<any>('/auth/me'),
};

export const organizations = {
  list: () => api.get<any[]>('/organizations'),
  get: (id: string) => api.get<any>(`/organizations/${id}`),
  create: (data: { name: string }) => api.post<any>('/organizations', data),
  update: (id: string, data: { name?: string }) =>
    api.patch<any>(`/organizations/${id}`, data),
};

export const workflows = {
  list: (organizationId: string) =>
    api.get<any[]>(`/workflows?organizationId=${organizationId}`),
  get: (id: string) => api.get<any>(`/workflows/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post<any>('/workflows', data),
  update: (id: string, data: any) => api.patch<any>(`/workflows/${id}`, data),
  delete: (id: string) => api.delete<any>(`/workflows/${id}`),
  activate: (id: string) => api.post<any>(`/workflows/${id}/activate`),
  deactivate: (id: string) => api.post<any>(`/workflows/${id}/deactivate`),
  saveNodes: (id: string, data: { nodes: any[]; edges: any[] }) =>
    api.post<any>(`/workflows/${id}/save`, data),
};

export const executions = {
  list: (organizationId: string, filters?: { workflowId?: string; status?: string; limit?: number }) => {
    const params = new URLSearchParams({ organizationId });
    if (filters?.workflowId) params.append('workflowId', filters.workflowId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', String(filters.limit));
    return api.get<any>(`/executions?${params}`);
  },
  get: (id: string) => api.get<any>(`/executions/${id}`),
  getLogs: (id: string) => api.get<any[]>(`/executions/${id}/logs`),
  trigger: (workflowId: string, data: any) =>
    api.post<any>(`/executions/trigger/${workflowId}`, data),
  cancel: (id: string) => api.post<any>(`/executions/${id}/cancel`),
  retry: (id: string) => api.post<any>(`/executions/${id}/retry`),
};

export const agents = {
  list: (organizationId: string) =>
    api.get<any[]>(`/agents?organizationId=${organizationId}`),
  get: (id: string) => api.get<any>(`/agents/${id}`),
  create: (data: any) => api.post<any>('/agents', data),
  update: (id: string, data: any) => api.patch<any>(`/agents/${id}`, data),
  delete: (id: string) => api.delete<any>(`/agents/${id}`),
  test: (id: string, input: string) =>
    api.post<any>(`/agents/${id}/test`, { input }),
};

export const integrations = {
  list: (organizationId: string) =>
    api.get<any[]>(`/integrations?organizationId=${organizationId}`),
  get: (id: string) => api.get<any>(`/integrations/${id}`),
  create: (data: any) => api.post<any>('/integrations', data),
  update: (id: string, data: any) => api.patch<any>(`/integrations/${id}`, data),
  delete: (id: string) => api.delete<any>(`/integrations/${id}`),
  fetchSlackChannels: (id: string) =>
    api.post<any[]>(`/integrations/${id}/slack-channels`),
  fetchDiscordChannels: (id: string) =>
    api.post<any[]>(`/integrations/${id}/discord-channels`),
};

export const users = {
  update: (id: string, data: { name?: string; avatar?: string }) =>
    api.patch<any>(`/users/${id}`, data),
};

export const notifications = {
  list: (organizationId: string) =>
    api.get<any[]>(`/notifications?organizationId=${organizationId}`),
  create: (data: { title: string; message: string; type?: string; link?: string }) =>
    api.post<any>('/notifications', data),
  markRead: (id: string) => api.patch<any>(`/notifications/${id}/read`, {}),
  markAllRead: (organizationId: string) =>
    api.post<any>(`/notifications/mark-all-read?organizationId=${organizationId}`),
};

export const leads = {
  list: (organizationId: string, status?: string) => {
    const params = new URLSearchParams({ organizationId });
    if (status) params.append('status', status);
    return api.get<any[]>(`/leads?${params}`);
  },
  setupStatus: (organizationId: string) =>
    api.get<any>(`/leads/setup/status?organizationId=${organizationId}`),
  get: (id: string) => api.get<any>(`/leads/${id}`),
  create: (data: any) => api.post<any>('/leads', data),
  testWebhook: (organizationId: string, data: any) =>
    api.post<any>(`/leads/webhook/${organizationId}`, data),
  updateContact: (id: string, data: any) => api.patch<any>(`/leads/${id}/contact`, data),
  updateDraft: (id: string, data: { generatedEmail: string }) => api.patch<any>(`/leads/${id}/draft`, data),
  sendEmail: (id: string) => api.post<any>(`/leads/${id}/send-email`),
};

export const apiKeys = {
  list: (organizationId: string) =>
    api.get<any[]>(`/api-keys?organizationId=${organizationId}`),
  create: (data: { name: string }) =>
    api.post<any>('/api-keys', data),
  delete: (id: string) => api.delete<any>(`/api-keys/${id}`),
};

export const analytics = {
  overview: (organizationId: string) =>
    api.get<any>(`/analytics/overview?organizationId=${organizationId}`),
  executions: (organizationId: string) =>
    api.get<any>(`/analytics/executions?organizationId=${organizationId}`),
  workflows: (organizationId: string) =>
    api.get<any[]>(`/analytics/workflows?organizationId=${organizationId}`),
};
