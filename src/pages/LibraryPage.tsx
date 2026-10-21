import React, { useState } from 'react';
import {
  Bookmark,
  Search,
  FileText,
  Clock,
  ArrowRight,
  MoreVertical,
  Trash2,
  FolderPlus,
  ExternalLink,
  HardDrive,
  Cloud,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { useConversations } from '../hooks/useConversations';
import { useAuth } from '../context/AuthContext';

interface LibraryPageProps {
  onOpenItem: (id: string) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onOpenItem }) => {
  const [filterMode, setFilterMode] = useState<'all' | 'web' | 'deep' | 'quick'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const { conversations, deleteConversation, storageType } = useConversations();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const filteredItems = conversations.filter((item) => {
    const matchesFilter = filterMode === 'all' || item.mode === filterMode;
    const matchesSearch =
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.preview.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#191919] dark:text-[#ECEEE6] tracking-tight break-words">
            Research Library
          </h1>
          <p className="text-xs sm:text-sm text-[#717171] dark:text-[#9EA396] mt-0.5">
            Access, organize, and inspect your previous investigations and grounded answers.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {isAuthenticated && user ? (
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#282E20] text-xs font-medium text-[#191919] dark:text-[#ECEEE6] flex items-center gap-2 shadow-2xs max-w-full">
              <ShieldCheck className="w-3.5 h-3.5 text-[#416900] dark:text-[#B8F36B] shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{user.email}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E0E5D3] dark:bg-[#242C19] text-[#416900] dark:text-[#D6FF8E] shrink-0 font-semibold">
                RLS Synced
              </span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#282E20] text-xs font-medium text-[#717171] dark:text-[#9EA396] flex items-center gap-2 shadow-2xs max-w-full flex-wrap">
              <HardDrive className="w-3.5 h-3.5 text-[#717171] dark:text-[#9EA396] shrink-0" />
              <span>Local Storage</span>
              <button
                type="button"
                onClick={() => openAuthModal('sign_in')}
                className="text-xs font-semibold text-[#416900] dark:text-[#B8F36B] hover:underline cursor-pointer"
              >
                Sign in to sync
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#717171] dark:text-[#9EA396] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search saved research..."
            className="w-full bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#282E20] pl-9 pr-3 py-2 min-h-[40px] rounded-xl text-xs text-[#191919] dark:text-[#ECEEE6] placeholder:text-[#9E9E99] dark:placeholder:text-[#6E7366] focus:outline-none focus:border-[#B8F36B] dark:focus:border-[#B8F36B]"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#F1F2ED] dark:bg-[#181B14] p-1 rounded-xl border border-[#E8E8E5] dark:border-[#282E20] text-xs font-medium overflow-x-auto max-w-full scrollbar-none">
          {(['all', 'web', 'deep', 'quick'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1.5 min-h-[34px] rounded-lg capitalize transition-all cursor-pointer whitespace-nowrap ${
                filterMode === mode
                  ? 'bg-white dark:bg-[#242C19] text-[#191919] dark:text-[#D6FF8E] font-semibold shadow-2xs border border-transparent dark:border-[#384428]'
                  : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] dark:hover:bg-[#1E2319]'
              }`}
            >
              {mode === 'all' ? 'All Research' : `${mode} Search`}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#282E20] rounded-2xl p-10 text-center space-y-2.5 shadow-2xs">
            <Bookmark className="w-8 h-8 text-[#9E9E99] dark:text-[#72786B] mx-auto" />
            <h3 className="text-sm font-semibold text-[#191919] dark:text-[#ECEEE6]">
              {conversations.length === 0
                ? 'No research sessions yet'
                : 'No matching research sessions'}
            </h3>
            <p className="text-xs text-[#717171] dark:text-[#9EA396] max-w-sm mx-auto">
              {conversations.length === 0
                ? 'Start your first research session from the home console to explore topics and ground answers in web evidence.'
                : 'Try adjusting your search terms or filter mode to find past investigations.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenItem(item.id)}
              className="group bg-white dark:bg-[#151711] p-4 sm:p-5 rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] hover:border-[#DFE0DC] dark:hover:border-[#38402F] hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#F6F3F2] dark:bg-[#1E2319] flex items-center justify-center shrink-0 text-[#717171] dark:text-[#9EA396] group-hover:text-[#102000] group-hover:bg-[#B8F36B] transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-medium text-[#717171] dark:text-[#9EA396] bg-[#F1F2ED] dark:bg-[#1E2319] px-2 py-0.5 rounded border border-transparent dark:border-[#282E20]">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396]">
                      {item.messageCount} message{item.messageCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#191919] dark:text-[#ECEEE6] group-hover:text-[#416900] dark:group-hover:text-[#B8F36B] truncate">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#717171] dark:text-[#9EA396] line-clamp-1">{item.preview}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-center pt-2 sm:pt-0 sm:pl-2">
                <span className="text-xs font-mono text-[#717171] dark:text-[#9EA396] bg-[#F1F2ED] dark:bg-[#1E2319] px-2.5 py-1 rounded-full border border-transparent dark:border-[#282E20]">
                  {item.citationsCount} citation{item.citationsCount === 1 ? '' : 's'}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] border border-transparent dark:border-[#384428]">
                  {item.mode}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg text-[#717171] dark:text-[#9EA396] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#F1F2ED] dark:hover:bg-[#1E2319] flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="w-7 h-7 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-[#9E9E99] dark:text-[#72786B] group-hover:text-[#191919] dark:group-hover:text-[#ECEEE6] group-hover:translate-x-0.5 transition-all" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
