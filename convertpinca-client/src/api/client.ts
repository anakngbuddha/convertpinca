import type {
  ConvertResponse,
  Job,
  JobsListResponse,
  TemplatesListResponse,
} from '@/types';

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://convertpinca-server.onrender.com');

function resolveUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return url;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  /**
   * Upload a PDF file for conversion.
   */
  convert: async (file: File, templateId: string): Promise<ConvertResponse> => {
    const form = new FormData();
    form.append('pdf', file);
    form.append('templateId', templateId);
    const res = await fetch(`${BASE_URL}/api/convert`, { method: 'POST', body: form });
    return handleResponse<ConvertResponse>(res);
  },

  /**
   * Get a single job by ID.
   */
  getJob: async (jobId: string): Promise<Job> => {
    const res = await fetch(`${BASE_URL}/api/jobs/${jobId}`);
    const job = await handleResponse<Job>(res);
    return {
      ...job,
      resultUrl: resolveUrl(job.resultUrl),
    };
  },

  /**
   * Get all recent jobs.
   */
  listJobs: async (): Promise<JobsListResponse> => {
    const res = await fetch(`${BASE_URL}/api/jobs`);
    const data = await handleResponse<JobsListResponse>(res);
    return {
      jobs: (data.jobs || []).map((job) => ({
        ...job,
        resultUrl: resolveUrl(job.resultUrl),
      })),
    };
  },

  /**
   * Get all available templates.
   */
  listTemplates: async (): Promise<TemplatesListResponse> => {
    const res = await fetch(`${BASE_URL}/api/templates`);
    return handleResponse<TemplatesListResponse>(res);
  },
};
