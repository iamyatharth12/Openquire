import React, { useState, useEffect } from 'react';
import {
  Search,
  FlaskConical,
  Bookmark,
  Upload,
  Cpu,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Menu,
  X,
  History,
  ArrowRight,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  HardDrive,
  Cloud,
  Info,
  User as UserIcon,
  Globe,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { NavRoute } from '../../types/navigation';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AuthModal } from '../auth/AuthModal';
import { OnboardingModal } from '../onboarding/OnboardingModal';
import { CommandPalette } from '../navigation/CommandPalette';

interface AppShellProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  onOpenResearchItem?: (id: string) => void;
  onExecuteSearch?: (query: string, mode: 'web' | 'deep') => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  onOpenResearchItem,
  onExecuteSearch,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Global Theme Management
  const { theme, isDark, toggleTheme } = useTheme();

  // Detect platform for keyboard shortcut (⌘K on Mac, Ctrl+K on Windows/Linux)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl+K';

  // Global keyboard shortcuts (Cmd+K / Ctrl+K for quick command, Escape to close)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        } else if (showHelpModal) {
          setShowHelpModal(false);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [commandPaletteOpen, mobileMenuOpen, showHelpModal]);

  // Dynamic conversation state & operations
  const {
    conversations,
    activeId,
    selectConversation,
    createNewConversation,
    renameConversation,
    deleteConversation,
    storageType,
  } = useConversations();

  // Supabase User Authentication
  const {
    user,
    displayName,
    avatarUrl,
    isAuthenticated,
    openAuthModal,
    onboardingOpen,
    closeOnboarding,
    completeOnboarding,
  } = useAuth();

  const userInitials = displayName
    ? displayName.substring(0, 2).toUpperCase()
    : user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'OP';
  const userDisplayName = displayName;
  const userEmail = user?.email || 'Local Storage (IndexedDB)';

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const navItems = [
    { id: 'home' as NavRoute, label: 'Home', icon: Search },
    { id: 'deep-research' as NavRoute, label: 'Deep Research', icon: FlaskConical },
    { id: 'library' as NavRoute, label: 'Library', icon: Bookmark },
    { id: 'uploads' as NavRoute, label: 'Uploads', icon: Upload },
    { id: 'settings-providers' as NavRoute, label: 'AI Providers', icon: Cpu },
  ];

  const handleStartNewResearch = async () => {
    try {
      const created = await createNewConversation();
      if (onOpenResearchItem) {
        onOpenResearchItem(created.id);
      }
      onRouteChange('home');
      setMobileMenuOpen(false);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
      onRouteChange('home');
    }
  };

  const handleSelectConversation = async (id: string, mode: 'web' | 'deep' | 'quick') => {
    await selectConversation(id);
    if (mode === 'deep') {
      onRouteChange('deep-research');
    } else {
      onRouteChange('research');
    }
    if (onOpenResearchItem) onOpenResearchItem(id);
    setMobileMenuOpen(false);
  };

  const startRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const submitRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingId || !editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await renameConversation(editingId, editingTitle.trim());
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    } finally {
      setEditingId(null);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  return (
    <div
      className={`min-h-[100dvh] min-h-screen bg-[#FAFAF8] dark:bg-[#0E100C] text-[#191919] dark:text-[#ECEEE6] flex w-full max-w-full overflow-x-hidden ${
        isDark ? 'dark' : ''
      }`}
    >
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col justify-between fixed left-0 top-0 h-screen bg-[#F6F3F2] dark:bg-[#131510] border-r border-[#E8E8E5] dark:border-[#22271B] z-30 transition-all duration-200 select-none ${
          sidebarCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header row: Logo & collapse toggle */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#E8E8E5]/50 dark:border-[#22271B]">
            {!sidebarCollapsed ? (
              <button
                onClick={() => onRouteChange('home')}
                className="flex items-center hover:opacity-80 transition-opacity text-left cursor-pointer"
              >
                <Logo size="md" showWordmark={true} />
              </button>
            ) : (
              <button
                onClick={() => onRouteChange('home')}
                className="mx-auto hover:opacity-80 transition-opacity cursor-pointer"
                title="Openquire Home"
              >
                <Logo size="sm" showWordmark={false} />
              </button>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A] transition-colors cursor-pointer"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* New Research Action Button */}
          <div className="p-3">
            <button
              onClick={handleStartNewResearch}
              className={`w-full flex items-center justify-center gap-2 bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-medium rounded-full py-2 px-3 shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                sidebarCollapsed ? 'px-0 h-10' : ''
              }`}
              title="New Research"
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
              {!sidebarCollapsed && <span className="text-sm font-semibold">New Research</span>}
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onRouteChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-semibold'
                      : 'text-[#434938] dark:text-[#9EA396] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Recent History Section (Hidden if collapsed) */}
          {!sidebarCollapsed && (
            <div className="flex-1 min-h-0 flex flex-col px-4 pt-5 pb-2">
              <div className="flex items-center justify-between pb-2 text-xs font-semibold uppercase tracking-wider text-[#717171] dark:text-[#808678]">
                <span>Recent</span>
                <History className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-[#717171] dark:text-[#808678] italic py-2">No research sessions yet.</p>
                ) : (
                  conversations.map((item) => {
                    const isSelected = activeId === item.id;
                    const isEditing = editingId === item.id;

                    if (isEditing) {
                      return (
                        <form
                          key={item.id}
                          onSubmit={submitRename}
                          className="flex items-center gap-1 py-1"
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => submitRename()}
                            autoFocus
                            className="w-full text-xs bg-white dark:bg-[#1B1E17] border border-[#B8F36B] rounded px-1.5 py-1 text-[#191919] dark:text-[#ECEEE6] focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="p-1 text-[#416900] hover:text-[#102000] dark:text-[#B8F36B]"
                            title="Save"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className={`group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-semibold'
                            : 'text-[#434938] dark:text-[#9EA396] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
                        }`}
                        onClick={() => handleSelectConversation(item.id, item.mode)}
                      >
                        <span className="truncate flex-1 pr-2" title={item.title}>
                          {item.title}
                        </span>

                        {/* Hover actions: rename & delete */}
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startRename(e, item.id, item.title)}
                            className="p-1 rounded text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#DCDFD0] dark:hover:bg-[#2C3325] transition-colors"
                            title="Rename conversation"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteConversation(e, item.id)}
                            className="p-1 rounded text-[#717171] dark:text-[#9EA396] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[#DCDFD0] dark:hover:bg-[#2C3325] transition-colors"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                <button
                  onClick={() => onRouteChange('library')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] font-medium transition-colors cursor-pointer mt-1"
                >
                  <span>View all in Library</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Local Storage / Supabase Sync Status Notice */}
              <div className="pt-2 pb-1 border-t border-[#E8E8E5]/70 dark:border-[#22271B] text-[11px] text-[#717171] dark:text-[#9EA396] flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate" title={storageType === 'supabase' ? 'Persisting to remote Supabase PostgreSQL with RLS' : 'Persisting in browser IndexedDB vault'}>
                  {storageType === 'supabase' ? (
                    <Cloud className="w-3 h-3 text-[#416900] dark:text-[#B8F36B]" />
                  ) : (
                    <HardDrive className="w-3 h-3 text-[#717171] dark:text-[#9EA396]" />
                  )}
                  <span className="truncate">
                    {storageType === 'supabase' ? 'Supabase Synced' : 'Local Storage (IndexedDB)'}
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#EAEBE4] dark:bg-[#20251A] text-[#434938] dark:text-[#9EA396]">
                  {storageType === 'supabase' ? 'Cloud' : 'Browser'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / User Profile */}
        <div className="p-3 border-t border-[#E8E8E5]/60 dark:border-[#22271B] bg-[#F0EDED] dark:bg-[#10120D]">
          <div className="flex items-center justify-between gap-2">
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => openAuthModal('profile')}
                className={`flex items-center gap-2.5 min-w-0 text-left transition-opacity hover:opacity-85 cursor-pointer ${
                  sidebarCollapsed ? 'justify-center w-full' : ''
                }`}
                title="Account profile & Supabase Cloud settings"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userDisplayName}
                    className="w-8 h-8 rounded-full object-cover border border-[#A7EB50] shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#B8F36B] text-[#102000] font-bold flex items-center justify-center shrink-0 text-xs border border-[#A7EB50]">
                    {userInitials}
                  </div>
                )}
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6] truncate">{userDisplayName}</p>
                    <p className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396] truncate">{userEmail}</p>
                  </div>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('sign_in')}
                className={`flex items-center gap-2.5 min-w-0 text-left transition-opacity hover:opacity-85 cursor-pointer ${
                  sidebarCollapsed ? 'justify-center w-full' : ''
                }`}
                title="Sign in with Email or Google to sync research across devices"
              >
                <div className="w-8 h-8 rounded-full bg-[#E0E5D3] dark:bg-[#20251A] text-[#434938] dark:text-[#D6FF8E] flex items-center justify-center shrink-0 text-xs border border-[#C2C9B3] dark:border-[#2E3524]">
                  <UserIcon className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">Sign in</p>
                    <p className="text-[11px] text-[#717171] dark:text-[#9EA396] truncate">Sync history across devices</p>
                  </div>
                )}
              </button>
            )}

            {!sidebarCollapsed && (
              <button
                onClick={() => onRouteChange('settings-providers')}
                className="p-1.5 text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#EAE7E7] dark:hover:bg-[#1E221A] rounded-lg transition-colors cursor-pointer shrink-0"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE TOP HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 dark:bg-[#131510]/95 backdrop-blur-md border-b border-[#E8E8E5] dark:border-[#22271B] z-40 px-3 sm:px-4 flex items-center justify-between pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] active:bg-[#F1F2ED] dark:active:bg-[#1E221A] rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={() => onRouteChange('home')}
            className="flex items-center text-left cursor-pointer"
            title="Openquire Home"
          >
            <Logo size="sm" showWordmark={true} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Mobile Quick Command Button */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-9 h-9 flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] active:bg-[#F1F2ED] dark:active:bg-[#1E221A] rounded-xl transition-colors cursor-pointer"
            aria-label={`Open command palette (${shortcutLabel})`}
            title="Quick command"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Mobile Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] active:bg-[#F1F2ED] dark:active:bg-[#1E221A] rounded-xl transition-colors cursor-pointer"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme appearance"
          >
            {isDark ? <Sun className="w-4 h-4 text-[#B8F36B]" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated && user ? (
            <button
              onClick={() => openAuthModal('profile')}
              className="w-9 h-9 rounded-full overflow-hidden border border-[#A7EB50] cursor-pointer flex items-center justify-center active:scale-95 transition-transform ml-1"
              title={`Signed in as ${user.email} (click to view profile & cloud settings)`}
              aria-label="User profile and settings"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userDisplayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#B8F36B] text-[#102000] font-bold flex items-center justify-center text-xs">
                  {userInitials}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('sign_in')}
              className="px-3 py-1.5 min-h-[36px] flex items-center rounded-full bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold text-xs cursor-pointer shadow-2xs active:scale-95 transition-all ml-1"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* MOBILE FLYOUT DRAWER */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div className="w-[min(320px,85vw)] bg-[#F6F3F2] dark:bg-[#131510] h-full shadow-2xl flex flex-col justify-between p-4 overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))] animate-in slide-in-from-left duration-200 border-r border-transparent dark:border-[#22271B]">
            <div className="flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E8E8E5] dark:border-[#22271B]">
                <Logo size="md" showWordmark={true} showTagline={true} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A] active:scale-95 transition-all cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="pt-3">
                <button
                  onClick={handleStartNewResearch}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[#B8F36B] active:bg-[#A7EB50] text-[#102000] font-semibold rounded-full py-2.5 px-4 shadow-xs mb-3 transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span className="text-sm">New Research</span>
                </button>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentRoute === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onRouteChange(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-semibold'
                            : 'text-[#434938] dark:text-[#9EA396] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A] active:bg-[#E0E5D3]/60'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Mobile Recent Research Sessions */}
                <div className="pt-4 mt-2 border-t border-[#E8E8E5]/70 dark:border-[#22271B]">
                  <div className="flex items-center justify-between pb-2 text-xs font-semibold uppercase tracking-wider text-[#717171] dark:text-[#808678]">
                    <span>Recent History</span>
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                    {conversations.length === 0 ? (
                      <p className="text-xs text-[#717171] dark:text-[#808678] italic py-2">No research sessions yet.</p>
                    ) : (
                      conversations.slice(0, 6).map((item) => {
                        const isSelected = activeId === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs min-h-[38px] transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-semibold'
                                : 'text-[#434938] dark:text-[#9EA396] hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A]'
                            }`}
                            onClick={() => handleSelectConversation(item.id, item.mode)}
                          >
                            <span className="truncate flex-1 pr-2">{item.title}</span>
                            <span className="text-[10px] font-mono text-[#717171] dark:text-[#808678] uppercase shrink-0">
                              {item.mode}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onRouteChange('library');
                      setMobileMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] font-medium transition-colors cursor-pointer mt-1"
                  >
                    <span>View all in Library</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Drawer Footer: Sync Status & User Profile */}
            <div className="border-t border-[#E8E8E5] dark:border-[#22271B] pt-3 mt-3 space-y-2.5">
              <div className="text-[11px] text-[#717171] dark:text-[#9EA396] flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate">
                  {storageType === 'supabase' ? (
                    <Cloud className="w-3 h-3 text-[#416900] dark:text-[#B8F36B]" />
                  ) : (
                    <HardDrive className="w-3 h-3 text-[#717171] dark:text-[#9EA396]" />
                  )}
                  <span className="truncate">
                    {storageType === 'supabase' ? 'Supabase Synced' : 'Local Storage'}
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#EAEBE4] dark:bg-[#20251A] text-[#434938] dark:text-[#9EA396]">
                  {storageType === 'supabase' ? 'Cloud' : 'Browser'}
                </span>
              </div>

              {isAuthenticated && user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('profile');
                  }}
                  className="flex items-center gap-2.5 text-left w-full p-1.5 rounded-xl hover:bg-[#EAEBE4] dark:hover:bg-[#1E221A] active:bg-[#E0E5D3]/60 transition-colors cursor-pointer"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userDisplayName} className="w-8 h-8 rounded-full object-cover border border-[#A7EB50] shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#B8F36B] text-[#102000] font-bold flex items-center justify-center text-xs border border-[#A7EB50] shrink-0">
                      {userInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6] truncate">{userDisplayName}</p>
                    <p className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396] truncate">{userEmail}</p>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('sign_in');
                  }}
                  className="flex items-center gap-2.5 text-left w-full p-2 rounded-xl bg-white dark:bg-[#191C15] border border-[#E8E8E5] dark:border-[#282D22] hover:bg-[#F9F9F7] dark:hover:bg-[#20241B] active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] text-[#434938] dark:text-[#D6FF8E] flex items-center justify-center text-xs border border-[#C2C9B3] dark:border-[#2E3524] shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">Sign in</p>
                    <p className="text-[11px] text-[#717171] dark:text-[#9EA396] truncate">Sync research across devices</p>
                  </div>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* MAIN VIEWPORT CONTAINER */}
      <div
        className={`flex-1 flex flex-col min-h-[100dvh] min-h-screen min-w-0 w-full transition-all duration-200 ${
          sidebarCollapsed ? 'md:pl-18' : 'md:pl-64'
        }`}
      >
        {/* TOP DESKTOP HEADER */}
        <header className="hidden md:flex h-16 bg-white/80 dark:bg-[#131510]/85 backdrop-blur-md border-b border-[#E8E8E5] dark:border-[#22271B] sticky top-0 z-20 items-center justify-between px-6 transition-colors">
          {/* Breadcrumb location */}
          <div className="flex items-center gap-2 text-xs text-[#717171] dark:text-[#9EA396]">
            <span className="text-[#191919] dark:text-[#ECEEE6] font-medium">Workspace</span>
            <span className="text-[#DFE0DC] dark:text-[#323829]">/</span>
            <span className="text-[#434938] dark:text-[#A7AC9E] font-medium">Research Core</span>
            {currentRoute !== 'home' && (
              <>
                <span className="text-[#DFE0DC] dark:text-[#323829]">/</span>
                <span className="capitalize text-[#191919] dark:text-[#ECEEE6] font-semibold">
                  {currentRoute.replace('-', ' ')}
                </span>
              </>
            )}
          </div>

          {/* Quick command & Utilities */}
          <div className="flex items-center gap-3">
            {/* Quick command button with platform-aware shortcut badge */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 bg-[#F6F3F2] dark:bg-[#1A1D16] hover:bg-[#EAEBE4] dark:hover:bg-[#23281E] px-3 py-1.5 rounded-full text-xs text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] border border-transparent dark:border-[#2C3125] transition-colors cursor-pointer shadow-2xs"
              title={`Open quick command palette (${shortcutLabel})`}
              aria-label={`Open quick command palette (${shortcutLabel})`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quick command</span>
              <kbd className="bg-white dark:bg-[#12140F] px-1.5 py-0.5 rounded text-[10px] font-mono shadow-2xs border border-[#E8E8E5] dark:border-[#2C3125] text-[#191919] dark:text-[#ECEEE6]">
                {shortcutLabel}
              </kbd>
            </button>

            {/* Help Button */}
            <button
              type="button"
              onClick={() => setShowHelpModal(!showHelpModal)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#F1F2ED] dark:hover:bg-[#1E221A] transition-colors cursor-pointer"
              title="Help & Documentation"
              aria-label="Open help and documentation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#F1F2ED] dark:hover:bg-[#1E221A] transition-colors cursor-pointer"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme appearance"
            >
              {isDark ? <Sun className="w-4 h-4 text-[#B8F36B]" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="h-4 w-px bg-[#E8E8E5] dark:bg-[#2A3022] mx-1" />

            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => openAuthModal('profile')}
                className="w-8 h-8 rounded-full bg-[#B8F36B] text-[#102000] font-bold ring-2 ring-[#B8F36B] flex items-center justify-center text-xs cursor-pointer hover:scale-105 transition-transform"
                title={`Signed in as ${user.email} (click to view profile & cloud settings)`}
              >
                {userInitials}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('sign_in')}
                className="flex items-center gap-1.5 bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold px-3 py-1.5 rounded-full text-xs shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 w-full min-w-0 pt-14 md:pt-0 pb-20 md:pb-6">{children}</main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-white/95 dark:bg-[#131510]/95 backdrop-blur-md border-t border-[#E8E8E5] dark:border-[#22271B] z-30 flex items-center justify-around px-1"
          aria-label="Mobile Bottom Navigation"
        >
          <button
            onClick={() => onRouteChange('home')}
            className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors cursor-pointer ${
              currentRoute === 'home' ? 'text-[#181D13] dark:text-[#D6FF8E] font-bold' : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => onRouteChange('deep-research')}
            className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors cursor-pointer ${
              currentRoute === 'deep-research' ? 'text-[#181D13] dark:text-[#D6FF8E] font-bold' : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Deep</span>
          </button>
          <button
            onClick={() => onRouteChange('research')}
            className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors cursor-pointer ${
              currentRoute === 'research' ? 'text-[#181D13] dark:text-[#D6FF8E] font-bold' : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Research</span>
          </button>
          <button
            onClick={() => onRouteChange('library')}
            className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors cursor-pointer ${
              currentRoute === 'library' ? 'text-[#181D13] dark:text-[#D6FF8E] font-bold' : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Library</span>
          </button>
          <button
            onClick={() => onRouteChange('settings-providers')}
            className={`flex-1 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors cursor-pointer ${
              currentRoute === 'settings-providers' ? 'text-[#181D13] dark:text-[#D6FF8E] font-bold' : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Quick Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onRouteChange={onRouteChange}
        onStartNewResearch={handleStartNewResearch}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenAuth={() => openAuthModal(isAuthenticated ? 'profile' : 'sign_in')}
        onOpenResearchItem={onOpenResearchItem}
        onExecuteSearch={onExecuteSearch}
      />

      {/* Help & Architecture Dialog */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowHelpModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Openquire Architecture & Guide"
        >
          <div
            className="bg-white dark:bg-[#161813] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-[#E8E8E5] dark:border-[#282D22] space-y-4 max-h-[85dvh] overflow-y-auto animate-in zoom-in-95 duration-150 text-[#191919] dark:text-[#ECEEE6] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E8E8E5] dark:border-[#282D22] pb-3">
              <h3 className="text-base font-semibold text-[#191919] dark:text-[#ECEEE6]">Openquire Architecture & Guide</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F1F2ED] dark:hover:bg-[#20251A] text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] cursor-pointer transition-colors"
                aria-label="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#434938] dark:text-[#A7AC9E] leading-relaxed">
              <p>
                <strong className="text-[#191919] dark:text-[#ECEEE6]">Quick Command:</strong> Press <kbd className="px-1.5 py-0.5 font-mono text-[11px] bg-[#F1F2ED] dark:bg-[#20251A] rounded border border-[#E8E8E5] dark:border-[#2E3326] text-[#191919] dark:text-[#ECEEE6]">{shortcutLabel}</kbd> at any time to open the command palette, navigate across sections, run instant queries, or switch themes.
              </p>
              <p>
                <strong className="text-[#191919] dark:text-[#ECEEE6]">Grounded Research:</strong> Every statement is cited using verified evidence retrieved from authoritative web sources with exact citation mapping.
              </p>
              <p>
                <strong className="text-[#191919] dark:text-[#ECEEE6]">Dark / Light Theme:</strong> Click the Moon/Sun toggle in the top header or press <kbd className="px-1 py-0.5 font-mono text-[10px] bg-[#F1F2ED] dark:bg-[#20251A] rounded text-[#191919] dark:text-[#ECEEE6]">{shortcutLabel}</kbd> → "Switch Theme" to toggle your preference. Your setting is persisted in your browser.
              </p>
              <p>
                <strong className="text-[#191919] dark:text-[#ECEEE6]">Conversation Persistence:</strong> Conversations survive page refreshes and are saved locally in your browser’s IndexedDB vault. If Supabase is configured with <code className="bg-[#F1F2ED] dark:bg-[#20251A] px-1 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_URL</code>, history syncs across devices using PostgreSQL Row-Level Security.
              </p>
              <p>
                <strong className="text-[#191919] dark:text-[#ECEEE6]">Generation Cancellation:</strong> Click the square Stop button in the composer at any time during synthesis to immediately abort the request, preserve partial evidence, and restore the composer.
              </p>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 min-h-[44px] bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Supabase Authentication & Profile Modal */}
      <AuthModal />

      {/* Onboarding Experience Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={closeOnboarding}
        onComplete={completeOnboarding}
      />
    </div>
  );
};
