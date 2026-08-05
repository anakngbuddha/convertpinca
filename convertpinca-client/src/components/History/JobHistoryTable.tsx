import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/api/client';
import type { Job, JobStatus } from '@/types';

interface JobHistoryTableProps {
  refreshTrigger?: number;
  onSelectJob?: (jobId: string) => void;
}

function StatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'processing'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    processing: { variant: 'processing', label: 'Processing' },
    done: { variant: 'success', label: 'Done' },
    failed: { variant: 'destructive', label: 'Failed' },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function JobHistoryTable({ refreshTrigger, onSelectJob }: JobHistoryTableProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await api.listJobs();
      setJobs(res.jobs);
    } catch {
      // silently fail — server may not be running
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, [refreshTrigger]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Conversion History</span>
          <Button
            id="refresh-history-button"
            variant="ghost"
            size="sm"
            onClick={fetchJobs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {jobs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No conversions yet. Upload a PDF to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow
                  key={job.jobId}
                  className="cursor-pointer"
                  onClick={() => onSelectJob?.(job.jobId)}
                >
                  <TableCell className="font-mono text-xs text-slate-400">
                    {job.jobId.slice(0, 8)}…
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-violet-300">
                      {job.templateId}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(job.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {job.resultUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={job.resultUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
