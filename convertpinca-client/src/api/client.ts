import type {
  ConvertResponse,
  Job,
  JobsListResponse,
  TemplatesListResponse,
} from '@/types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    return handleResponse<Job>(res);
  },

  /**
   * Get all recent jobs.
   */
  listJobs: async (): Promise<JobsListResponse> => {
    const res = await fetch(`${BASE_URL}/api/jobs`);
    return handleResponse<JobsListResponse>(res);
  },

  /**
   * Get all available templates.
   */
  listTemplates: async (): Promise<TemplatesListResponse> => {
    const res = await fetch(`${BASE_URL}/api/templates`);
    return handleResponse<TemplatesListResponse>(res);
  },
};
