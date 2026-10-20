import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  File,
  HardDrive,
  Info,
} from 'lucide-react';
import { documentStorage, StoredDocument } from '../services/storage/documentStorage';

export const UploadsPage: React.FC = () => {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    const list = await documentStorage.list();
    setDocuments(list);
    const bytes = await documentStorage.getTotalSizeBytes();
    setTotalBytes(bytes);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setFeedback(null);

    try {
      let addedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 25 * 1024 * 1024) {
          setFeedback({
            type: 'error',
            message: `File "${file.name}" exceeds the 25MB limit.`,
          });
          continue;
        }

        const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
        let textSnippet = '';
        if (
          file.type.includes('text') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.csv')
        ) {
          try {
            const text = await file.text();
            textSnippet = text.slice(0, 300);
          } catch {
            // Non-fatal if snippet extraction fails
          }
        }

        await documentStorage.save({
          name: file.name,
          sizeBytes: file.size,
          type: extension,
          snippet: textSnippet,
        });
        addedCount++;
      }

      await loadDocuments();
      if (addedCount > 0) {
        setFeedback({
          type: 'success',
          message: `Successfully indexed ${addedCount} document${addedCount > 1 ? 's' : ''}.`,
        });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to process document upload.',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    await documentStorage.delete(id);
    await loadDocuments();
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#191919] tracking-tight">
          Uploads & Context Store
        </h1>
        <p className="text-xs sm:text-sm text-[#717171] mt-0.5">
          Upload PDFs, notes, or datasets to ground your research in private and proprietary documents.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-[#F1F7EB] text-[#2F5200] border-[#B8F36B]'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#416900]" />
            ) : (
              <Info className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-semibold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.json,.csv,.docx"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Dropzone Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all bg-white cursor-pointer ${
          dragActive
            ? 'border-[#B8F36B] bg-[#F6F3F2]'
            : 'border-[#E8E8E5] hover:border-[#B8F36B]/80 hover:bg-[#F6F3F2]/40'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-[#E0E5D3] flex items-center justify-center mx-auto text-[#181D13] mb-3">
          <Upload className="w-6 h-6 stroke-[2]" />
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
          {uploading ? (
            <span>Processing document...</span>
          ) : (
            <>
              Drag and drop research files here, or{' '}
              <span className="text-[#416900] underline font-medium">browse local files</span>
            </>
          )}
        </h3>
        <p className="text-xs text-[#717171] mt-1 max-w-md mx-auto">
          Supports PDF, Markdown, DOCX, TXT, CSV, and JSON files up to 25MB. Files are processed locally in your browser context.
        </p>
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#717171]">
            Indexed Documents ({documents.length})
          </h2>
          <span className="text-xs font-mono text-[#717171]">
            Storage used: {documentStorage.formatSize(totalBytes)} / 50 MB
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white border border-[#E8E8E5] rounded-2xl p-8 text-center space-y-2 shadow-2xs">
            <FileText className="w-8 h-8 text-[#9E9E99] mx-auto" />
            <h3 className="text-sm font-semibold text-[#191919]">No documents uploaded yet</h3>
            <p className="text-xs text-[#717171] max-w-md mx-auto">
              Upload local research papers, notes, or datasets to reference your private files during investigations.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-[#E8E8E5] rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#F6F3F2] flex items-center justify-center shrink-0 text-[#717171] font-bold text-xs uppercase">
                    {doc.type.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#191919] truncate">
                      {doc.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[#717171]">
                      <span>{doc.formattedSize}</span>
                      <span>•</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium">Local Vault</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                    className="p-1.5 text-[#717171] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
