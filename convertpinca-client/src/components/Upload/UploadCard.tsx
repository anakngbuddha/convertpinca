import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import type { Template } from '@/types';

interface UploadCardProps { onJobStarted: (jobId: string) => void; }
export function UploadCard({ onJobStarted }: UploadCardProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vatIncluded, setVatIncluded] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('60.978');
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'margin' | 'discount'>('none');
  const [adjustmentPercent, setAdjustmentPercent] = useState('0');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.listTemplates().then((res) => { setTemplates(res.templates); if (res.templates.length) setSelectedTemplate(res.templates[0].id); }).catch(() => setError('Could not load templates. Is the server running?')); }, []);
  const handleFile = useCallback((f: File) => { if (f.type !== 'application/pdf') { setError('Only PDF files are accepted.'); return; } setError(null); setFile(f); }, []);
  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const dropped = e.dataTransfer.files[0]; if (dropped) handleFile(dropped); }, [handleFile]);
  const handleSubmit = async () => {
    const rate = Number(exchangeRate); const percent = Number(adjustmentPercent);
    if (!file || !selectedTemplate) return;
    if (!Number.isFinite(rate) || rate <= 0) { setError('Enter a valid USD to PHP exchange rate.'); return; }
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) { setError('Margin or discount must be between 0 and 100%.'); return; }
    setIsUploading(true); setError(null);
    try { const { jobId } = await api.convert(file, selectedTemplate, { vatIncluded, exchangeRate: rate, adjustmentType, adjustmentPercent: percent }); setFile(null); if (inputRef.current) inputRef.current.value = ''; onJobStarted(jobId); } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.'); } finally { setIsUploading(false); }
  };
  return <Card className="w-full"><CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-violet-400" />Upload PDF</CardTitle><CardDescription>Upload a PDF and configure PHP conversion before generating Excel.</CardDescription></CardHeader><CardContent className="space-y-4">
    <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Target Template</label><Select value={selectedTemplate} onValueChange={setSelectedTemplate}><SelectTrigger id="template-select"><SelectValue placeholder="Select template..." /></SelectTrigger><SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid gap-3 rounded-lg border border-white/10 p-4"><label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={vatIncluded} onChange={(e) => setVatIncluded(e.target.checked)} /> VAT included (12%)</label><label className="space-y-1 text-sm text-slate-300">USD to PHP exchange rate<input type="number" min="0.000001" step="0.000001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white" /></label><div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm text-slate-300">Margin / Discount<select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as typeof adjustmentType)} className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white"><option value="none">No margin / discount</option><option value="margin">Add margin</option><option value="discount">Apply discount</option></select></label><label className="space-y-1 text-sm text-slate-300">Percentage<input type="number" min="0" max="100" step="0.01" value={adjustmentPercent} disabled={adjustmentType === 'none'} onChange={(e) => setAdjustmentPercent(e.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-white disabled:opacity-50" /></label></div></div>
    <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-white/10'} ${file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}><input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const selected = e.target.files?.[0]; if (selected) handleFile(selected); }} />{file ? <div className="flex flex-col items-center gap-3"><FileText className="h-10 w-10 text-emerald-400" /><p className="font-medium text-white">{file.name}</p><button onClick={(e) => { e.stopPropagation(); setFile(null); }}><X className="h-4 w-4" /></button></div> : <div className="flex flex-col items-center gap-3"><Upload className="h-10 w-10 text-slate-400" /><p className="font-medium text-slate-200">Drop your PDF here</p><p className="text-sm text-slate-500">or click to browse, max 20MB</p></div>}</div>
    {error && <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    <Button id="convert-button" onClick={handleSubmit} disabled={!file || !selectedTemplate || isUploading} className="w-full" size="lg">{isUploading ? 'Uploading…' : 'Convert to Excel'}</Button>
  </CardContent></Card>;
}
