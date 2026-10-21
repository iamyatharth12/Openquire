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
  Image as ImageIcon,
} from 'lucide-react';
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
  const lastLoadedIdRef = useRef<string | null>(null);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      activeAbortControllerRef.current?.abort();
    };
  }, []);

  // Load conversation and check BYOK key on mount or conversation ID change
  useEffect(() => {
    let isMounted = true;

    async function initConversation() {
      const key = await credentialVault.getKey('gemini');
      const hasKey = Boolean(key && key.trim().length > 0);
      if (isMounted) setHasGeminiKey(hasKey);

      const targetId =
        conversationId ||
        (await conversationService.getActiveConversationId());

      if (targetId && targetId === lastLoadedIdRef.current && activeConversation?.id === targetId) {
        return;
      }
      lastLoadedIdRef.current = targetId || null;

      const convo = targetId ? await conversationService.get(targetId) : null;

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
          } else {
            setLiveSources([]);
          }
          setIsInterrupted(Boolean(latestAssistant.isInterrupted));
        } else if (convo.initialQuery || initialQuery) {
          const queryToExecute = convo.initialQuery || initialQuery || convo.title;
          if (hasKey) {
            executeLiveResearch(queryToExecute, convo.id);
          } else {
            handleFetchWebSourcesOnly(queryToExecute);
          }
        } else {
          setSynthesizedResult(null);
          setLiveSources([]);
        }
      } else if (initialQuery && initialQuery.trim().length > 0) {
        // Create new conversation
        const created = await conversationService.create(
          initialQuery,
          'web',
          selectedModel || initialModel || 'gemini-2.5-flash'
        );
        if (isMounted) {
          lastLoadedIdRef.current = created.id;
          setActiveConversation(created);
          setCurrentQueryText(created.title);
          onConversationChange?.(created.id);
          if (hasKey) {
            executeLiveResearch(initialQuery, created.id);
          } else {
            handleFetchWebSourcesOnly(initialQuery);
          }
        }
      } else {
        setActiveConversation(null);
        setCurrentQueryText('');
        setSynthesizedResult(null);
        setLiveSources([]);
      }
    }

    initConversation();
    return () => {
      isMounted = false;
    };
  }, [conversationId]);

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
      // Check if conversation already has this message as the latest user message
      const existingConvo = await conversationService.get(currentId);
      const lastUserMsg = existingConvo?.messages?.filter((m) => m.role === 'user').pop();
      const isAlreadyLatestUserMsg =
        lastUserMsg && lastUserMsg.content === trimmed && (!existingConvo?.messages || existingConvo.messages.length <= 1);

      if (!isAlreadyLatestUserMsg) {
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

  // Fallback to fetch live web sources only (when user doesn't have key yet or wants real search results)
  const handleFetchWebSourcesOnly = async (queryOverride?: string) => {
    const q = (queryOverride || currentQueryText || initialQuery || '').trim();
    if (!q) return;

    activeAbortControllerRef.current?.abort();
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const reqId = ++requestIdRef.current;

    setIsSynthesizing(true);
    setSynthesisError(null);
    setCurrentQueryText(q);
    setProgressUpdate({ stage: 'searching', message: 'Fetching real-time web results from search engine...' });

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 6 }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Search failed: HTTP ${res.status}`);
      }
      const data = await res.json();
      const results: NormalizedSearchResult[] = data.results || [];
      if (results.length === 0) {
        throw new Error('No web results found for this search query.');
      }
      if (reqId === requestIdRef.current) {
        const converted = results.map(createSourceItemFromNormalized);
        setLiveSources(converted);
        setSelectedSourceId(1);
      }
    } catch (err: any) {
      if (controller.signal.aborted || err?.name === 'AbortError') return;
      if (reqId === requestIdRef.current) {
        setSynthesisError(err.message || 'Failed to retrieve web sources.');
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setIsSynthesizing(false);
        setProgressUpdate(null);
        activeAbortControllerRef.current = null;
      }
    }
  };

  // Active sources to display from live search results
  const activeSources = liveSources || [];

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
    setCurrentQueryText(queryToRun);
    if (onNewSearch) {
      onNewSearch(queryToRun);
    }
    if (hasGeminiKey) {
      executeLiveResearch(queryToRun, activeConversation?.id, selectedModel);
    } else {
      handleFetchWebSourcesOnly(queryToRun);
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
    <div className="w-full max-w-[1440px] min-w-0 mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-[#191919] text-white px-4 py-2 rounded-xl text-xs font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-[#B8F36B] shrink-0" />
          <span>Research URL copied to clipboard</span>
        </div>
      )}

      {/* BYOK Status Banner when no key is set */}
      {hasGeminiKey === false && (
        <div className="mb-5 p-4 rounded-2xl bg-[#F6F3F2] dark:bg-[#181B14] border border-[#E8E8E5] dark:border-[#282E20] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E0E5D3] dark:bg-[#242C19] flex items-center justify-center text-[#181D13] dark:text-[#B8F36B] shrink-0 mt-0.5 sm:mt-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#191919] dark:text-[#ECEEE6]">
                BYOK Security Vault Active
              </h4>
              <p className="text-xs text-[#717171] dark:text-[#9EA396] mt-0.5 leading-relaxed">
                Add your Google Gemini API key in Settings to synthesize live grounded answers with full citation integrity. Keys are kept strictly in your local browser IndexedDB vault.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleFetchWebSourcesOnly()}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E2319] text-[#191919] dark:text-[#ECEEE6] text-xs font-medium border border-[#E8E8E5] dark:border-[#282E20] hover:bg-[#F1F2ED] dark:hover:bg-[#252D1E] transition-colors cursor-pointer"
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
      <section className="flex flex-col gap-3.5 pb-4 mb-6 bg-[#F6F3F2]/60 dark:bg-[#181B14]/80 rounded-2xl p-4 sm:p-5 border border-[#E8E8E5]/70 dark:border-[#282E20]/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs & Title */}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-[#717171] dark:text-[#9EA396] flex-wrap">
              <span className="cursor-pointer hover:text-[#191919] dark:hover:text-[#ECEEE6]" onClick={() => onNavigate?.('home')}>
                Home
              </span>
              <span className="text-[#DFE0DC] dark:text-[#282E20]">/</span>
              <span className="text-[#434938] dark:text-[#C5CAB8] font-medium">Research</span>
              <span className="text-[#DFE0DC] dark:text-[#282E20]">/</span>
              <span className="text-[#717171] dark:text-[#9EA396] truncate max-w-xs">{currentQuery}</span>
            </div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold text-[#191919] dark:text-[#ECEEE6] tracking-tight break-words min-w-0">
              {currentQuery}
            </h1>
          </div>

          {/* Utility Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white dark:bg-[#1E2319] text-[#191919] dark:text-[#ECEEE6] text-xs font-medium rounded-lg border border-[#E8E8E5] dark:border-[#282E20] hover:bg-[#F1F2ED] dark:hover:bg-[#252D1E] transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="w-9 h-9 flex items-center justify-center bg-white dark:bg-[#1E2319] text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] rounded-lg border border-[#E8E8E5] dark:border-[#282E20] hover:bg-[#F1F2ED] dark:hover:bg-[#252D1E] transition-colors cursor-pointer"
              title="Copy link"
              aria-label="Copy link"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (hasGeminiKey) executeLiveResearch(currentQuery);
                else handleFetchWebSourcesOnly();
              }}
              className="w-9 h-9 flex items-center justify-center bg-white dark:bg-[#1E2319] text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] rounded-lg border border-[#E8E8E5] dark:border-[#282E20] hover:bg-[#F1F2ED] dark:hover:bg-[#252D1E] transition-colors cursor-pointer"
              title="Re-run search synthesis"
              aria-label="Re-run search synthesis"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Telemetry Meta Badges & Navigation Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#E8E8E5]/50 dark:border-[#282E20]/50">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-[#717171] dark:text-[#9EA396]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-medium">
              <Globe className="w-3.5 h-3.5 text-[#416900] dark:text-[#B8F36B] shrink-0" />
              <span>Web Research</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                synthesizedResult?.modelConfirmed
                  ? 'border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/40'
                  : 'bg-white dark:bg-[#151711] border-[#E8E8E5] dark:border-[#282E20] text-[#191919] dark:text-[#ECEEE6]'
              }`}
              title={
                synthesizedResult?.modelConfirmed
                  ? `Confirmed synthesis execution with ${synthesizedResult.modelUsed} (${synthesizedResult.provider})`
                  : `Active requested model: ${selectedModel || initialModel || 'Not Configured'}`
              }
            >
              <Bot className={`w-3.5 h-3.5 shrink-0 ${synthesizedResult?.modelConfirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#717171] dark:text-[#9EA396]'}`} />
              <span className="font-mono text-[11px] truncate max-w-[120px] sm:max-w-none">
                {synthesizedResult?.modelUsed || selectedModel || initialModel || 'Select Model'}
              </span>
              {synthesizedResult?.modelConfirmed ? (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1 py-0.2 rounded font-medium">
                  Confirmed
                </span>
              ) : (
                <span className="text-[10px] text-[#717171] dark:text-[#9EA396] bg-[#F1F2ED] dark:bg-[#20251A] px-1 py-0.2 rounded font-medium">
                  Requested
                </span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#151711] border border-[#E8E8E5] dark:border-[#282E20] text-[#191919] dark:text-[#ECEEE6]">
              <Library className="w-3.5 h-3.5 text-[#717171] dark:text-[#9EA396] shrink-0" />
              <span>{activeSources.length} Sources</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E5E2E1]/60 dark:bg-[#20251A] text-[#717171] dark:text-[#9EA396] font-mono text-[11px]">
              <Clock className="w-3 h-3" />
              <span>
                {synthesizedResult?.executionTimeMs
                  ? `${(synthesizedResult.executionTimeMs / 1000).toFixed(1)}s`
                  : 'Ready'}
              </span>
            </span>
          </div>

          {/* Mode Switcher Tabs (Scrollable on small screens) */}
          <div className="inline-flex p-1 bg-[#F1F2ED] dark:bg-[#181B14] rounded-xl text-xs font-medium border border-[#E8E8E5] dark:border-[#282E20] overflow-x-auto scrollbar-none max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('answer')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[34px] ${
                activeTab === 'answer'
                  ? 'bg-white dark:bg-[#242C19] text-[#191919] dark:text-[#D6FF8E] font-semibold shadow-2xs'
                  : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
              }`}
            >
              Answer
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('sources');
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                  sourcesDrawerRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[34px] ${
                activeTab === 'sources'
                  ? 'bg-white dark:bg-[#242C19] text-[#191919] dark:text-[#D6FF8E] font-semibold shadow-2xs'
                  : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
              }`}
            >
              <span>Sources</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#B8F36B] text-[#102000] text-[10px] font-bold">
                {activeSources.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[34px] ${
                activeTab === 'images'
                  ? 'bg-white dark:bg-[#242C19] text-[#191919] dark:text-[#D6FF8E] font-semibold shadow-2xs'
                  : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
              }`}
            >
              Images
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('related')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap min-h-[34px] ${
                activeTab === 'related'
                  ? 'bg-white dark:bg-[#242C19] text-[#191919] dark:text-[#D6FF8E] font-semibold shadow-2xs'
                  : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
              }`}
            >
              Related
            </button>
          </div>
        </div>
      </section>

      {/* Synthesis In-Progress Pipeline Indicator */}
      {isSynthesizing && (
        <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-[#151711] border border-[#B8F36B] shadow-md flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] flex items-center justify-center text-[#181D13] dark:text-[#B8F36B] animate-spin">
              <RotateCw className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-[#191919] dark:text-[#ECEEE6]">
                {progressUpdate?.message || 'Synthesizing evidence-grounded answer...'}
              </p>
              <p className="text-[11px] text-[#717171] dark:text-[#9EA396]">
                Stage:{' '}
                <span className="capitalize font-mono text-[#416900] dark:text-[#B8F36B] font-medium">
                  {progressUpdate?.stage || 'Investigating'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStopGeneration}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
              title="Stop research generation"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Generating</span>
            </button>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-full bg-[#F1F2ED] dark:bg-[#1E2319] border border-[#E8E8E5] dark:border-[#282E20] text-xs font-mono text-[#717171] dark:text-[#9EA396]">
              Real-time Web Search
            </span>
          </div>
        </div>
      )}

      {/* Generation Interrupted / Stopped Banner */}
      {isInterrupted && !isSynthesizing && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Square className="w-3 h-3 fill-current" />
            </span>
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-200">Generation Interrupted</p>
              <p className="text-amber-800 dark:text-amber-300/80 text-[11px]">
                Research was stopped by user. Retrieved sources and partial findings have been preserved.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => executeLiveResearch(currentQueryText, activeConversation?.id, selectedModel)}
            className="px-3 py-1 rounded-full bg-amber-200/70 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-200 font-medium transition-colors cursor-pointer shrink-0"
          >
            Retry Research
          </button>
        </div>
      )}

      {/* Synthesis Error Display */}
      {synthesisError && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div>
              <p className="text-xs sm:text-sm font-semibold">{synthesisError}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Research synthesis could not be completed. You can verify your API key in Settings or select another model below to re-synthesize.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => executeLiveResearch(currentQueryText, activeConversation?.id, selectedModel)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry Research</span>
              </button>
              {availableModels.length > 0 && (
                <ComposerModelSelector
                  isConfigured={isModelConfigured}
                  selectedModel={selectedModel}
                  availableModels={availableModels}
                  onSelectModel={(newModel) => {
                    selectModel(newModel);
                    executeLiveResearch(currentQueryText, activeConversation?.id, newModel);
                  }}
                  onNavigateSettings={() => onNavigate?.('settings-providers')}
                  direction="down"
                />
              )}
              <button
                type="button"
                onClick={() => onNavigate?.('settings-providers')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1E2319] hover:bg-amber-100 dark:hover:bg-[#252D1E] text-amber-900 dark:text-amber-200 text-xs font-medium border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>Configure Providers & Keys</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column Synthesis Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Primary Synthesis Canvas (8 Cols) */}
        <main className={`lg:col-span-8 flex flex-col gap-6 min-w-0 ${activeTab !== 'sources' ? 'flex' : 'hidden lg:flex'}`}>
          {/* USER FEATURE: SOURCE LOGOS BAR (Initially only logos, click reveals source & name) */}
          <div className="bg-white dark:bg-[#151711] p-3.5 rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#191919] dark:text-[#ECEEE6] shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
              <span>Grounded in {activeSources.length} sources:</span>
              <button
                type="button"
                onClick={() => setRevealAllSourceNames(!revealAllSourceNames)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F1F2ED] dark:bg-[#1E2319] text-[#434938] dark:text-[#C5CAB8] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#E8E8E5] dark:hover:bg-[#252D1E] text-[11px] font-medium transition-colors cursor-pointer border border-[#E8E8E5] dark:border-[#282E20]"
                title={revealAllSourceNames ? 'Collapse to logos only' : 'Reveal all source names'}
              >
                {revealAllSourceNames ? (
                  <>
                    <EyeOff className="w-3 h-3 text-[#717171] dark:text-[#9EA396]" />
                    <span>Logos only</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-[#416900] dark:text-[#B8F36B]" />
                    <span>Reveal names</span>
                  </>
                )}
              </button>
            </div>

            {/* Horizontal Logos Carousel: initially only logos, click reveals name & details */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {activeSources.length === 0 ? (
                <span className="text-xs text-[#717171] dark:text-[#9EA396] italic">No sources loaded</span>
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
                          ? 'bg-[#F6F3F2] dark:bg-[#1E2319] border-[#B8F36B] ring-2 ring-[#B8F36B] shadow-2xs'
                          : 'bg-[#FAFAF8] dark:bg-[#181B14] border-[#E8E8E5] dark:border-[#282E20] hover:bg-white dark:hover:bg-[#1E2319] hover:border-[#DFE0DC] dark:hover:border-[#38402F]'
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
                      <span className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396] font-bold">{item.id}</span>

                      {/* REVEAL ON CLICK: Source name expands when selected or when reveal names is toggled */}
                      {showName && (
                        <span className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6] pr-1.5 animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
                          {item.name}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* TAB: ANSWER / EXECUTIVE SUMMARY */}
          {activeTab === 'answer' && (
            <section className="bg-white dark:bg-[#151711] p-4 sm:p-6 rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] shadow-xs space-y-4 min-w-0">
              <div className="flex items-center justify-between pb-1 border-b border-[#E8E8E5]/50 dark:border-[#282E20]/50 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#416900] dark:text-[#B8F36B]">
                  <Sparkles className="w-4 h-4" />
                  <span>Executive Summary</span>
                </div>
                <span className="text-[11px] font-medium text-[#717171] dark:text-[#9EA396] bg-[#F1F2ED] dark:bg-[#1E2319] px-2 py-0.5 rounded border border-[#E8E8E5] dark:border-[#282E20]">
                  {synthesizedResult ? 'Live Model Synthesis' : activeSources.length > 0 ? 'Evidence Retrieved' : 'Awaiting Synthesis'}
                </span>
              </div>

              {/* Synthesized Live Answer OR Dynamic Empty/Evidence State */}
              {synthesizedResult ? (
                <div className="text-sm sm:text-base text-[#191919] dark:text-[#ECEEE6] leading-relaxed min-w-0">
                  <MarkdownAnswerRenderer
                    content={synthesizedResult.answerText}
                    onCitationClick={scrollToCitation}
                    validSourceIds={activeSources.map((s) => s.id)}
                    highlightedCitationId={highlightedCitationId}
                  />
                  {isInterrupted && (
                    <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Square className="w-3.5 h-3.5 fill-amber-700 dark:fill-amber-400 stroke-none" />
                        <span className="font-medium">Generation was stopped by user. Partial evidence preserved.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => executeLiveResearch(currentQuery, activeConversation?.id, selectedModel)}
                        className="px-2.5 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-800 font-semibold text-[11px] text-amber-950 dark:text-amber-200 transition-colors cursor-pointer"
                      >
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              ) : isSynthesizing ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 rounded-full border-2 border-[#B8F36B] border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-[#717171] dark:text-[#9EA396]">
                    Retrieving web sources and synthesizing evidence-grounded answer...
                  </p>
                </div>
              ) : activeSources.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#F6F3F2] dark:bg-[#181B14] border border-[#E8E8E5] dark:border-[#282E20] space-y-2">
                    <h3 className="text-sm font-semibold text-[#191919] dark:text-[#ECEEE6]">
                      Web Evidence Retrieved ({activeSources.length} sources)
                    </h3>
                    <p className="text-xs text-[#717171] dark:text-[#9EA396] leading-relaxed">
                      Authoritative sources have been compiled for this topic. Configure your Google Gemini API key or click below to synthesize a grounded, fully cited answer.
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {hasGeminiKey ? (
                        <button
                          type="button"
                          onClick={() => executeLiveResearch(currentQueryText, activeConversation?.id, selectedModel)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Synthesize Grounded Answer</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate?.('settings-providers')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Configure Gemini Key in Settings</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-[#F6F3F2]/60 dark:bg-[#181B14]/80 border border-[#E8E8E5] dark:border-[#282E20] text-center space-y-3">
                  <Search className="w-8 h-8 text-[#9E9E99] dark:text-[#808678] mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[#191919] dark:text-[#ECEEE6]">
                      {currentQuery ? `Ready to research "${currentQuery}"` : 'No active research session'}
                    </h3>
                    <p className="text-xs text-[#717171] dark:text-[#9EA396] max-w-md mx-auto">
                      {currentQuery
                        ? 'Fetch live web sources or synthesize a grounded answer using the controls below.'
                        : 'Enter a question or topic in the composer below to begin a live investigation.'}
                    </p>
                  </div>
                  {currentQuery && (
                    <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleFetchWebSourcesOnly()}
                        className="px-3.5 py-2 min-h-[38px] rounded-xl bg-white dark:bg-[#1E2319] text-[#191919] dark:text-[#ECEEE6] text-xs font-medium border border-[#E8E8E5] dark:border-[#282E20] hover:bg-[#F1F2ED] dark:hover:bg-[#252D1E] transition-colors cursor-pointer"
                      >
                        Fetch Web Sources
                      </button>
                      {hasGeminiKey && (
                        <button
                          type="button"
                          onClick={() => executeLiveResearch(currentQueryText, activeConversation?.id, selectedModel)}
                          className="px-3.5 py-2 min-h-[38px] rounded-xl bg-[#B8F36B] text-[#102000] text-xs font-semibold hover:bg-[#A7EB50] transition-colors cursor-pointer shadow-2xs"
                        >
                          Synthesize Answer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* TAB: VISUAL SOURCES & MEDIA EVIDENCE */}
          {activeTab === 'images' && (
            <section className="bg-white dark:bg-[#151711] p-4 sm:p-6 rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] shadow-xs space-y-4 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5]/60 dark:border-[#282E20]/60 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
                  <h3 className="text-sm sm:text-base font-semibold text-[#191919] dark:text-[#ECEEE6]">
                    Visual Sources & Media Evidence
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#717171] dark:text-[#9EA396]">
                  {activeSources.length} Media Pins
                </span>
              </div>
              {activeSources.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#717171] dark:text-[#9EA396]">
                  No visual evidence extracted yet for this query.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeSources.map((source) => (
                    <div
                      key={source.id}
                      className="group rounded-xl border border-[#E8E8E5] dark:border-[#282E20] overflow-hidden bg-[#FAFBF8] dark:bg-[#181B14] hover:border-[#B8F36B] dark:hover:border-[#B8F36B] transition-all p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SourceFavicon
                          url={source.faviconUrl}
                          alt={source.name}
                          initials={source.initials}
                          bgClass={source.bgClass}
                          containerClass="w-8 h-8 rounded-lg text-xs shrink-0"
                          imgClass="w-5 h-5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6] truncate">{source.name}</p>
                          <p className="text-[10px] font-mono text-[#717171] dark:text-[#9EA396] truncate">{source.domain}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#434938] dark:text-[#C5CAB8] line-clamp-2 leading-relaxed">
                        {source.title}
                      </p>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#416900] dark:text-[#B8F36B] hover:underline pt-1"
                      >
                        <span>View Source Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* TAB: RELATED INQUIRIES & QUESTIONS */}
          {activeTab === 'related' && (
            <section className="bg-white dark:bg-[#151711] p-4 sm:p-6 rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] shadow-xs space-y-4 min-w-0">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5]/60 dark:border-[#282E20]/60 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
                  <h3 className="text-sm sm:text-base font-semibold text-[#191919] dark:text-[#ECEEE6]">
                    Related Research Vectors
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#717171] dark:text-[#9EA396]">
                  Autonomous Explorations
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  `How does ${currentQuery} compare with historical benchmarks?`,
                  `What are the most contentious debates surrounding ${currentQuery}?`,
                  `What are the economic, workforce, and regulatory impacts of ${currentQuery}?`,
                  `What do recent academic research studies predict about ${currentQuery}?`,
                  `What are practical recommendations and best practices for ${currentQuery}?`,
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onNewSearch) {
                        onNewSearch(suggestion);
                      } else {
                        executeLiveResearch(suggestion);
                      }
                    }}
                    className="group text-left p-3.5 sm:p-4 rounded-xl border border-[#E8E8E5] dark:border-[#282E20] hover:border-[#B8F36B] dark:hover:border-[#B8F36B] hover:bg-[#F6F3F2] dark:hover:bg-[#181B14] transition-all flex items-start justify-between gap-3 cursor-pointer shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-[#717171] dark:text-[#9EA396] uppercase tracking-wider block">
                        Vector #{idx + 1}
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-[#191919] dark:text-[#ECEEE6] group-hover:text-[#416900] dark:group-hover:text-[#B8F36B] leading-snug">
                        {suggestion}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#9E9E99] dark:text-[#808678] group-hover:text-[#191919] dark:group-hover:text-[#ECEEE6] group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Follow-up Research Bar */}
          <div className="sticky bottom-18 md:bottom-4 z-20">
            <form
              onSubmit={handleFollowUpSubmit}
              className="bg-white/95 dark:bg-[#151711]/95 backdrop-blur-md rounded-2xl p-2 sm:p-2.5 shadow-xl border border-[#E8E8E5] dark:border-[#282E20] flex items-center gap-1.5 sm:gap-2 transition-all focus-within:border-[#B8F36B]"
            >
              <button
                type="button"
                className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] hover:bg-[#F1F2ED] dark:hover:bg-[#1E2319] rounded-xl transition-colors shrink-0"
                title="Attach context file"
                aria-label="Attach file"
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

              <textarea
                value={followUpQuery}
                onChange={(e) => setFollowUpQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFollowUpSubmit(e);
                  }
                }}
                rows={1}
                placeholder="Ask a follow-up question or search a new topic..."
                className="w-full bg-transparent border-0 focus:outline-none text-xs sm:text-sm text-[#191919] dark:text-[#ECEEE6] placeholder:text-[#9E9E99] dark:placeholder:text-[#646A5B] px-2 py-1.5 min-w-0 resize-none leading-relaxed"
              />
              {isSynthesizing ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-lg bg-[#191919] dark:bg-[#B8F36B] hover:bg-[#333333] dark:hover:bg-[#A7EB50] active:scale-95 text-white dark:text-[#102000] shadow-xs flex items-center justify-center shrink-0 cursor-pointer transition-all"
                  title="Stop generating"
                  aria-label="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current stroke-none" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!followUpQuery.trim() || isSynthesizing}
                  className="w-9 h-9 min-h-[36px] min-w-[36px] rounded-full bg-[#B8F36B] text-[#102000] hover:bg-[#A7EB50] active:scale-95 shadow-xs flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-all"
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
        <aside ref={sourcesDrawerRef} className={`lg:col-span-4 flex flex-col gap-4 min-w-0 ${activeTab === 'sources' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Sources Header with View Switcher */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
              <h2 className="text-sm sm:text-base font-semibold text-[#191919] dark:text-[#ECEEE6]">Sources</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-mono text-[11px] font-bold">
                {activeSources.length}
              </span>
            </div>

            {/* Mode Switcher: Logos vs Detailed List */}
            <div className="inline-flex items-center p-0.5 bg-[#F1F2ED] dark:bg-[#181B14] rounded-lg border border-[#E8E8E5] dark:border-[#282E20] text-xs">
              <button
                type="button"
                onClick={() => setSourcesViewMode('logos')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  sourcesViewMode === 'logos'
                    ? 'bg-white dark:bg-[#242C19] text-[#191919] dark:text-[#D6FF8E] shadow-2xs font-semibold'
                    : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
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
                    ? 'bg-white dark:bg-[#242C19] text-[#191919] dark:text-[#D6FF8E] shadow-2xs font-semibold'
                    : 'text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6]'
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
              <div className="bg-white dark:bg-[#151711] p-3.5 rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-[#717171] dark:text-[#9EA396]">
                  <span>Click a logo to reveal source details:</span>
                  <span className="font-mono text-[#416900] dark:text-[#B8F36B] font-semibold">
                    {selectedSourceId ? `Source #${selectedSourceId} active` : 'Click a logo'}
                  </span>
                </div>

                {activeSources.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#717171] dark:text-[#9EA396]">
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
                              ? 'bg-[#F6F3F2] dark:bg-[#1E2319] border-[#B8F36B] ring-2 ring-[#B8F36B] shadow-xs'
                              : isHighlighted
                              ? 'bg-[#F1F2ED] dark:bg-[#1E2319] border-[#B8F36B] ring-2 ring-[#B8F36B] animate-pulse'
                              : 'bg-[#FAFAF8] dark:bg-[#181B14] border-[#E8E8E5] dark:border-[#282E20] hover:bg-white dark:hover:bg-[#1E2319] hover:border-[#DFE0DC] dark:hover:border-[#38402F]'
                          }`}
                          title={`${item.name} (${item.domain}) — ${statusInfo.label}`}
                        >
                          {/* Numerical Badge in top corner */}
                          <span className="absolute top-1 left-1.5 text-[9px] font-mono font-bold text-[#717171] dark:text-[#9EA396]">
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
                          <span className="text-[10px] text-[#717171] dark:text-[#9EA396] group-hover:text-[#191919] dark:group-hover:text-[#ECEEE6] truncate max-w-full font-medium pt-1">
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
                    className="bg-white dark:bg-[#151711] p-4 sm:p-5 rounded-2xl border-2 border-[#B8F36B] shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-150"
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
                            <span className="text-xs font-bold text-[#191919] dark:text-[#ECEEE6] truncate">
                              {activeSource.name}
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass} shrink-0`}
                              title={statusInfo.title}
                            />
                            <span className="text-[10px] text-[#717171] dark:text-[#9EA396] font-mono">
                              ({statusInfo.label})
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396] truncate">
                            {activeSource.domain}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-mono text-[11px] font-bold">
                          Source #{activeSource.id}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSourceId(null)}
                          className="p-1 text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] rounded-lg transition-colors cursor-pointer"
                          title="Hide details"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Page Title */}
                    <h3 className="text-sm font-semibold text-[#191919] dark:text-[#ECEEE6] leading-snug">
                      {activeSource.title}
                    </h3>

                    {/* Extracted Evidence Excerpt */}
                    {activeSource.excerpt && !activeSource.excerpt.startsWith('No text excerpt') ? (
                      <blockquote className="text-xs text-[#434938] dark:text-[#C5CAB8] leading-relaxed bg-[#F6F3F2] dark:bg-[#181B14] p-3 rounded-xl border border-[#E8E8E5]/70 dark:border-[#282E20]/70 italic">
                        "{activeSource.excerpt}"
                      </blockquote>
                    ) : (
                      <p className="text-xs text-[#717171] dark:text-[#9EA396] leading-relaxed bg-[#F6F3F2] dark:bg-[#181B14] p-3 rounded-xl border border-[#E8E8E5]/70 dark:border-[#282E20]/70">
                        No text excerpt available from this source.
                      </p>
                    )}

                    {/* Footer with citation counter and actions */}
                    <div className="pt-2 border-t border-[#E8E8E5] dark:border-[#282E20] flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396]">
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
                          className="text-[11px] font-medium text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] cursor-pointer"
                        >
                          Next source →
                        </button>
                        <a
                          href={activeSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#191919] dark:bg-[#B8F36B] text-white dark:text-[#102000] hover:bg-[#313030] dark:hover:bg-[#A7EB50] rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
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
                <div className="p-3.5 bg-white dark:bg-[#151711] rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] text-center text-xs text-[#717171] dark:text-[#9EA396] space-y-1">
                  <p className="font-medium text-[#191919] dark:text-[#ECEEE6]">Logo Explorer Active</p>
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
                <div className="p-4 bg-white dark:bg-[#151711] rounded-2xl border border-[#E8E8E5] dark:border-[#282E20] text-center text-xs text-[#717171] dark:text-[#9EA396]">
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
                      className={`group bg-white dark:bg-[#151711] p-3.5 rounded-xl border border-[#E8E8E5] dark:border-[#282E20] shadow-2xs hover:shadow-md transition-all cursor-pointer ${
                        highlightedCitationId === item.id || selectedSourceId === item.id
                          ? 'ring-2 ring-[#B8F36B] bg-[#F6F3F2] dark:bg-[#1E2319]'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-md bg-[#E0E5D3] dark:bg-[#242C19] text-[#181D13] dark:text-[#D6FF8E] font-mono text-[11px] font-bold shrink-0 mt-0.5">
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
                            <span className="text-xs font-semibold text-[#191919] dark:text-[#ECEEE6] truncate">
                              {item.name}
                            </span>
                            <span className="text-xs text-[#717171] dark:text-[#9EA396] truncate font-mono">
                              ({item.domain})
                            </span>
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass} ml-auto shrink-0`}
                              title={statusInfo.title}
                            />
                          </div>
                          <h4 className="text-xs sm:text-sm font-semibold text-[#191919] dark:text-[#ECEEE6] group-hover:text-[#416900] dark:group-hover:text-[#B8F36B] transition-colors line-clamp-1 pt-1">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-[#717171] dark:text-[#9EA396] line-clamp-2 pt-1 leading-snug">
                            {item.excerpt}
                          </p>
                          <div className="mt-2 pt-2 border-t border-[#E8E8E5]/50 dark:border-[#282E20]/50 flex items-center justify-between text-[11px] font-mono text-[#717171] dark:text-[#9EA396]">
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
                              className="inline-flex items-center gap-1 hover:text-[#191919] dark:hover:text-[#ECEEE6]"
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
          <div className="p-4 rounded-xl bg-[#F6F3F2] dark:bg-[#181B14] border border-[#E8E8E5] dark:border-[#282E20] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#191919] dark:text-[#ECEEE6]">
              <ShieldCheck className="w-4 h-4 text-[#416900] dark:text-[#B8F36B]" />
              <span>Evidence & Citation Grounding</span>
            </div>
            <p className="text-xs text-[#434938] dark:text-[#C5CAB8] leading-relaxed">
              {synthesizedResult
                ? `Synthesized across ${activeSources.length} verified evidence sources using client-side BYOK model execution.`
                : activeSources.length > 0
                ? `${activeSources.length} web sources retrieved and ready for grounded synthesis.`
                : 'No evidence retrieved yet. Submit a research query to retrieve web sources and synthesize citations.'}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${synthesizedResult ? 'bg-[#B8F36B]' : 'bg-[#D1D5DB] dark:bg-[#38402F]'}`} />
              <span className="text-[11px] font-mono text-[#717171] dark:text-[#9EA396]">
                {synthesizedResult
                  ? `${synthesizedResult.citations.integrityPercentage}% Grounded Citations (${synthesizedResult.citations.validCitations}/${synthesizedResult.citations.totalCitations} valid pins)`
                  : activeSources.length > 0
                  ? `${activeSources.length} Sources Ready`
                  : 'Awaiting Research'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
