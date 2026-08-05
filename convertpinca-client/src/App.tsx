import { useState } from 'react';
import { FileText, History } from 'lucide-react';
import { UploadCard } from '@/components/Upload/UploadCard';
import { JobStatusTracker } from '@/components/JobStatus/JobStatusTracker';
import { ResultPreview } from '@/components/ResultPreview/ResultPreview';
import { JobHistoryTable } from '@/components/History/JobHistoryTable';
import { useJobPolling } from '@/hooks/useJobPolling';

type ActiveTab = 'convert' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('convert');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const { job, isPolling, error: pollingError, startPolling } = useJobPolling();

  const handleJobStarted = (jobId: string) => {
    setActiveJobId(jobId);
    startPolling(jobId);
    setHistoryRefresh((n) => n + 1);
  };

  const handleSelectHistoryJob = (jobId: string) => {
    setActiveJobId(jobId);
    startPolling(jobId);
    setActiveTab('convert');
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      {/* Ambient gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 mb-4">
            <FileText className="h-4 w-4" />
            AI-Powered PDF Converter
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Convert<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Pinca</span>
          </h1>
          <p className="mt-3 text-slate-400 max-w-md mx-auto">
            Upload a PDF invoice or billing statement and get a perfectly formatted Excel file in seconds.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-900/60 p-1 border border-white/5 mb-8 max-w-xs">
          {([
            { key: 'convert', label: 'Convert', icon: FileText },
            { key: 'history', label: 'History', icon: History },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              id={`tab-${key}`}
              onClick={() => setActiveTab(key)}
              className={`
                flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
                ${activeTab === key
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'convert' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              <UploadCard onJobStarted={handleJobStarted} />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {activeJobId ? (
                <>
                  <JobStatusTracker
                    job={job}
                    isPolling={isPolling}
                    jobId={activeJobId}
                  />
                  {pollingError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {pollingError}
                    </div>
                  )}
                  <ResultPreview job={job} />
                </>
              ) : (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-white/8 text-center text-slate-600 gap-3">
                  <FileText className="h-12 w-12 opacity-20" />
                  <p className="text-sm">Your conversion status will appear here</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <JobHistoryTable
            refreshTrigger={historyRefresh}
            onSelectJob={handleSelectHistoryJob}
          />
        )}
      </div>
    </div>
  );
}
