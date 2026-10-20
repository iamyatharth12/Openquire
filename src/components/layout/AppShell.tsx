import React, { useState } from 'react';
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
  ExternalLink,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  HardDrive,
  Cloud,
  Info,
  User as UserIcon,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { NavRoute } from '../../types/navigation';
import { useConversations } from '../../hooks/useConversations';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { OnboardingModal } from '../onboarding/OnboardingModal';

interface AppShellProps {
  currentRoute: NavRoute;
  onRouteChange: (route: NavRoute) => void;
  onOpenResearchItem?: (id: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  onOpenResearchItem,
  children,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

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
    profile,
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
    <div className={`min-h-screen bg-[#FAFAF8] text-[#191919] flex ${isDarkMode ? 'dark' : ''}`}>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col justify-between fixed left-0 top-0 h-screen bg-[#F6F3F2] border-r border-[#E8E8E5] z-30 transition-all duration-200 select-none ${
          sidebarCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header row: Logo & collapse toggle */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#E8E8E5]/50">
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
              className="p-1.5 rounded-lg text-[#717171] hover:text-[#191919] hover:bg-[#EAEBE4] transition-colors cursor-pointer"
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
                      ? 'bg-[#E0E5D3] text-[#181D13] font-semibold'
                      : 'text-[#434938] hover:bg-[#EAEBE4] hover:text-[#191919]'
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
              <div className="flex items-center justify-between pb-2 text-xs font-semibold uppercase tracking-wider text-[#717171]">
                <span>Recent</span>
                <History className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {conversations.length === 0 ? (
                  <p className="text-xs text-[#717171] italic py-2">No research sessions yet.</p>
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
                            className="w-full text-xs bg-white border border-[#B8F36B] rounded px-1.5 py-1 text-[#191919] focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="p-1 text-[#416900] hover:text-[#102000]"
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
                            ? 'bg-[#E0E5D3] text-[#181D13] font-semibold'
                            : 'text-[#434938] hover:bg-[#EAEBE4] hover:text-[#191919]'
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
                            className="p-1 rounded text-[#717171] hover:text-[#191919] hover:bg-[#DCDFD0] transition-colors"
                            title="Rename conversation"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteConversation(e, item.id)}
                            className="p-1 rounded text-[#717171] hover:text-rose-600 hover:bg-[#DCDFD0] transition-colors"
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
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#717171] hover:text-[#191919] font-medium transition-colors cursor-pointer mt-1"
                >
                  <span>View all in Library</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Local Storage / Supabase Sync Status Notice */}
              <div className="pt-2 pb-1 border-t border-[#E8E8E5]/70 text-[11px] text-[#717171] flex items-center justify-between">
                <div className="flex items-center gap-1.5 truncate" title={storageType === 'supabase' ? 'Persisting to remote Supabase PostgreSQL with RLS' : 'Persisting in browser IndexedDB vault'}>
                  {storageType === 'supabase' ? (
                    <Cloud className="w-3 h-3 text-[#416900]" />
                  ) : (
                    <HardDrive className="w-3 h-3 text-[#717171]" />
                  )}
                  <span className="truncate">
                    {storageType === 'supabase' ? 'Supabase Synced' : 'Local Storage (IndexedDB)'}
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#EAEBE4] text-[#434938]">
                  {storageType === 'supabase' ? 'Cloud' : 'Browser'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer / User Profile */}
        <div className="p-3 border-t border-[#E8E8E5]/60 bg-[#F0EDED]">
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
                    <p className="text-xs font-semibold text-[#191919] truncate">{userDisplayName}</p>
                    <p className="text-[11px] font-mono text-[#717171] truncate">{userEmail}</p>
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
                <div className="w-8 h-8 rounded-full bg-[#E0E5D3] text-[#434938] flex items-center justify-center shrink-0 text-xs border border-[#C2C9B3]">
                  <UserIcon className="w-4 h-4" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#191919]">Sign in</p>
                    <p className="text-[11px] text-[#717171] truncate">Sync history across devices</p>
                  </div>
                )}
              </button>
            )}

            {!sidebarCollapsed && (
              <button
                onClick={() => onRouteChange('settings-providers')}
                className="p-1.5 text-[#717171] hover:text-[#191919] hover:bg-[#EAE7E7] rounded-lg transition-colors cursor-pointer shrink-0"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE TOP HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-[#E8E8E5] z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#717171] hover:text-[#191919]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Logo size="sm" showWordmark={true} />
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <button
              onClick={() => openAuthModal('profile')}
              className="w-8 h-8 rounded-full overflow-hidden border border-[#A7EB50] cursor-pointer flex items-center justify-center"
              title={user.email}
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
              className="px-2.5 py-1 rounded-full bg-[#B8F36B] text-[#102000] font-semibold text-xs cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* MOBILE FLYOUT DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex">
          <div className="w-72 bg-[#F6F3F2] h-full shadow-xl flex flex-col justify-between p-4 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
                <Logo size="md" showWordmark={true} showTagline={true} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#717171] hover:text-[#191919]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    onRouteChange('home');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#B8F36B] text-[#102000] font-semibold rounded-full py-2 px-3 shadow-xs mb-4"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Research</span>
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
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                          isActive
                            ? 'bg-[#E0E5D3] text-[#181D13] font-semibold'
                            : 'text-[#434938] hover:bg-[#EAEBE4]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            <div className="border-t border-[#E8E8E5] pt-3 flex items-center justify-between">
              {isAuthenticated && user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('profile');
                  }}
                  className="flex items-center gap-2.5 text-left w-full hover:opacity-80 transition-opacity cursor-pointer"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userDisplayName} className="w-8 h-8 rounded-full object-cover border border-[#A7EB50] shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#B8F36B] text-[#102000] font-bold flex items-center justify-center text-xs border border-[#A7EB50] shrink-0">
                      {userInitials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#191919] truncate">{userDisplayName}</p>
                    <p className="text-[11px] font-mono text-[#717171] truncate">{userEmail}</p>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal('sign_in');
                  }}
                  className="flex items-center gap-2.5 text-left w-full hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E0E5D3] text-[#434938] flex items-center justify-center text-xs border border-[#C2C9B3] shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#191919]">Sign in</p>
                    <p className="text-[11px] text-[#717171] truncate">Sync research across devices</p>
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
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'md:pl-18' : 'md:pl-64'
        }`}
      >
        {/* TOP DESKTOP HEADER */}
        <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-md border-b border-[#E8E8E5] sticky top-0 z-20 items-center justify-between px-6">
          {/* Breadcrumb location */}
          <div className="flex items-center gap-2 text-xs text-[#717171]">
            <span className="text-[#191919] font-medium">Workspace</span>
            <span className="text-[#DFE0DC]">/</span>
            <span className="text-[#434938] font-medium">Research Core</span>
            {currentRoute !== 'home' && (
              <>
                <span className="text-[#DFE0DC]">/</span>
                <span className="capitalize text-[#191919] font-semibold">
                  {currentRoute.replace('-', ' ')}
                </span>
              </>
            )}
          </div>

          {/* Quick command & Utilities */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onRouteChange('home')}
              className="flex items-center gap-2 bg-[#F6F3F2] hover:bg-[#EAEBE4] px-3 py-1.5 rounded-full text-xs text-[#717171] hover:text-[#191919] transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quick command</span>
              <kbd className="bg-white px-1.5 py-0.5 rounded text-[10px] font-mono shadow-2xs border border-[#E8E8E5]">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => setShowHelpModal(!showHelpModal)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#717171] hover:text-[#191919] hover:bg-[#F1F2ED] transition-colors cursor-pointer"
              title="Help & Documentation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#717171] hover:text-[#191919] hover:bg-[#F1F2ED] transition-colors"
              title="Toggle theme appearance"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="h-4 w-px bg-[#E8E8E5] mx-1" />

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
        <main className="flex-1 pt-14 md:pt-0 pb-16 md:pb-6">{children}</main>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#E8E8E5] z-30 flex items-center justify-around px-2">
          <button
            onClick={() => onRouteChange('home')}
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              currentRoute === 'home' ? 'text-[#181D13] font-bold' : 'text-[#717171]'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => onRouteChange('research')}
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              currentRoute === 'research' ? 'text-[#181D13] font-bold' : 'text-[#717171]'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span>Research</span>
          </button>
          <button
            onClick={() => onRouteChange('library')}
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              currentRoute === 'library' ? 'text-[#181D13] font-bold' : 'text-[#717171]'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Library</span>
          </button>
          <button
            onClick={() => onRouteChange('settings-providers')}
            className={`flex flex-col items-center gap-0.5 text-[11px] ${
              currentRoute === 'settings-providers' ? 'text-[#181D13] font-bold' : 'text-[#717171]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      {/* Help & Architecture Dialog */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E8E8E5] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E8E8E5] pb-3">
              <h3 className="text-base font-semibold text-[#191919]">Openquire Architecture & Guide</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F1F2ED] text-[#717171] hover:text-[#191919] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#434938] leading-relaxed">
              <p>
                <strong className="text-[#191919]">Grounded Research:</strong> Every statement is cited using verified evidence retrieved from authoritative web sources with exact citation mapping.
              </p>
              <p>
                <strong className="text-[#191919]">Conversation Persistence:</strong> Conversations survive page refreshes and are saved locally in your browser’s IndexedDB vault. If Supabase is configured with <code className="bg-[#F1F2ED] px-1 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_URL</code>, history syncs across devices using PostgreSQL Row-Level Security.
              </p>
              <p>
                <strong className="text-[#191919]">Generation Cancellation:</strong> Click the square Stop button in the composer at any time during synthesis to immediately abort the request, preserve partial evidence, and restore the composer.
              </p>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
