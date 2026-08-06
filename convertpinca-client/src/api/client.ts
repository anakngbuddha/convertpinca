import type { ConvertResponse, Job, JobsListResponse, TemplatesListResponse } from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://convertpinca-server.onrender.com');
function resolveUrl(url: string | null): string | null { return url ? (url.startsWith('/') ? `${BASE_URL}${url}` : url) : null; }
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body?.error?.message || `HTTP ${res.status}`); }
  return res.json() as Promise<T>;
}

export const api = {
  convert: async (file: File, templateId: string, settings: { vatIncluded: boolean; exchangeRate: number; adjustmentType: 'none' | 'margin' | 'discount'; adjustmentPercent: number }): Promise<ConvertResponse> => {
    const form = new FormData();
    form.append('pdf', file);
    form.append('templateId', templateId);
    form.append('vatIncluded', String(settings.vatIncluded));
    form.append('exchangeRate', String(settings.exchangeRate));
    form.append('adjustmentType', settings.adjustmentType);
    form.append('adjustmentPercent', String(settings.adjustmentPercent));
    const res = await fetch(`${BASE_URL}/api/convert`, { method: 'POST', body: form });
    return handleResponse<ConvertResponse>(res);
  },
  getJob: async (jobId: string): Promise<Job> => { const job = await handleResponse<Job>(await fetch(`${BASE_URL}/api/jobs/${jobId}`)); return { ...job, resultUrl: resolveUrl(job.resultUrl) }; },
  listJobs: async (): Promise<JobsListResponse> => { const data = await handleResponse<JobsListResponse>(await fetch(`${BASE_URL}/api/jobs`)); return { jobs: (data.jobs || []).map((job) => ({ ...job, resultUrl: resolveUrl(job.resultUrl) })) }; },
  listTemplates: async (): Promise<TemplatesListResponse> => handleResponse<TemplatesListResponse>(await fetch(`${BASE_URL}/api/templates`)),
};
