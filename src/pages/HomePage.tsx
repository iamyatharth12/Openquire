import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Globe,
  Zap,
  FlaskConical,
  ArrowRight,
  Sparkles,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { ResearchMode, NavRoute } from '../types/navigation';
import { useModelSelection } from '../hooks/useModelSelection';
import { ComposerModelSelector } from '../components/research/ComposerModelSelector';
import { useConversations } from '../hooks/useConversations';

interface HomePageProps {
  onStartResearch: (query: string, mode: ResearchMode, model: string) => void;
  onNavigate: (route: NavRoute) => void;
  onOpenItem?: (id: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStartResearch, onNavigate, onOpenItem }) => {
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<ResearchMode>('web');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const { isConfigured, selectedModel, availableModels, selectModel } = useModelSelection();
  const { conversations } = useConversations();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut listener: Press "/" to focus composer when not already in an input/textarea
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      textareaRef.current?.focus();
      return;
    }
    onStartResearch(query.trim(), selectedMode, selectedModel);
  };

  const exampleQueries = [
    { text: 'How will AI impact jobs in the next decade?', mode: 'web' as ResearchMode },
    { text: 'Compare electric vs hybrid cars in 2025', mode: 'web' as ResearchMode },
    { text: 'Explain quantum computing simply', mode: 'quick' as ResearchMode },
    { text: 'Best countries for remote work in 2025', mode: 'web' as ResearchMode },
  ];

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdShortcut = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <div className="relative w-full max-w-full overflow-hidden flex flex-col items-center px-3 sm:px-8 py-6 sm:py-8 md:py-12">
      {/* Subtle Ambient Accent Glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[min(620px,90vw)] h-[280px] sm:h-[300px] bg-[#B8F36B]/15 dark:bg-[#B8F36B]/8 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Editorial Canvas */}
      <div className="w-full max-w-[760px] mx-auto flex flex-col items-center min-w-0">
        {/* Brand Header Group */}
        <div className="flex flex-col items-center text-center space-y-2 mb-5 sm:mb-7">
          <Logo size="lg" showWordmark={true} showTagline={true} />
        </div>

        {/* Hero Prompt Statement */}
        <div className="text-center space-y-1.5 mb-5 sm:mb-7 px-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[#191919] dark:text-[#ECEEE6] break-words">
            What are we researching today?
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-[#717171] dark:text-[#9EA396] max-w-lg mx-auto leading-relaxed">
            Explore the web, investigate complex questions, and follow the evidence.
          </p>
        </div>

        {/* Main Research Console Card */}
        <form
          onSubmit={handleFormSubmit}
          className="w-full bg-white dark:bg-[#151711] rounded-2xl border border-[#E8E8E5] dark:border-[#242A1D] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-3.5 sm:p-5 transition-all focus-within:shadow-[0_4px_24px_rgba(65,105,0,0.12)] focus-within:border-[#B8F36B] dark:focus-within:border-[#B8F36B]"
        >
          {/* Textarea */}
          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit();
                }
              }}
              rows={3}
              placeholder="Ask anything..."
              className="w-full resize-none bg-transparent text-sm sm:text-base md:text-lg text-[#191919] dark:text-[#ECEEE6] placeholder:text-[#9E9E99] dark:placeholder:text-[#646A5B] focus:outline-none leading-relaxed"
            />
          </div>

          {/* Controls Toolbar */}
          <div className="mt-3 pt-3 border-t border-[#E8E8E5]/60 dark:border-[#242A1D] flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
            {/* Left Controls: Attach, Mode, Model */}
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={() => onNavigate('uploads')}
                className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#F1F2ED] dark:hover:bg-[#1E221A] transition-colors cursor-pointer"
                title="Attach research files or notes"
                aria-label="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Research Mode Selector Pill */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => {
                    setModeMenuOpen(!modeMenuOpen);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full bg-[#F6F3F2] dark:bg-[#1A1D16] hover:bg-[#EAEBE4] dark:hover:bg-[#252B1E] text-[#191919] dark:text-[#ECEEE6] text-xs font-medium border border-transparent dark:border-[#2C3125] transition-colors cursor-pointer"
                >
                  {selectedMode === 'quick' && <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                  {selectedMode === 'web' && <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  {selectedMode === 'deep' && <FlaskConical className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  <span className="capitalize">{selectedMode === 'quick' ? 'Quick Search' : selectedMode === 'web' ? 'Web Research' : 'Deep Research'}</span>
                  <ChevronDown className="w-3 h-3 text-[#717171] dark:text-[#9EA396] shrink-0" />
                </button>

                {modeMenuOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-52 max-w-[calc(100vw-32px)] rounded-xl bg-white dark:bg-[#161813] border border-[#E8E8E5] dark:border-[#282D22] shadow-xl py-1.5 z-40">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('quick');
                        setModeMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#F6F3F2] dark:hover:bg-[#1E221A] transition-colors"
                    >
                      <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">Quick Search</p>
                        <p className="text-[11px] text-[#717171] dark:text-[#9EA396]">Rapid concise synthesis</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('web');
                        setModeMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2.5 bg-[#F1F2ED]/60 dark:bg-[#20251A] hover:bg-[#F6F3F2] dark:hover:bg-[#242C1B] transition-colors"
                    >
                      <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">Web Research</p>
                        <p className="text-[11px] text-[#717171] dark:text-[#9EA396]">Comprehensive multi-source</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode('deep');
                        setModeMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-[#F6F3F2] dark:hover:bg-[#1E221A] transition-colors"
                    >
                      <FlaskConical className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">Deep Research</p>
                        <p className="text-[11px] text-[#717171] dark:text-[#9EA396]">Autonomous multi-step trail</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Compact Accessible Model Selector */}
              <ComposerModelSelector
                isConfigured={isConfigured}
                selectedModel={selectedModel}
                availableModels={availableModels}
                onSelectModel={(modelId) => selectModel(modelId)}
                onNavigateSettings={() => onNavigate('settings-providers')}
                direction="up"
              />
            </div>

            {/* Right Submit Action */}
            <button
              type="submit"
              className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] flex items-center justify-center shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Initiate Research"
              aria-label="Submit search query"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>

        {/* Keyboard shortcut hint */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[#717171] dark:text-[#9EA396] text-xs select-none">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#F1F2ED] dark:bg-[#1E221A] text-[#191919] dark:text-[#ECEEE6] font-mono text-[11px] border border-[#E8E8E5] dark:border-[#2C3125]">
            /
          </kbd>
          <span>to focus,</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#F1F2ED] dark:bg-[#1E221A] text-[#191919] dark:text-[#ECEEE6] font-mono text-[11px] border border-[#E8E8E5] dark:border-[#2C3125]">
            {cmdShortcut}
          </kbd>
          <span>for quick commands</span>
        </div>

        {/* Try an Example Prompts Grid */}
        <div className="w-full mt-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#717171] dark:text-[#808678] mb-3 text-left">
            Try an example
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {exampleQueries.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(item.text);
                  setSelectedMode(item.mode);
                  textareaRef.current?.focus();
                }}
                className="group text-left p-3.5 rounded-xl bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#242A1D] hover:bg-[#F6F3F2] dark:hover:bg-[#1C2017] hover:border-[#DFE0DC] dark:hover:border-[#2F3624] transition-all flex items-center justify-between gap-3 cursor-pointer shadow-2xs"
              >
                <span className="text-xs sm:text-sm font-medium text-[#191919] dark:text-[#ECEEE6] truncate">
                  {item.text}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9E9E99] dark:text-[#646A5B] group-hover:text-[#191919] dark:group-hover:text-[#ECEEE6] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Research Module */}
        <div className="w-full mt-10 pt-4 border-t border-[#E8E8E5]/60 dark:border-[#242A1D]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717171] dark:text-[#808678]">
              Recent research
            </span>
            <button
              onClick={() => onNavigate('library')}
              className="inline-flex items-center gap-1 text-xs text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] font-medium transition-colors cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {conversations.length === 0 ? (
              <div className="p-4 rounded-xl bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#242A1D] text-center text-xs text-[#717171] dark:text-[#808678]">
                No recent research yet. Enter your question above to begin!
              </div>
            ) : (
              conversations.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#242A1D] hover:bg-[#F6F3F2] dark:hover:bg-[#1C2017] transition-all shadow-2xs"
                >
                  <button
                    onClick={() => {
                      if (onOpenItem) {
                        onOpenItem(item.id);
                      } else {
                        onNavigate(item.mode === 'deep' ? 'deep-research' : 'research');
                      }
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F1F2ED] dark:bg-[#20251A] flex items-center justify-center shrink-0 text-[#717171] dark:text-[#9EA396] group-hover:text-[#102000] dark:group-hover:text-[#B8F36B] group-hover:bg-[#B8F36B]/50 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-[#191919] dark:text-[#ECEEE6] truncate group-hover:text-[#102000] dark:group-hover:text-[#B8F36B]">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[#717171] dark:text-[#9EA396]">
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{item.citationsCount} citations</span>
                        {item.mode === 'deep' && (
                          <>
                            <span>•</span>
                            <span className="text-[#416900] dark:text-[#B8F36B] font-semibold">Deep Research</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
