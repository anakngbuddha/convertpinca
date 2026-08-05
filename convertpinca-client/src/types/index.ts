export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface Job {
  jobId: string;
  status: JobStatus;
  templateId: string;
  resultUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
}

export interface ConvertResponse {
  jobId: string;
}

export interface JobsListResponse {
  jobs: Job[];
}

export interface TemplatesListResponse {
  templates: Template[];
}
