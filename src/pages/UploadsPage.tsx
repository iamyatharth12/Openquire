import React, { useState } from 'react';
import {
  Upload,
  File,
  FileCheck,
  Trash2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { DevPlaceholderBadge } from '../components/common/UIPrimitives';

export const UploadsPage: React.FC = () => {
  const [documents, setDocuments] = useState([
    {
      id: 'doc-1',
      name: 'Q3_Global_Energy_Transition_Report.pdf',
      size: '4.2 MB',
      type: 'PDF',
      date: '2 hours ago',
      status: 'Indexed & Ready',
      chunks: 84,
    },
    {
      id: 'doc-2',
      name: 'autonomous_workforce_projections_2026.docx',
      size: '1.8 MB',
      type: 'DOCX',
      date: 'Yesterday',
      status: 'Indexed & Ready',
      chunks: 36,
    },
    {
      id: 'doc-3',
      name: 'research_notes_synthetic_biology.md',
      size: '240 KB',
      type: 'Markdown',
      date: '3 days ago',
      status: 'Indexed & Ready',
      chunks: 12,
    },
  ]);

  const [dragActive, setDragActive] = useState(false);

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Development Notice */}
      <DevPlaceholderBadge label="Openquire Document Uploads & Context Store (Phase 1 Canonical Design)" />

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#191919] tracking-tight">
          Uploads & Context Store
        </h1>
        <p className="text-xs sm:text-sm text-[#717171] mt-0.5">
          Upload PDFs, notes, or datasets to ground your research in private and proprietary documents.
        </p>
      </div>

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
          alert('Document drop triggered (Phase 1 placeholder - actual file parsing will be enabled in Phase 3)');
        }}
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
          Drag and drop research files here, or{' '}
          <span className="text-[#416900] underline font-medium">browse local files</span>
        </h3>
        <p className="text-xs text-[#717171] mt-1 max-w-md mx-auto">
          Supports PDF, Markdown, DOCX, and TXT files up to 25MB. Files are processed locally and never used to train public models.
        </p>
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#717171]">
            Indexed Documents ({documents.length})
          </h2>
          <span className="text-xs font-mono text-[#717171]">Storage used: 6.2 MB / 100 MB</span>
        </div>

        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-[#E8E8E5] rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#F6F3F2] flex items-center justify-center shrink-0 text-[#717171] font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-[#191919] truncate">
                    {doc.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[#717171]">
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span>{doc.date}</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-medium">{doc.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-[#717171] bg-[#F1F2ED] px-2 py-0.5 rounded hidden sm:inline">
                  {doc.chunks} vector chunks
                </span>
                <button
                  type="button"
                  onClick={() => setDocuments(documents.filter((d) => d.id !== doc.id))}
                  className="p-1.5 text-[#717171] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
