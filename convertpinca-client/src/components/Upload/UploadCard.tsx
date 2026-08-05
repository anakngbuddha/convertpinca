import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/api/client';
import type { Template } from '@/types';

interface UploadCardProps {
  onJobStarted: (jobId: string) => void;
}

export function UploadCard({ onJobStarted }: UploadCardProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listTemplates().then((res) => {
      setTemplates(res.templates);
      if (res.templates.length > 0) setSelectedTemplate(res.templates[0].id);
    }).catch(() => setError('Could not load templates. Is the server running?'));
  }, []);

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    setError(null);
    setFile(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleSubmit = async () => {
    if (!file || !selectedTemplate) return;
    setIsUploading(true);
    setError(null);
    try {
      const { jobId } = await api.convert(file, selectedTemplate);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onJobStarted(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-violet-400" />
          Upload PDF
        </CardTitle>
        <CardDescription>Upload a PDF and select a target template to extract and convert</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Target Template</label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger id="template-select">
              <SelectValue placeholder="Select template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templates.find(t => t.id === selectedTemplate) && (
            <p className="text-xs text-slate-500">
              {templates.find(t => t.id === selectedTemplate)?.description}
            </p>
          )}
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200
            ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5'}
            ${file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onInputChange}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <FileText className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="absolute top-3 right-3 rounded-full p-1 hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                <Upload className="h-7 w-7 text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Drop your PDF here</p>
                <p className="text-sm text-slate-500 mt-1">or click to browse — max 20MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          id="convert-button"
          onClick={handleSubmit}
          disabled={!file || !selectedTemplate || isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Uploading…
            </span>
          ) : (
            'Convert to Excel'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
