import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FlaskConical,
  Bookmark,
  Upload,
  Cpu,
  Plus,
  HelpCircle,
  Sun,
  Moon,
  User,
  ArrowRight,
  Clock,
  Sparkles,
  Command as CommandIcon,
  X,
} from 'lucide-react';
import { NavRoute } from '../../types/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useConversations } from '../../hooks/useConversations';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteChange: (route: NavRoute) => void;
  onStartNewResearch: () => void;
  onOpenHelp: () => void;
  onOpenAuth: () => void;
  onOpenResearchItem?: (id: string) => void;
  onExecuteSearch?: (query: string, mode: 'web' | 'deep') => void;
}

interface PaletteAction {
  id: string;
  category: 'Actions' | 'Navigation' | 'Recent' | 'Quick Search';
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcutHint?: string;
  keywords?: string[];
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onRouteChange,
  onStartNewResearch,
  onOpenHelp,
  onOpenAuth,
  onOpenResearchItem,
  onExecuteSearch,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { theme, isDark, toggleTheme } = useTheme();
  const { conversations } = useConversations();

  // Reset query and selection index on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Ensure focus on next tick
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Construct available actions
  const actions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = [];
    const trimmed = query.trim();

    // 1. Dynamic Search Actions if query is typed
    if (trimmed.length > 0) {
      list.push({
        id: 'action-search-web',
        category: 'Quick Search',
        title: `Search web for "${trimmed}"`,
        description: 'Execute instant grounded web synthesis',
        icon: Search,
        shortcutHint: '↵',
        keywords: ['search', 'web', 'find', 'query'],
        action: () => {
          if (onExecuteSearch) {
            onExecuteSearch(trimmed, 'web');
          } else {
            onRouteChange('home');
          }
          onClose();
        },
      });

      list.push({
        id: 'action-search-deep',
        category: 'Quick Search',
        title: `Deep investigation on "${trimmed}"`,
        description: 'Launch autonomous multi-stage deep research',
        icon: FlaskConical,
        shortcutHint: '↵',
        keywords: ['deep', 'investigate', 'research', 'explore'],
        action: () => {
          if (onExecuteSearch) {
            onExecuteSearch(trimmed, 'deep');
          } else {
            onRouteChange('deep-research');
          }
          onClose();
        },
      });
    }

    // 2. Primary Actions
    list.push({
      id: 'action-new-research',
      category: 'Actions',
      title: 'New Research Session',
      description: 'Start a fresh search and inquiry session',
      icon: Plus,
      shortcutHint: '⌘N',
      keywords: ['new', 'create', 'start', 'clear', 'search'],
      action: () => {
        onStartNewResearch();
        onClose();
      },
    });

    list.push({
      id: 'action-toggle-theme',
      category: 'Actions',
      title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: `Currently ${theme} theme. Press Enter to toggle.`,
      icon: isDark ? Sun : Moon,
      shortcutHint: 'Theme',
      keywords: ['theme', 'dark', 'light', 'mode', 'color', 'appearance'],
      action: () => {
        toggleTheme();
        onClose();
      },
    });

    list.push({
      id: 'action-help-docs',
      category: 'Actions',
      title: 'Help & Architecture Guide',
      description: 'View documentation, features, and keyboard shortcuts',
      icon: HelpCircle,
      shortcutHint: '?',
      keywords: ['help', 'docs', 'manual', 'shortcuts', 'guide', 'info'],
      action: () => {
        onOpenHelp();
        onClose();
      },
    });

    list.push({
      id: 'action-account-profile',
      category: 'Actions',
      title: 'Account & Cloud Sync',
      description: 'Manage Supabase sign-in and cloud history profile',
      icon: User,
      keywords: ['account', 'login', 'auth', 'profile', 'supabase', 'cloud', 'user'],
      action: () => {
        onOpenAuth();
        onClose();
      },
    });

    // 3. Navigation Pages
    list.push({
      id: 'nav-home',
      category: 'Navigation',
      title: 'Go to Home',
      description: 'Main research composer and overview',
      icon: Search,
      keywords: ['home', 'start', 'main', 'composer'],
      action: () => {
        onRouteChange('home');
        onClose();
      },
    });

    list.push({
      id: 'nav-deep',
      category: 'Navigation',
      title: 'Go to Deep Research',
      description: 'Autonomous multi-stage investigative agent',
      icon: FlaskConical,
      keywords: ['deep', 'investigation', 'agent', 'multi-step'],
      action: () => {
        onRouteChange('deep-research');
        onClose();
      },
    });

    list.push({
      id: 'nav-library',
      category: 'Navigation',
      title: 'Go to Library & History',
      description: 'Browse, search, and manage saved research sessions',
      icon: Bookmark,
      keywords: ['library', 'history', 'saved', 'bookmarks', 'archives'],
      action: () => {
        onRouteChange('library');
        onClose();
      },
    });

    list.push({
      id: 'nav-uploads',
      category: 'Navigation',
      title: 'Go to Uploads & Context Store',
      description: 'Manage document context and uploaded sources',
      icon: Upload,
      keywords: ['uploads', 'files', 'documents', 'pdf', 'txt', 'context'],
      action: () => {
        onRouteChange('uploads');
        onClose();
      },
    });

    list.push({
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Go to AI Providers & BYOK Settings',
      description: 'Configure Gemini API keys and inference models',
      icon: Cpu,
      keywords: ['settings', 'providers', 'api', 'key', 'byok', 'gemini', 'models'],
      action: () => {
        onRouteChange('settings-providers');
        onClose();
      },
    });

    // 4. Recent Research Sessions (up to 5)
    if (conversations && conversations.length > 0) {
      conversations.slice(0, 5).forEach((item) => {
        list.push({
          id: `recent-${item.id}`,
          category: 'Recent',
          title: item.title,
          description: `Resume ${item.mode} inquiry (${new Date(item.updatedAt || item.createdAt).toLocaleDateString()})`,
          icon: Clock,
          keywords: ['recent', 'history', item.title.toLowerCase(), item.mode],
          action: () => {
            if (onOpenResearchItem) {
              onOpenResearchItem(item.id);
            } else {
              onRouteChange(item.mode === 'deep' ? 'deep-research' : 'research');
            }
            onClose();
          },
        });
      });
    }

    return list;
  }, [
    query,
    isDark,
    theme,
    conversations,
    onClose,
    onExecuteSearch,
    onRouteChange,
    onStartNewResearch,
    toggleTheme,
    onOpenHelp,
    onOpenAuth,
    onOpenResearchItem,
  ]);

  // Filter actions based on search query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const lower = query.toLowerCase().trim();
    return actions.filter((action) => {
      if (action.title.toLowerCase().includes(lower)) return true;
      if (action.description?.toLowerCase().includes(lower)) return true;
      if (action.keywords?.some((k) => k.toLowerCase().includes(lower))) return true;
      if (action.category.toLowerCase().includes(lower)) return true;
      return false;
    });
  }, [actions, query]);

  // Keep selectedIndex within bounds
  useEffect(() => {
    if (selectedIndex >= filteredActions.length) {
      setSelectedIndex(Math.max(0, filteredActions.length - 1));
    }
  }, [filteredActions.length, selectedIndex]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredActions[selectedIndex];
      if (selected) {
        selected.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-3 sm:px-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick Command Palette"
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#161813] rounded-2xl shadow-2xl border border-[#E8E8E5] dark:border-[#282D22] overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E8E8E5] dark:border-[#282D22] bg-white dark:bg-[#161813]">
          <Search className="w-5 h-5 text-[#717171] dark:text-[#9EA396] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, query, or navigate..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[#191919] dark:text-[#EDEDE8] placeholder:text-[#9E9E99] dark:placeholder:text-[#6E7366] focus:outline-none"
            autoFocus
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-[#717171] hover:text-[#191919] dark:text-[#9EA396] dark:hover:text-[#EDEDE8] hover:bg-[#F1F2ED] dark:hover:bg-[#22271D] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-[#717171] dark:text-[#9EA396] bg-[#F1F2ED] dark:bg-[#22271D] border border-[#E8E8E5] dark:border-[#2E3326] rounded">
              ESC to exit
            </kbd>
          )}
        </div>

        {/* Filtered Action List */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-10 text-center px-4">
              <CommandIcon className="w-8 h-8 mx-auto text-[#9E9E99] dark:text-[#6E7366] mb-2 opacity-50" />
              <p className="text-sm font-medium text-[#191919] dark:text-[#EDEDE8]">No matching commands found</p>
              <p className="text-xs text-[#717171] dark:text-[#9EA396] mt-1">
                Try searching for "theme", "deep", "library", "new", or type a question.
              </p>
            </div>
          ) : (
            filteredActions.map((action, index) => {
              const isSelected = index === selectedIndex;
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  data-active={isSelected}
                  onClick={() => action.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left ${
                    isSelected
                      ? 'bg-[#B8F36B]/20 dark:bg-[#B8F36B]/15 text-[#102000] dark:text-[#D6FF8E] border border-[#B8F36B]/50'
                      : 'hover:bg-[#F6F3F2] dark:hover:bg-[#1E221A] text-[#191919] dark:text-[#ECEEE6] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#B8F36B] text-[#102000]'
                          : 'bg-[#F1F2ED] dark:bg-[#22271D] text-[#717171] dark:text-[#9EA396]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium truncate">{action.title}</span>
                        {action.category === 'Quick Search' && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#B8F36B] text-[#102000]">
                            <Sparkles className="w-2.5 h-2.5" />
                            Live
                          </span>
                        )}
                      </div>
                      {action.description && (
                        <p className="text-[11px] text-[#717171] dark:text-[#9EA396] truncate mt-0.5">
                          {action.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-[#9E9E99] dark:text-[#6E7366] font-mono hidden sm:inline-block">
                      {action.category}
                    </span>
                    {action.shortcutHint && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#F1F2ED] dark:bg-[#22271D] text-[#717171] dark:text-[#9EA396] rounded border border-[#E8E8E5] dark:border-[#2E3326]">
                        {action.shortcutHint}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-[#416900] dark:text-[#B8F36B]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-[#E8E8E5] dark:border-[#282D22] bg-[#FAFAF8] dark:bg-[#12140F] flex items-center justify-between text-[11px] text-[#717171] dark:text-[#9EA396]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white dark:bg-[#1E221A] px-1 py-0.5 rounded border border-[#E8E8E5] dark:border-[#2E3326] mr-1">
                ↑
              </kbd>
              <kbd className="font-mono bg-white dark:bg-[#1E221A] px-1 py-0.5 rounded border border-[#E8E8E5] dark:border-[#2E3326] mr-1">
                ↓
              </kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-[#1E221A] px-1.5 py-0.5 rounded border border-[#E8E8E5] dark:border-[#2E3326] mr-1">
                ↵
              </kbd>
              Select
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8F36B]" />
            <span>Openquire Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
