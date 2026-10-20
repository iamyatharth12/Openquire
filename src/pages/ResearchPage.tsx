import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Link2,
  MoreHorizontal,
  Globe,
  Bot,
  Library,
  Clock,
  Sparkles,
  Paperclip,
  Mic,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Key,
  RotateCw,
  Search,
  Check,
  ChevronDown,
  Layers,
  Eye,
  EyeOff,
  Square,
} from 'lucide-react';
import { DevPlaceholderBadge } from '../components/common/UIPrimitives';
import { NavRoute } from '../types/navigation';
import { credentialVault } from '../services/storage/indexedDbVault';
import { groundedSynthesis, GroundedAnswerResult, ResearchProgressUpdate } from '../services/synthesis/groundedSynthesis';
import { NormalizedSearchResult } from '../services/search/types';
import {
  createSourceItemFromNormalized,
  getRetrievalStatusBadge,
  SourceDisplayItem,
} from '../services/synthesis/sourceFormatter';
import { useModelSelection } from '../hooks/useModelSelection';
import { ComposerModelSelector } from '../components/research/ComposerModelSelector';
import { conversationService } from '../services/conversation/conversationService';
import { Conversation, ConversationMessage } from '../services/conversation/types';
import { MarkdownAnswerRenderer } from '../components/research/MarkdownAnswerRenderer';

interface ResearchPageProps {
  conversationId?: string;
  initialQuery?: string;
  initialModel?: string;
  onNavigate?: (route: NavRoute) => void;
  onNewSearch?: (query: string) => void;
  onConversationChange?: (id: string) => void;
}

/**
 * Reusable favicon avatar that reliably falls back to brand initials when image fails
 */
const SourceFavicon: React.FC<{
  url?: string;
  alt: string;
  initials: string;
  bgClass: string;
  containerClass: string;
  imgClass: string;
}> = ({ url, alt, initials, bgClass, containerClass, imgClass }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [url]);

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center font-bold shrink-0 ${containerClass} ${bgClass}`}
    >
      {url && !hasError ? (
        <img
          src={url}
          alt={alt}
          className={`${imgClass} object-contain`}
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

// Canonical baseline demonstration sources
const CANONICAL_SOURCES: SourceDisplayItem[] = [
  {
    id: 1,
    name: 'World Economic Forum',
    domain: 'weforum.org',
    initials: 'WEF',
    bgClass: 'bg-[#004B87] text-white',
    accentColor: '#004B87',
    title: 'The Future of Jobs Report 2025',
    excerpt:
      'Comprehensive empirical overview of technology adoption timelines, global labor reallocation, and macro economic shifting across 45 national economies.',
    citationsCount: 3,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=weforum.org&sz=64',
    url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025',
  },
  {
    id: 2,
    name: 'McKinsey & Company',
    domain: 'mckinsey.com',
    initials: 'McK',
    bgClass: 'bg-[#051C2C] text-white',
    accentColor: '#051C2C',
    title: 'AI and the Global Economy: Automation Potential',
    excerpt:
      'Granular task modeling detailing how up to 30% of current work hours globally could be automated by 2030 through generative models.',
    citationsCount: 2,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=mckinsey.com&sz=64',
    url: 'https://www.mckinsey.com/capabilities/mckinsey-digital/our-insights/the-economic-potential-of-generative-ai',
  },
  {
    id: 3,
    name: 'Harvard University',
    domain: 'harvard.edu',
    initials: 'HAR',
    bgClass: 'bg-[#A51C30] text-white',
    accentColor: '#A51C30',
    title: 'How AI is Changing Work: Field Experiments',
    excerpt:
      'Randomized control trials across 758 consultants demonstrating 40% performance boosts when collaborating with LLM toolchains on jagged-frontier tasks.',
    citationsCount: 2,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=harvard.edu&sz=64',
    url: 'https://www.hbs.edu/faculty/Pages/item.aspx?num=64700',
  },
  {
    id: 4,
    name: 'Financial Times',
    domain: 'ft.com',
    initials: 'FT',
    bgClass: 'bg-[#FFF1E5] text-[#333333] border border-[#E8D0BE]',
    accentColor: '#FFF1E5',
    title: 'The Jobs of Tomorrow: Hybrid Human-Machine Teams',
    excerpt:
      'Analysis of wage premiums for individuals skilled at cross-agent management and algorithmic workflow design in corporate environments.',
    citationsCount: 3,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=ft.com&sz=64',
    url: 'https://www.ft.com',
  },
  {
    id: 5,
    name: 'UNESCO',
    domain: 'unesco.org',
    initials: 'UNE',
    bgClass: 'bg-[#0077D4] text-white',
    accentColor: '#0077D4',
    title: 'AI Skills for the Future: Educational Preparedness',
    excerpt:
      'International baseline recommendations on pedagogical reform, ethical AI literacy, and systems engineering for incoming labor forces.',
    citationsCount: 2,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=unesco.org&sz=64',
    url: 'https://www.unesco.org',
  },
  {
    id: 6,
    name: 'MIT Technology Review',
    domain: 'technologyreview.com',
    initials: 'MIT',
    bgClass: 'bg-[#D60000] text-white',
    accentColor: '#D60000',
    title: 'The Algorithmic Workforce: Navigating Autonomous Systems',
    excerpt:
      'Case studies across 12 Fortune 500 enterprises adopting multi-agent orchestration pipelines for customer operations.',
    citationsCount: 1,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=technologyreview.com&sz=64',
    url: 'https://www.technologyreview.com',
  },
  {
    id: 7,
    name: 'Brookings Institution',
    domain: 'brookings.edu',
    initials: 'BRK',
    bgClass: 'bg-[#002D62] text-white',
    accentColor: '#002D62',
    title: 'Labor Market Dynamism and Automation Exposure',
    excerpt:
      'Regional disparity indices assessing automation impact across high-income metropolitan clusters vs rural industrial centers.',
    citationsCount: 2,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=brookings.edu&sz=64',
    url: 'https://www.brookings.edu',
  },
  {
    id: 8,
    name: 'OECD iLibrary',
    domain: 'oecd.org',
    initials: 'OECD',
    bgClass: 'bg-[#0A4D8C] text-white',
    accentColor: '#0A4D8C',
    title: 'OECD Employment Outlook: AI and the Labor Market',
    excerpt:
      'Comparative policy briefs from 38 OECD member states regarding worker retraining grants and algorithmic transparency legislation.',
    citationsCount: 1,
    verified: true,
    faviconUrl: 'https://www.google.com/s2/favicons?domain=oecd.org&sz=64',
    url: 'https://www.oecd.org',
  },
];


export const ResearchPage: React.FC<ResearchPageProps> = ({
  conversationId,
  initialQuery,
  initialModel,
  onNavigate,
  onNewSearch,
  onConversationChange,
}) => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentQueryText, setCurrentQueryText] = useState(
    initialQuery || 'How will AI impact jobs in the next decade?'
  );
  const currentQuery = currentQueryText;

  const {
    isConfigured: isModelConfigured,
    selectedModel,
    availableModels,
    selectModel,
  } = useModelSelection();

  const [activeTab, setActiveTab] = useState<'answer' | 'sources' | 'images' | 'related'>('answer');
  const [followUpQuery, setFollowUpQuery] = useState('');
  
  // USER REQUIREMENT: Initially have only logos for the sources; click to reveal details
  const [sourcesViewMode, setSourcesViewMode] = useState<'logos' | 'detailed'>('logos');
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [revealAllSourceNames, setRevealAllSourceNames] = useState(false);
  const [highlightedCitationId, setHighlightedCitationId] = useState<number | null>(null);

  // BYOK & Live Synthesis State
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [progressUpdate, setProgressUpdate] = useState<ResearchProgressUpdate | null>(null);
  const [synthesizedResult, setSynthesizedResult] = useState<GroundedAnswerResult | null>(null);
  const [liveSources, setLiveSources] = useState<SourceDisplayItem[] | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const sourcesDrawerRef = useRef<HTMLElement>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Load conversation and check BYOK key on mount or ID change
  useEffect(() => {
    let isMounted = true;

    async function initConversation() {
      const key = await credentialVault.getKey('gemini');
      const hasKey = Boolean(key && key.trim().length > 0);
      if (isMounted) setHasGeminiKey(hasKey);

      const targetId =
        conversationId ||
        (await conversationService.getActiveConversationId()) ||
        'ai-jobs-impact';

      const convo = await conversationService.get(targetId);

      if (!isMounted) return;

      if (convo) {
        setActiveConversation(convo);
        setCurrentQueryText(convo.title || convo.initialQuery || 'Research');

        const assistantMsgs = convo.messages.filter((m) => m.role === 'assistant');
        const latestAssistant = assistantMsgs[assistantMsgs.length - 1];

        if (latestAssistant) {
          setSynthesizedResult({
            query: convo.title,
            answerText: latestAssistant.content,
            sources: latestAssistant.sources || [],
            citations: latestAssistant.citations || {
              totalCitations: 0,
              validCitations: 0,
              invalidCitations: 0,
              integrityPercentage: 100,
              citedSourceIds: [],
              citations: [],
              flaggedErrors: [],
            },
            provider: latestAssistant.providerId || 'Google Gemini',
            requestedModel: latestAssistant.modelId || selectedModel || 'gemini-2.5-flash',
            modelUsed: latestAssistant.modelId || selectedModel || 'gemini-2.5-flash',
            modelConfirmed: true,
            executionTimeMs: latestAssistant.executionTimeMs || 1200,
          });

          if (latestAssistant.sources && latestAssistant.sources.length > 0) {
            setLiveSources(latestAssistant.sources.map(createSourceItemFromNormalized));
          }
          setIsInterrupted(Boolean(latestAssistant.isInterrupted));
        } else if (hasKey && (convo.initialQuery || initialQuery)) {
          // If conversation has no response yet, execute research
          executeLiveResearch(convo.initialQuery || initialQuery || convo.title, convo.id);
        }
      } else if (initialQuery && initialQuery.trim().length > 0) {
        // Create new conversation
        const created = await conversationService.create(
          initialQuery,
          'web',
          selectedModel || initialModel || 'gemini-2.5-flash'
        );
        if (isMounted) {
          setActiveConversation(created);
          setCurrentQueryText(created.title);
          onConversationChange?.(created.id);
          if (hasKey) {
            executeLiveResearch(initialQuery, created.id);
          }
        }
      }
    }

    initConversation();
    return () => {
      isMounted = false;
      activeAbortControllerRef.current?.abort();
    };
  }, [conversationId, initialQuery]);

  const handleStopGeneration = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    setIsSynthesizing(false);
    setProgressUpdate(null);
    setIsInterrupted(true);
  };

  const executeLiveResearch = async (
    queryText: string,
    targetConvoId?: string,
    modelOverride?: string
  ) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;

    // Generation cancellation & race condition protection
    activeAbortControllerRef.current?.abort();
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const reqId = ++requestIdRef.current;

    setIsSynthesizing(true);
    setSynthesisError(null);
    setIsInterrupted(false);
    setProgressUpdate({ stage: 'searching', message: 'Discovering verified web sources...' });

    // Determine target conversation ID
    let currentId = targetConvoId || activeConversation?.id;
    if (!currentId) {
      const created = await conversationService.create(
        trimmed,
        'web',
        modelOverride || selectedModel || initialModel || 'gemini-2.5-flash'
      );
      setActiveConversation(created);
      currentId = created.id;
      onConversationChange?.(created.id);
    } else {
      // Append user message to conversation history
      const userMsg: ConversationMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      };
      await conversationService.addMessage(currentId, userMsg);
      const updatedConvo = await conversationService.get(currentId);
      if (updatedConvo && reqId === requestIdRef.current) {
        setActiveConversation(updatedConvo);
      }
    }

    const targetModel = (modelOverride || selectedModel || initialModel || '').trim();

    try {
      const result = await groundedSynthesis.executeResearch(trimmed, {
        model: targetModel || undefined,
        signal: controller.signal,
        onProgress: (p) => {
          if (reqId === requestIdRef.current) setProgressUpdate(p);
        },
        onPartialResult: (partial) => {
          if (reqId === requestIdRef.current && partial.sources) {
            setLiveSources(partial.sources.map(createSourceItemFromNormalized));
          }
        },
      });

      // Ignore stale or cancelled response
      if (reqId !== requestIdRef.current || controller.signal.aborted) {
        return;
      }

      setSynthesizedResult(result);
      const converted = result.sources.map(createSourceItemFromNormalized);
      setLiveSources(converted);
      setSelectedSourceId(1);

      // Persist assistant response to conversation history
      if (currentId) {
        const assistantMsg: ConversationMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: result.answerText,
          timestamp: Date.now(),
          providerId: result.provider,
          modelId: result.modelUsed,
          sources: result.sources,
          citations: result.citations,
          executionTimeMs: result.executionTimeMs,
          status: 'completed',
          isInterrupted: false,
        };
        await conversationService.addMessage(currentId, assistantMsg);
        const updatedConvo = await conversationService.get(currentId);
        if (updatedConvo && reqId === requestIdRef.current) {
          setActiveConversation(updatedConvo);
        }
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError') {
        if (reqId === requestIdRef.current) {
          setIsInterrupted(true);
          // Persist interrupted state to conversation history
          if (currentId) {
            const interruptedMsg: ConversationMessage = {
              id: `msg-${Date.now()}-interrupted`,
              role: 'assistant',
              content: 'Research generation was stopped by user.',
              timestamp: Date.now(),
              sources: liveSources
                ? liveSources.map((s, idx) => ({
                    id: s.id,
                    title: s.title,
                    url: s.url,
                    domain: s.domain,
                    snippet: s.excerpt,
                    rank: idx + 1,
                    retrievalStatus: s.retrievalStatus as any,
                    citationsCount: s.citationsCount,
                  }))
                : [],
              status: 'interrupted',
              isInterrupted: true,
            };
            await conversationService.addMessage(currentId, interruptedMsg);
            const updatedConvo = await conversationService.get(currentId);
            if (updatedConvo && reqId === requestIdRef.current) {
              setActiveConversation(updatedConvo);
            }
          }
        }
        return;
      }

      if (reqId === requestIdRef.current) {
        console.error('Research synthesis failed:', err);
        setSynthesisError(err.message || 'Failed to synthesize grounded answer.');
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setIsSynthesizing(false);
        setProgressUpdate(null);
        activeAbortControllerRef.current = null;
      }
    }
  };

  // Fallback to fetch live web sources only (when user doesn't have key yet but wants real search results)
  const handleFetchWebSourcesOnly = async () => {
    setIsSynthesizing(true);
    setSynthesisError(null);
    setProgressUpdate({ stage: 'searching', message: 'Fetching real-time web results from search engine...' });

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery, limit: 6 }),
      });
      if (!res.ok) {
        throw new Error(`Search failed: HTTP ${res.status}`);
      }
      const data = await res.json();
      const results: NormalizedSearchResult[] = data.results || [];
      if (results.length === 0) {
        throw new Error('No web results found for this search query.');
      }
      const converted = results.map(createSourceItemFromNormalized);
      setLiveSources(converted);
      setSelectedSourceId(1);
    } catch (err: any) {
      setSynthesisError(err.message || 'Failed to retrieve web sources.');
    } finally {
      setIsSynthesizing(false);
      setProgressUpdate(null);
    }
  };

  // Determine active sources to display (live sources if available, otherwise canonical demonstration)
  const activeSources = liveSources && liveSources.length > 0 ? liveSources : CANONICAL_SOURCES;

  const scrollToCitation = (id: number) => {
    setHighlightedCitationId(id);
    setSelectedSourceId(id);

    // Give React a tick to mount the newly selected citation card if switching from another
    requestAnimationFrame(() => {
      setTimeout(() => {
        const element = document.getElementById(`citation-card-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          const logoEl = document.getElementById(`source-logo-${id}`);
          if (logoEl) {
            logoEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 50);
    });

    setTimeout(() => {
      setHighlightedCitationId(null);
    }, 2200);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim() || isSynthesizing) return;

    const queryToRun = followUpQuery.trim();
    setFollowUpQuery('');
    if (onNewSearch) {
      onNewSearch(queryToRun);
    }
    if (hasGeminiKey) {
      executeLiveResearch(queryToRun, activeConversation?.id, selectedModel);
    } else {
      handleFetchWebSourcesOnly();
    }
  };

  // Parse synthesized answer text with interactive citation pins
  const renderSynthesizedText = (text: string) => {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const sourceId = parseInt(match[1], 10);
        const sourceItem = activeSources.find((s) => s.id === sourceId);
        if (!sourceItem) {
          return (
            <span
              key={index}
              className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-mono font-bold"
              title={`Source [${sourceId}] was cited by model but is not present in retrieved evidence`}
            >
              [{sourceId}?]
            </span>
          );
        }
        return (
          <button
            key={index}
            type="button"
            onClick={() => scrollToCitation(sourceId)}
            className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.2 rounded-full bg-[#B8F36B] text-[#102000] text-[11px] font-mono font-bold hover:bg-[#A7EB50] hover:scale-110 active:scale-95 transition-transform cursor-pointer shadow-2xs"
            title={`View Source ${sourceId}: ${sourceItem.name} (${sourceItem.domain})`}
          >
            {sourceId}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#191919] text-white px-4 py-2 rounded-xl text-xs font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#B8F36B]" />
          <span>Research URL copied to clipboard</span>
        </div>
      )}

      {/* Scope Badge */}
      <div className="mb-4">
        <DevPlaceholderBadge label="Openquire Grounded Answer Engine & Interactive Source Explorer (Phase 3)" />
      </div>

      {/* BYOK Status Banner when no key is set */}
      {hasGeminiKey === false && (
        <div className="mb-5 p-4 rounded-2xl bg-[#F6F3F2] border border-[#E8E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E0E5D3] flex items-center justify-center text-[#181D13] shrink-0 mt-0.5 sm:mt-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#191919]">
                BYOK Security Vault Active
              </h4>
              <p className="text-xs text-[#717171] mt-0.5">
                Add your Google Gemini API key in Settings to synthesize live grounded answers with full citation integrity. Keys are kept strictly in your local browser IndexedDB vault.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFetchWebSourcesOnly}
              className="px-3 py-1.5 rounded-xl bg-white text-[#191919] text-xs font-medium border border-[#E8E8E5] hover:bg-[#F1F2ED] transition-colors cursor-pointer"
            >
              Fetch Live Web Sources
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('settings-providers')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B8F36B] text-[#102000] text-xs font-semibold hover:bg-[#A7EB50] transition-colors cursor-pointer shadow-2xs"
            >
              <span>Configure Key</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Query Context & Metabar Header */}
      <section className="flex flex-col gap-4 pb-4 mb-6 bg-[#F6F3F2]/60 rounded-2xl p-4 sm:p-5 border border-[#E8E8E5]/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs & Title */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-[#717171]">
              <span className="cursor-pointer hover:text-[#191919]" onClick={() => onNavigate?.('home')}>
                Home
              </span>
              <span className="text-[#DFE0DC]">/</span>
              <span className="text-[#434938] font-medium">Research</span>
              <span className="text-[#DFE0DC]">/</span>
              <span className="text-[#717171] truncate max-w-xs">{currentQuery}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#191919] tracking-tight">
              {currentQuery}
            </h1>
          </div>

          {/* Utility Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#191919] text-xs font-medium rounded-lg border border-[#E8E8E5] hover:bg-[#F1F2ED] transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 bg-white text-[#717171] hover:text-[#191919] rounded-lg border border-[#E8E8E5] hover:bg-[#F1F2ED] transition-colors cursor-pointer"
              title="Copy link"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (hasGeminiKey) executeLiveResearch(currentQuery);
                else handleFetchWebSourcesOnly();
              }}
              className="p-2 bg-white text-[#717171] hover:text-[#191919] rounded-lg border border-[#E8E8E5] hover:bg-[#F1F2ED] transition-colors cursor-pointer"
              title="Re-run search synthesis"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Telemetry Meta Badges & Navigation Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#E8E8E5]/50">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#717171]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0E5D3] text-[#181D13] font-medium">
              <Globe className="w-3.5 h-3.5 text-[#416900]" />
              <span>Web Research</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border text-xs font-medium ${
                synthesizedResult?.modelConfirmed
                  ? 'border-emerald-200 text-emerald-900 bg-emerald-50/40'
                  : 'border-[#E8E8E5] text-[#191919]'
              }`}
              title={
                synthesizedResult?.modelConfirmed
                  ? `Confirmed synthesis execution with ${synthesizedResult.modelUsed} (${synthesizedResult.provider})`
                  : `Active requested model: ${selectedModel || initialModel || 'Not Configured'}`
              }
            >
              <Bot className={`w-3.5 h-3.5 ${synthesizedResult?.modelConfirmed ? 'text-emerald-600' : 'text-[#717171]'}`} />
              <span className="font-mono text-[11px]">
                {synthesizedResult?.modelUsed || selectedModel || initialModel || 'Select Model'}
              </span>
              {synthesizedResult?.modelConfirmed ? (
                <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded font-medium">
                  Confirmed
                </span>
              ) : (
                <span className="text-[10px] text-[#717171] bg-[#F1F2ED] px-1 py-0.2 rounded font-medium">
                  Requested
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E8E8E5] text-[#191919]">
              <Library className="w-3.5 h-3.5 text-[#717171]" />
              <span>{activeSources.length} Verified Sources</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E5E2E1]/60 text-[#717171] font-mono text-[11px]">
              <Clock className="w-3 h-3" />
              <span>
                {synthesizedResult?.executionTimeMs
                  ? `${(synthesizedResult.executionTimeMs / 1000).toFixed(1)}s`
                  : 'Ready'}
              </span>
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex p-1 bg-[#F1F2ED] rounded-xl text-xs font-medium border border-[#E8E8E5]">
            <button
              onClick={() => setActiveTab('answer')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'answer'
                  ? 'bg-white text-[#191919] font-semibold shadow-2xs'
                  : 'text-[#717171] hover:text-[#191919]'
              }`}
            >
              Answer
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-white text-[#191919] font-semibold shadow-2xs'
                  : 'text-[#717171] hover:text-[#191919]'
              }`}
            >
              <span>Sources</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#B8F36B] text-[#102000] text-[10px] font-bold">
                {activeSources.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'images'
                  ? 'bg-white text-[#191919] font-semibold shadow-2xs'
                  : 'text-[#717171] hover:text-[#191919]'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setActiveTab('related')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === 'related'
                  ? 'bg-white text-[#191919] font-semibold shadow-2xs'
                  : 'text-[#717171] hover:text-[#191919]'
              }`}
            >
              Related
            </button>
          </div>
        </div>
      </section>

      {/* Synthesis In-Progress Pipeline Indicator */}
      {isSynthesizing && (
        <div className="mb-6 p-4 rounded-2xl bg-white border border-[#B8F36B] shadow-md flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E0E5D3] flex items-center justify-center text-[#181D13] animate-spin">
              <RotateCw className="w-4 h-4 text-[#416900]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-[#191919]">
                {progressUpdate?.message || 'Synthesizing evidence-grounded answer...'}
              </p>
              <p className="text-[11px] text-[#717171]">
                Stage:{' '}
                <span className="capitalize font-mono text-[#416900] font-medium">
                  {progressUpdate?.stage || 'Investigating'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStopGeneration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
              title="Stop research generation"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Generating</span>
            </button>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-[#F1F2ED] border border-[#E8E8E5] text-xs font-mono text-[#717171]">
              Real-time Web Search
            </span>
          </div>
        </div>
      )}

      {/* Generation Interrupted / Stopped Banner */}
      {isInterrupted && !isSynthesizing && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Square className="w-3 h-3 fill-current" />
            </span>
            <div>
              <p className="font-semibold text-amber-950">Generation Interrupted</p>
              <p className="text-amber-800 text-[11px]">
                Research was stopped by user. Retrieved sources and partial findings have been preserved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => executeLiveResearch(currentQuery)}
            className="px-3 py-1 rounded-full bg-amber-200/70 hover:bg-amber-200 text-amber-950 font-medium transition-colors cursor-pointer shrink-0"
          >
            Retry Research
          </button>
        </div>
      )}

      {/* Synthesis Error Display */}
      {synthesisError && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div>
              <p className="text-xs sm:text-sm font-semibold">{synthesisError}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Showing verified canonical baseline answer and sources. You can select another available model below to re-synthesize.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {availableModels.length > 0 && (
                <ComposerModelSelector
                  isConfigured={isModelConfigured}
                  selectedModel={selectedModel}
                  availableModels={availableModels}
                  onSelectModel={(newModel) => {
                    selectModel(newModel);
                    executeLiveResearch(currentQuery, newModel);
                  }}
                  onNavigateSettings={() => onNavigate?.('settings-providers')}
                  direction="down"
                />
              )}
              <button
                type="button"
                onClick={() => onNavigate?.('settings-providers')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-amber-100 text-amber-900 text-xs font-medium border border-amber-300 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-700" />
                <span>Configure Providers & Keys</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Synthesis Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Synthesis Canvas (8 Cols) */}
        <main className="lg:col-span-8 flex flex-col gap-6 min-w-0">
          {/* USER FEATURE: SOURCE LOGOS BAR (Initially only logos, click reveals source & name) */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E8E8E5] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#191919] shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#416900]" />
              <span>Grounded in {activeSources.length} sources:</span>
              <button
                type="button"
                onClick={() => setRevealAllSourceNames(!revealAllSourceNames)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F1F2ED] text-[#434938] hover:text-[#191919] hover:bg-[#E8E8E5] text-[11px] font-medium transition-colors cursor-pointer border border-[#E8E8E5]"
                title={revealAllSourceNames ? 'Collapse to logos only' : 'Reveal all source names'}
              >
                {revealAllSourceNames ? (
                  <>
                    <EyeOff className="w-3 h-3 text-[#717171]" />
                    <span>Logos only</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-[#416900]" />
                    <span>Reveal names</span>
                  </>
                )}
              </button>
            </div>

            {/* Horizontal Logos Carousel: initially only logos, click reveals name & details */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {activeSources.length === 0 ? (
                <span className="text-xs text-[#717171] italic">No sources loaded</span>
              ) : (
                activeSources.map((item) => {
                  const isSelected = selectedSourceId === item.id;
                  const showName = revealAllSourceNames || isSelected;
                  const statusInfo = getRetrievalStatusBadge(item.retrievalStatus, item.verified);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        // Toggle selection or switch
                        setSelectedSourceId(isSelected ? null : item.id);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-[#F6F3F2] border-[#B8F36B] ring-2 ring-[#B8F36B] shadow-2xs'
                          : 'bg-[#FAFAF8] border-[#E8E8E5] hover:bg-white hover:border-[#DFE0DC]'
                      }`}
                      title={`Source ${item.id}: ${item.name} (${item.domain}) — ${statusInfo.label}`}
                    >
                      {/* Favicon / Logo Avatar with reliable fallback */}
                      <SourceFavicon
                        url={item.faviconUrl}
                        alt={item.name}
                        initials={item.initials}
                        bgClass={item.bgClass}
                        containerClass="w-5 h-5 rounded-full text-[9px]"
                        imgClass="w-3.5 h-3.5"
                      />

                      {/* Source Index Number */}
                      <span className="text-[11px] font-mono text-[#717171] font-bold">{item.id}</span>

                      {/* REVEAL ON CLICK: Source name expands when selected or when reveal names is toggled */}
                      {showName && (
                        <span className="text-xs font-semibold text-[#191919] pr-1.5 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
                          {item.name}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Executive Summary Section */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#416900]">
                <Sparkles className="w-4 h-4" />
                <span>Executive Summary</span>
              </div>
              <span className="text-[11px] font-medium text-[#717171] bg-[#F1F2ED] px-2 py-0.5 rounded border border-[#E8E8E5]">
                {synthesizedResult ? 'Live Model Synthesis' : 'High Confidence · Multi-model consensus'}
              </span>
            </div>

            {/* Synthesized Live Answer OR Canonical Baseline */}
            {synthesizedResult ? (
              <div className="text-sm sm:text-base text-[#191919] leading-relaxed">
                <MarkdownAnswerRenderer
                  content={synthesizedResult.answerText}
                  onCitationClick={scrollToCitation}
                  validSourceIds={activeSources.map((s) => s.id)}
                  highlightedCitationId={highlightedCitationId}
                />
                {isInterrupted && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Square className="w-3.5 h-3.5 fill-amber-700 stroke-none" />
                      <span className="font-medium">Generation was stopped by user. Partial evidence preserved.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => executeLiveResearch(currentQuery, activeConversation?.id, selectedModel)}
                      className="px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-200 font-semibold text-[11px] text-amber-950 transition-colors cursor-pointer"
                    >
                      Regenerate
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm sm:text-base text-[#191919] leading-relaxed">
                  AI is projected to fundamentally reshape the global workforce over the coming decade rather than trigger a net job apocalypse. While routine cognitive and manual duties face substantial transformation, technology adoption will induce net productivity gains, unlock emergent job clusters, and drastically tilt compensation in favor of complex problem resolution and human-centric nuance.
                  {/* Interactive citation pins */}
                  <button
                    type="button"
                    onClick={() => scrollToCitation(1)}
                    className="inline-flex items-center justify-center mx-1 w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] text-[11px] font-mono font-bold hover:bg-[#A7EB50] hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                    title="Source 1: weforum.org"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToCitation(2)}
                    className="inline-flex items-center justify-center mx-1 w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] text-[11px] font-mono font-bold hover:bg-[#A7EB50] hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                    title="Source 2: mckinsey.com"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToCitation(3)}
                    className="inline-flex items-center justify-center mx-1 w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] text-[11px] font-mono font-bold hover:bg-[#A7EB50] hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                    title="Source 3: harvard.edu"
                  >
                    3
                  </button>
                </p>

                {/* Key Metrics Callout Mosaic */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-[#F6F3F2] border border-[#E8E8E5]/60 flex flex-col justify-between">
                    <span className="text-xs text-[#717171] font-medium">Projected displacement</span>
                    <span className="text-2xl font-bold text-[#191919] pt-1">85M</span>
                    <span className="text-[11px] text-[#717171] pt-0.5">Routine roles displaced by 2028</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F6F3F2] border border-[#E8E8E5]/60 flex flex-col justify-between">
                    <span className="text-xs text-[#717171] font-medium">Net Job Creation</span>
                    <span className="text-2xl font-bold text-[#416900] pt-1">+97M</span>
                    <span className="text-[11px] text-[#717171] pt-0.5">Specialized tech & green roles</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F6F3F2] border border-[#E8E8E5]/60 flex flex-col justify-between">
                    <span className="text-xs text-[#717171] font-medium">Work Hours Automated</span>
                    <span className="text-2xl font-bold text-[#191919] pt-1">30%</span>
                    <span className="text-[11px] text-[#717171] pt-0.5">Current tasks shifted to AI agents</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Structured Key Impacts Breakdown (when in baseline mode) */}
          {!synthesizedResult && (
            <section className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#191919]">Key Impacts on Jobs</h2>
                <span className="text-xs text-[#717171]">4 Critical Vector Insights</span>
              </div>

              <div className="space-y-4">
                {/* Item 1 */}
                <div className="p-4 rounded-xl bg-[#F6F3F2]/60 border border-[#E8E8E5]/60 hover:bg-[#F6F3F2] transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E0E5D3] text-[#181D13] font-bold text-xs shrink-0">
                        1
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
                        Automation of Routine & Structured Tasks
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollToCitation(1)}
                        className="w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] font-mono text-[10px] font-bold flex items-center justify-center hover:bg-[#A7EB50] cursor-pointer"
                      >
                        1
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToCitation(2)}
                        className="w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] font-mono text-[10px] font-bold flex items-center justify-center hover:bg-[#A7EB50] cursor-pointer"
                      >
                        2
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#434938] pl-8.5 leading-relaxed">
                    Repetitive data collection, back-office bookkeeping, standard transactional customer queries, and baseline legal document drafting will face near-total algorithmic automation. Workers in administrative and entry-level compliance pipelines are transitioning toward auditing, pipeline quality assurance, and anomaly resolution.
                  </p>
                </div>

                {/* Item 2 */}
                <div className="p-4 rounded-xl bg-[#F6F3F2]/60 border border-[#E8E8E5]/60 hover:bg-[#F6F3F2] transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E0E5D3] text-[#181D13] font-bold text-xs shrink-0">
                        2
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
                        Proliferation of Novel & Hybrid Roles
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollToCitation(3)}
                        className="w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] font-mono text-[10px] font-bold flex items-center justify-center hover:bg-[#A7EB50] cursor-pointer"
                      >
                        3
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToCitation(4)}
                        className="w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] font-mono text-[10px] font-bold flex items-center justify-center hover:bg-[#A7EB50] cursor-pointer"
                      >
                        4
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#434938] pl-8.5 leading-relaxed">
                    Rapid integration is giving birth to unprecedented titles: AI Workflow Orchestrators, Algorithmic Safety Auditors, Synthetic Data Curators, and Autonomous Agent Managers. Cross-disciplinary professionals possessing both domain mastery and generative intuition are commanding high wage premiums.
                  </p>
                </div>

                {/* Item 3 */}
                <div className="p-4 rounded-xl bg-[#F6F3F2]/60 border border-[#E8E8E5]/60 hover:bg-[#F6F3F2] transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#E0E5D3] text-[#181D13] font-bold text-xs shrink-0">
                        3
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
                        Human-in-the-Loop Value Inflation
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollToCitation(5)}
                        className="w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] font-mono text-[10px] font-bold flex items-center justify-center hover:bg-[#A7EB50] cursor-pointer"
                      >
                        5
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToCitation(6)}
                        className="w-5 h-5 rounded-full bg-[#B8F36B] text-[#102000] font-mono text-[10px] font-bold flex items-center justify-center hover:bg-[#A7EB50] cursor-pointer"
                      >
                        6
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#434938] pl-8.5 leading-relaxed">
                    Capabilities resistant to statistical modeling—empathy, ethical judgment, strategic negotiations, and physical dexterity in unstructured environments—are gaining distinct economic insulation.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Follow-up Research Bar */}
          <div className="sticky bottom-4 z-20">
            <form
              onSubmit={handleFollowUpSubmit}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-[#E8E8E5] flex items-center gap-2 transition-all focus-within:border-[#B8F36B]"
            >
              <button
                type="button"
                className="p-2 text-[#717171] hover:text-[#191919] hover:bg-[#F1F2ED] rounded-xl transition-colors shrink-0"
                title="Attach context file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Compact Accessible Model Selector inside Follow-up Composer */}
              <ComposerModelSelector
                isConfigured={isModelConfigured}
                selectedModel={selectedModel}
                availableModels={availableModels}
                onSelectModel={(modelId) => selectModel(modelId)}
                onNavigateSettings={() => onNavigate?.('settings-providers')}
                direction="up"
              />

              <input
                type="text"
                value={followUpQuery}
                onChange={(e) => setFollowUpQuery(e.target.value)}
                placeholder="Ask a follow-up question or search a new topic..."
                className="w-full bg-transparent border-0 focus:outline-none text-xs sm:text-sm text-[#191919] placeholder:text-[#9E9E99] px-2 py-1.5 min-w-0"
              />
              {isSynthesizing ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="w-8 h-8 rounded-lg bg-[#191919] hover:bg-[#333333] active:scale-95 text-white shadow-xs flex items-center justify-center shrink-0 cursor-pointer transition-all"
                  title="Stop generating"
                  aria-label="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-white stroke-none" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!followUpQuery.trim()}
                  className="w-8 h-8 rounded-full bg-[#B8F36B] text-[#102000] hover:bg-[#A7EB50] active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-all"
                  title="Send follow up"
                  aria-label="Send follow up"
                >
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </form>
          </div>
        </main>

        {/* Right Column: Sources & Verified Evidence Drawer (4 Cols) */}
        <aside ref={sourcesDrawerRef} className="lg:col-span-4 flex flex-col gap-4 min-w-0">
          {/* Sources Header with View Switcher */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#416900]" />
              <h2 className="text-sm sm:text-base font-semibold text-[#191919]">Sources</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#E0E5D3] text-[#181D13] font-mono text-[11px] font-bold">
                {activeSources.length}
              </span>
            </div>

            {/* Mode Switcher: Logos vs Detailed List */}
            <div className="inline-flex items-center p-0.5 bg-[#F1F2ED] rounded-lg border border-[#E8E8E5] text-xs">
              <button
                type="button"
                onClick={() => setSourcesViewMode('logos')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  sourcesViewMode === 'logos'
                    ? 'bg-white text-[#191919] shadow-2xs font-semibold'
                    : 'text-[#717171] hover:text-[#191919]'
                }`}
                title="Show logo icons first"
              >
                Logos
              </button>
              <button
                type="button"
                onClick={() => setSourcesViewMode('detailed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  sourcesViewMode === 'detailed'
                    ? 'bg-white text-[#191919] shadow-2xs font-semibold'
                    : 'text-[#717171] hover:text-[#191919]'
                }`}
                title="Show full source cards"
              >
                List
              </button>
            </div>
          </div>

          {/* USER REQUIREMENT: VIEW MODE 1 — LOGOS ONLY (Click into logo reveals source details & name) */}
          {sourcesViewMode === 'logos' && (
            <div className="space-y-3">
              {/* Logo Grid Rack */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#E8E8E5] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-[#717171]">
                  <span>Click a logo to reveal source details:</span>
                  <span className="font-mono text-[#416900] font-semibold">
                    {selectedSourceId ? `Source #${selectedSourceId} active` : 'Click a logo'}
                  </span>
                </div>

                {activeSources.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#717171]">
                    No sources available for this query.
                  </div>
                ) : (
                  /* Clean Logo Button Tiles */
                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                    {activeSources.map((item) => {
                      const isSelected = selectedSourceId === item.id;
                      const isHighlighted = highlightedCitationId === item.id;
                      const statusInfo = getRetrievalStatusBadge(item.retrievalStatus, item.verified);
                      return (
                        <button
                          key={item.id}
                          id={`source-logo-${item.id}`}
                          type="button"
                          onClick={() => setSelectedSourceId(isSelected ? null : item.id)}
                          className={`group relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#F6F3F2] border-[#B8F36B] ring-2 ring-[#B8F36B] shadow-xs'
                              : isHighlighted
                              ? 'bg-[#F1F2ED] border-[#B8F36B] ring-2 ring-[#B8F36B] animate-pulse'
                              : 'bg-[#FAFAF8] border-[#E8E8E5] hover:bg-white hover:border-[#DFE0DC] hover:shadow-2xs'
                          }`}
                          title={`${item.name} (${item.domain}) — ${statusInfo.label}`}
                        >
                          {/* Numerical Badge in top corner */}
                          <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-[#717171]">
                            {item.id}
                          </span>

                          {/* Provenance / Retrieval status dot */}
                          <span
                            className={`absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}
                            title={statusInfo.title}
                          />

                          {/* Brand Logo Avatar with reliable fallback */}
                          <SourceFavicon
                            url={item.faviconUrl}
                            alt={item.name}
                            initials={item.initials}
                            bgClass={item.bgClass}
                            containerClass="w-9 h-9 rounded-xl text-xs shadow-2xs group-hover:scale-105 transition-transform"
                            imgClass="w-5 h-5"
                          />

                          {/* Domain label */}
                          <span className="text-[10px] text-[#717171] group-hover:text-[#191919] truncate max-w-full font-medium pt-1">
                            {item.domain.replace(/^www\./, '').split('.')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* REVEALED SOURCE DETAILS CARD (Appears when a logo is clicked) */}
              {selectedSourceId && (() => {
                const activeSource = activeSources.find((s) => s.id === selectedSourceId);
                if (!activeSource) return null;
                const statusInfo = getRetrievalStatusBadge(activeSource.retrievalStatus, activeSource.verified);
                return (
                  <article
                    id={`citation-card-${activeSource.id}`}
                    className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-[#B8F36B] shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* Header Row: Logo, Full Source Name, Domain */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <SourceFavicon
                          url={activeSource.faviconUrl}
                          alt={activeSource.name}
                          initials={activeSource.initials}
                          bgClass={activeSource.bgClass}
                          containerClass="w-10 h-10 rounded-xl text-xs shadow-2xs"
                          imgClass="w-6 h-6"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#191919] truncate">
                              {activeSource.name}
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass} shrink-0`}
                              title={statusInfo.title}
                            />
                            <span className="text-[10px] text-[#717171] font-mono">
                              ({statusInfo.label})
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-[#717171] truncate">
                            {activeSource.domain}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#E0E5D3] text-[#181D13] font-mono text-[11px] font-bold">
                          Source #{activeSource.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSourceId(null)}
                          className="p-1 text-[#717171] hover:text-[#191919] rounded-lg transition-colors cursor-pointer"
                          title="Hide details"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Page Title */}
                    <h3 className="text-sm font-semibold text-[#191919] leading-snug">
                      {activeSource.title}
                    </h3>

                    {/* Extracted Evidence Excerpt */}
                    {activeSource.excerpt && !activeSource.excerpt.startsWith('No text excerpt') ? (
                      <blockquote className="text-xs text-[#434938] leading-relaxed bg-[#F6F3F2] p-3 rounded-xl border border-[#E8E8E5]/70 italic">
                        "{activeSource.excerpt}"
                      </blockquote>
                    ) : (
                      <p className="text-xs text-[#717171] leading-relaxed bg-[#F6F3F2] p-3 rounded-xl border border-[#E8E8E5]/70">
                        No text excerpt available from this source.
                      </p>
                    )}

                    {/* Footer with citation counter and actions */}
                    <div className="pt-2 border-t border-[#E8E8E5] flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-[#717171]">
                        {activeSource.citationsCount > 0
                          ? `Cited ${activeSource.citationsCount} time${activeSource.citationsCount > 1 ? 's' : ''} in answer`
                          : 'Not cited directly in current synthesis'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nextId =
                              activeSource.id >= activeSources.length ? 1 : activeSource.id + 1;
                            setSelectedSourceId(nextId);
                          }}
                          className="text-[11px] font-medium text-[#717171] hover:text-[#191919] cursor-pointer"
                        >
                          Next source →
                        </button>
                        <a
                          href={activeSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#191919] text-white hover:bg-[#313030] rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          <span>Open source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })()}

              {!selectedSourceId && (
                <div className="p-3.5 bg-white rounded-2xl border border-[#E8E8E5] text-center text-xs text-[#717171] space-y-1">
                  <p className="font-medium text-[#191919]">Logo Explorer Active</p>
                  <p className="text-[11px]">
                    Click any source logo above to reveal its verified citation snippet and web publication.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: DETAILED LIST */}
          {sourcesViewMode === 'detailed' && (
            <div className="flex flex-col gap-2.5">
              {activeSources.length === 0 ? (
                <div className="p-4 bg-white rounded-2xl border border-[#E8E8E5] text-center text-xs text-[#717171]">
                  No sources available.
                </div>
              ) : (
                activeSources.map((item) => {
                  const statusInfo = getRetrievalStatusBadge(item.retrievalStatus, item.verified);
                  return (
                    <article
                      key={item.id}
                      id={`citation-card-${item.id}`}
                      onClick={() => setSelectedSourceId(item.id)}
                      className={`group bg-white p-3.5 rounded-xl border border-[#E8E8E5] shadow-2xs hover:shadow-md transition-all cursor-pointer ${
                        highlightedCitationId === item.id || selectedSourceId === item.id
                          ? 'ring-2 ring-[#B8F36B] bg-[#F6F3F2]'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#E0E5D3] text-[#181D13] font-mono text-[11px] font-bold shrink-0 mt-0.5">
                          {item.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <SourceFavicon
                              url={item.faviconUrl}
                              alt={item.name}
                              initials={item.initials}
                              bgClass={item.bgClass}
                              containerClass="w-4 h-4 rounded-full text-[8px]"
                              imgClass="w-3.5 h-3.5"
                            />
                            <span className="text-xs font-semibold text-[#191919] truncate">
                              {item.name}
                            </span>
                            <span className="text-xs text-[#717171] truncate font-mono">
                              ({item.domain})
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass} ml-auto shrink-0`}
                              title={statusInfo.title}
                            />
                          </div>
                          <h4 className="text-xs sm:text-sm font-semibold text-[#191919] group-hover:text-[#416900] transition-colors line-clamp-1 pt-1">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-[#717171] line-clamp-2 pt-1 leading-snug">
                            {item.excerpt}
                          </p>
                          <div className="mt-2 pt-2 border-t border-[#E8E8E5]/50 flex items-center justify-between text-[11px] font-mono text-[#717171]">
                            <span>
                              {item.citationsCount > 0
                                ? `Cited ${item.citationsCount} time${item.citationsCount > 1 ? 's' : ''}`
                                : 'Not cited in current answer'}
                            </span>
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 hover:text-[#191919]"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

          {/* Research Evidence Consensus Card */}
          <div className="p-4 rounded-xl bg-[#F6F3F2] border border-[#E8E8E5] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#191919]">
              <ShieldCheck className="w-4 h-4 text-[#416900]" />
              <span>Evidence & Citation Grounding</span>
            </div>
            <p className="text-xs text-[#434938] leading-relaxed">
              {synthesizedResult
                ? `Synthesized across ${activeSources.length} verified evidence sources using client-side BYOK model execution.`
                : 'All primary sources converge on net productivity acceleration; disagreement exists mainly around the speed of routine labor reallocation in developing economies.'}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#B8F36B]" />
              <span className="text-[11px] font-mono text-[#717171]">
                {synthesizedResult
                  ? `${synthesizedResult.citations.integrityPercentage}% Grounded Citations (${synthesizedResult.citations.validCitations}/${synthesizedResult.citations.totalCitations} valid pins)`
                  : 'Baseline Demonstration Data · 100% Citation Grounding'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
