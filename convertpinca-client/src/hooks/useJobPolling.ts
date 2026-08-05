import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/api/client';
import type { Job, JobStatus } from '@/types';

const TERMINAL_STATUSES: JobStatus[] = ['done', 'failed'];
const POLL_INTERVAL_MS = 2000;

interface UseJobPollingResult {
  job: Job | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

export function useJobPolling(): UseJobPollingResult {
  const [job, setJob] = useState<Job | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    if (!jobIdRef.current) return;
    try {
      const result = await api.getJob(jobIdRef.current);
      setJob(result);
      if (TERMINAL_STATUSES.includes(result.status)) {
        stopPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Polling error');
      stopPolling();
    }
  }, [stopPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      jobIdRef.current = jobId;
      setJob(null);
      setError(null);
      setIsPolling(true);
      // Immediate first poll
      poll();
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [stopPolling, poll]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { job, isPolling, error, startPolling, stopPolling };
}
