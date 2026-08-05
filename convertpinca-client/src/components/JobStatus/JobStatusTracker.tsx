import { CheckCircle2, Circle, Clock, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Job, JobStatus } from '@/types';

interface JobStatusTrackerProps {
  job: Job | null;
  isPolling: boolean;
  jobId: string | null;
}

const STATUS_STEPS: { key: JobStatus | 'queued'; label: string }[] = [
  { key: 'queued', label: 'Queued' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'done', label: 'Complete' },
];

function getStepIndex(status: JobStatus): number {
  switch (status) {
    case 'pending': return 1;
    case 'processing': return 2;
    case 'done': return 3;
    case 'failed': return -1;
    default: return 0;
  }
}

function getProgressValue(status: JobStatus): number {
  switch (status) {
    case 'pending': return 25;
    case 'processing': return 65;
    case 'done': return 100;
    case 'failed': return 100;
    default: return 5;
  }
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

export function JobStatusTracker({ job, isPolling, jobId }: JobStatusTrackerProps) {
  if (!jobId) return null;

  const stepIndex = job ? getStepIndex(job.status) : 0;
  const progressValue = job ? getProgressValue(job.status) : 5;
  const isFailed = job?.status === 'failed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isPolling && (
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            )}
            Conversion Status
          </span>
          {job && <StatusBadge status={job.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <Progress
          value={progressValue}
          className={isFailed ? '[&>div]:bg-red-500' : ''}
        />

        {/* Step indicators */}
        {!isFailed && (
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = stepIndex > i;
              const isCurrent = stepIndex === i && !isFailed;

              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={`
                    flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300
                    ${isCompleted ? 'border-violet-500 bg-violet-500' : isCurrent ? 'border-violet-500 bg-violet-500/20' : 'border-white/10 bg-transparent'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    ) : isCurrent ? (
                      <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
                    ) : (
                      <Circle className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <span className={`text-xs ${isCurrent ? 'text-violet-300 font-medium' : isCompleted ? 'text-slate-300' : 'text-slate-600'}`}>
                    {step.label}
                  </span>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`absolute h-0.5 w-full max-w-[60px] translate-x-8 -translate-y-5 ${isCompleted ? 'bg-violet-500' : 'bg-white/5'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error message */}
        {isFailed && (
          <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Conversion Failed</p>
              {job?.errorMessage && (
                <p className="text-xs text-red-400/80 mt-1">{job.errorMessage}</p>
              )}
            </div>
          </div>
        )}

        {/* Job metadata */}
        <div className="rounded-lg bg-slate-800/50 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>Job ID: <span className="text-slate-400 font-mono">{jobId}</span></span>
          </div>
          {job?.createdAt && (
            <div className="text-xs text-slate-500">
              Started: <span className="text-slate-400">{new Date(job.createdAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
