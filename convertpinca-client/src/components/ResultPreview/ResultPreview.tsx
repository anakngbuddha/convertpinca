import { Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Job } from '@/types';

interface ResultPreviewProps {
  job: Job | null;
}

export function ResultPreview({ job }: ResultPreviewProps) {
  if (!job || job.status !== 'done' || !job.resultUrl) return null;

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="h-5 w-5" />
          Conversion Complete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File preview card */}
        <div className="flex items-center gap-4 rounded-lg border border-white/8 bg-slate-800/60 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-white truncate">
              result-{job.jobId.slice(0, 8)}.xlsx
            </p>
            <p className="text-sm text-slate-400 mt-0.5">Excel Workbook</p>
          </div>
        </div>

        {/* Download button */}
        <Button
          id="download-result-button"
          asChild
          className="w-full bg-emerald-600 hover:bg-emerald-500"
          size="lg"
        >
          <a href={job.resultUrl} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-4 w-4" />
            Download Excel File
          </a>
        </Button>

        <p className="text-center text-xs text-slate-500">
          File is hosted on Cloudinary and available for download
        </p>
      </CardContent>
    </Card>
  );
}
