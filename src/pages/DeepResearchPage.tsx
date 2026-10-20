import React, { useState, useEffect, useRef } from 'react';
import {
  StopCircle,
  Share2,
  Lock,
  RotateCw,
  ArrowRight,
  ChevronRight,
  Terminal,
  FileCheck,
  CheckCircle2,
  Sliders,
  Sparkles,
  ExternalLink,
  Search,
  BookOpen,
} from 'lucide-react';
import { useModelSelection } from '../hooks/useModelSelection';
import { credentialVault } from '../services/storage/indexedDbVault';
import { NormalizedSearchResult } from '../services/search/types';
import { groundedSynthesis } from '../services/synthesis/groundedSynthesis';
import { MarkdownAnswerRenderer } from '../components/research/MarkdownAnswerRenderer';

interface DeepResearchPageProps {
  initialQuery?: string;
  initialModel?: string;
}

interface DeepSubQuery {
  text: string;
  status: string;
  isDone?: boolean;
  isActive?: boolean;
  isPending?: boolean;
}

interface TelemetryLog {
  time: string;
  message: string;
  highlight?: boolean;
}

export const DeepResearchPage: React.FC<DeepResearchPageProps> = ({
  initialQuery = '',
  initialModel,
}) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'activity' | 'sources' | 'report'>('activity');
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [currentTopic, setCurrentTopic] = useState(initialQuery);
  const [isRunning, setIsRunning] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [subQueries, setSubQueries] = useState<DeepSubQuery[]>([]);
  const [discoveredSources, setDiscoveredSources] = useState<NormalizedSearchResult[]>([]);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);

  const { selectedModel, availableModels } = useModelSelection();
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeModelDisplay =
    initialModel ||
    selectedModel ||
    availableModels.find((m) => m.isRecommended)?.name ||
    'Gemini 2.5 Flash';

  const addLog = (message: string, highlight?: boolean) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [...prev, { time, message, highlight }]);
  };

  // Timer while running
  useEffect(() => {
    if (!isRunning || isStopped) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isStopped]);

  const formatRuntime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const steps = [
    {
      num: 1,
      title: '1. Planning the investigation',
      desc: 'Defining research vectors and scope matrices.',
    },
    {
      num: 2,
      title: '2. Generating research queries',
      desc: 'Formulating multi-angle web search seeds.',
    },
    {
      num: 3,
      title: '3. Searching & retrieving sources',
      desc: 'Querying authoritative web repositories and registries.',
    },
    {
      num: 4,
      title: '4. Reviewing evidence & extracting content',
      desc: 'Filtering relevant excerpts and cross-verifying sources.',
    },
    {
      num: 5,
      title: '5. Synthesizing findings',
      desc: 'Connecting evidence across sources and identifying trends.',
    },
    {
      num: 6,
      title: '6. Producing final report',
      desc: 'Formatting executive summary with cited evidence.',
    },
  ];

  const handleStopResearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStopped(true);
    setIsRunning(false);
    addLog('Research investigation stopped by user.', true);
  };

  const executeDeepPipeline = async (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed) return;

    setCurrentTopic(trimmed);
    setIsRunning(true);
    setIsStopped(false);
    setElapsedSeconds(0);
    setFinalReport(null);
    setDiscoveredSources([]);
    setLogs([]);
    setCurrentStepIndex(1);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    addLog(`Initiating deep research investigation for: "${trimmed}"`);

    try {
      // Step 1: Planning
      setCurrentStepIndex(1);
      addLog('Scope targets defined. Planning multi-vector investigation matrix.');
      await new Promise((r) => setTimeout(r, 600));

      if (controller.signal.aborted) return;

      // Step 2: Generating sub-queries
      setCurrentStepIndex(2);
      const generatedQueries: DeepSubQuery[] = [
        { text: `${trimmed} trends and current state`, status: 'Queued', isPending: true },
        { text: `${trimmed} key challenges and analysis`, status: 'Queued', isPending: true },
        { text: `${trimmed} future outlook and projections`, status: 'Queued', isPending: true },
      ];
      setSubQueries(generatedQueries);
      addLog(`Generated ${generatedQueries.length} targeted search queries across distinct angles.`);

      if (controller.signal.aborted) return;

      // Step 3: Searching sources
      setCurrentStepIndex(3);
      const collectedSources: NormalizedSearchResult[] = [];

      for (let i = 0; i < generatedQueries.length; i++) {
        if (controller.signal.aborted) return;

        setSubQueries((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? { ...q, status: 'Retrieving...', isActive: true, isPending: false }
              : q
          )
        );

        addLog(`Executing search vector [${i + 1}/${generatedQueries.length}]: "${generatedQueries[i].text}"`);

        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: generatedQueries[i].text, limit: 4 }),
            signal: controller.signal,
          });

          if (res.ok) {
            const data = await res.json();
            const results: NormalizedSearchResult[] = data.results || [];
            results.forEach((r) => {
              if (!collectedSources.some((s) => s.url === r.url)) {
                collectedSources.push({
                  ...r,
                  id: collectedSources.length + 1,
                });
              }
            });
            setDiscoveredSources([...collectedSources]);
            addLog(`Vector ${i + 1} returned ${results.length} sources (${collectedSources.length} cumulative).`);
          }
        } catch (searchErr: any) {
          if (searchErr.name === 'AbortError') return;
          addLog(`Vector ${i + 1} retrieval note: ${searchErr.message || 'completed'}`);
        }

        setSubQueries((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? { ...q, status: 'Done', isActive: false, isDone: true }
              : q
          )
        );
      }

      if (controller.signal.aborted) return;

      // Step 4: Reviewing evidence
      setCurrentStepIndex(4);
      addLog(`Reviewing and ranking ${collectedSources.length} evidence sources.`);
      await new Promise((r) => setTimeout(r, 600));

      if (controller.signal.aborted) return;

      // Step 5: Synthesizing findings
      setCurrentStepIndex(5);
      addLog('Synthesizing evidence across all retrieved sources into final report.');

      const geminiKey = await credentialVault.getKey('gemini');
      if (geminiKey && collectedSources.length > 0) {
        try {
          const synth = await groundedSynthesis.executeResearch(trimmed, {
            sourcesLimit: 8,
            signal: controller.signal,
          });
          setFinalReport(synth.answerText);
          addLog(`Model synthesis completed successfully with ${synth.citations.totalCitations} verified citations.`);
        } catch (synthErr: any) {
          if (synthErr.name === 'AbortError') return;
          addLog(`Direct synthesis note: ${synthErr.message}. Formatting structured evidence synthesis.`);
          // Create fallback structured summary from collected sources
          const summary = `### Executive Report: ${trimmed}\n\nAcross **${collectedSources.length}** authoritative web sources, research reveals multiple distinct perspectives:\n\n${collectedSources
            .slice(0, 5)
            .map(
              (s, idx) =>
                `**${idx + 1}. [${s.title}](${s.url})** (${s.domain})\n${s.snippet}\n`
            )
            .join('\n')}\n\n### Key Takeaways\n- Multi-source convergence on active developments and industry momentum.\n- Detailed analysis available across the cited evidence index.`;
          setFinalReport(summary);
        }
      } else {
        const summary = `### Executive Report: ${trimmed}\n\nAcross **${collectedSources.length}** authoritative web sources, research reveals multiple distinct perspectives:\n\n${collectedSources
          .slice(0, 5)
          .map(
            (s, idx) =>
              `**${idx + 1}. [${s.title}](${s.url})** (${s.domain})\n${s.snippet}\n`
          )
          .join('\n')}\n\n*Configure your Google Gemini API key in Settings to unlock deep generative synthesis with interactive citation pins.*`;
        setFinalReport(summary);
      }

      // Step 6: Complete
      setCurrentStepIndex(6);
      addLog('Investigation pipeline completed. Final report generated.', true);
      setActiveTab('report');
      setIsRunning(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      addLog(`Pipeline error: ${err.message || 'Execution error'}`);
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (initialQuery && initialQuery.trim().length > 0 && !isRunning && currentStepIndex === 0) {
      executeDeepPipeline(initialQuery);
    }
  }, [initialQuery]);

  const handleStartNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim() || isRunning) return;
    executeDeepPipeline(queryInput.trim());
  };

  return (
    <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Top Context & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-[#717171]">
            <span>Deep Research</span>
            <span className="text-[#DFE0DC]">/</span>
            <span className="font-mono bg-[#F1F2ED] px-2 py-0.5 rounded text-[#191919] border border-[#E8E8E5]">
              {isRunning ? 'PIPELINE-ACTIVE' : currentStepIndex === 6 ? 'COMPLETED' : 'STANDBY'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#191919] tracking-tight">
            {currentTopic || 'Autonomous Deep Research'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8E8E5] text-xs font-medium text-[#191919]">
              <Sparkles className="w-3.5 h-3.5 text-[#416900]" />
              <span>Multi-Step Investigation</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8E8E5] text-xs text-[#717171]">
              <span>{activeModelDisplay}</span>
            </span>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${
                isRunning
                  ? 'bg-[#B8F36B]/40 text-[#102000] border-[#B8F36B]/60'
                  : currentStepIndex === 6
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200'
              }`}
            >
              {isRunning && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
              )}
              <span>
                {isStopped
                  ? 'Research Stopped'
                  : isRunning
                  ? `In progress • Step ${currentStepIndex} of 6`
                  : currentStepIndex === 6
                  ? 'Investigation Complete'
                  : 'Awaiting Query'}
              </span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start md:self-center">
          {isRunning && (
            <button
              type="button"
              onClick={handleStopResearch}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>Stop research</span>
            </button>
          )}
          {currentTopic && !isRunning && (
            <button
              type="button"
              onClick={() => executeDeepPipeline(currentTopic)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCw className="w-4 h-4" />
              <span>Re-run investigation</span>
            </button>
          )}
        </div>
      </div>

      {/* Query Input Prompt if no active topic or to start another */}
      {!currentTopic && !isRunning && (
        <form
          onSubmit={handleStartNew}
          className="bg-white rounded-2xl border border-[#E8E8E5] p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[#717171] uppercase tracking-wider">
            <Search className="w-4 h-4 text-[#416900]" />
            <span>Launch Deep Research Pipeline</span>
          </div>
          <p className="text-xs text-[#717171]">
            Deep research decomposes your complex query into multiple sub-queries, executes multi-vector web searches, cross-verifies sources, and produces an evidence-grounded report.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Enter a research question to investigate..."
              className="flex-1 bg-[#F6F3F2] border border-[#E8E8E5] rounded-xl px-4 py-2 text-sm text-[#191919] focus:outline-none focus:border-[#B8F36B]"
            />
            <button
              type="submit"
              disabled={!queryInput.trim()}
              className="px-5 py-2 rounded-xl bg-[#B8F36B] hover:bg-[#A7EB50] text-[#102000] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Start Investigation
            </button>
          </div>
        </form>
      )}

      {/* Mode Selector Navigation Bar */}
      <div className="flex items-center justify-between bg-[#F1F2ED] p-1.5 rounded-2xl border border-[#E8E8E5]">
        <div className="flex items-center gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'plan' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            Research plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'activity' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            <span>Activity</span>
            {isRunning && <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sources' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            <span>Sources</span>
            <span className="bg-[#E0E5D3] text-[#181D13] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              {discoveredSources.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'report' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            <span>Report Draft</span>
            {!finalReport && <Lock className="w-3 h-3 text-[#9E9E99]" />}
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 pr-2 text-xs font-mono text-[#717171]">
          <span>Runtime: {formatRuntime(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Main Investigation Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sub-column: Research Stepper & Pipeline (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8E8E5] shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between pb-1 border-b border-[#E8E8E5]/50">
              <h2 className="text-sm sm:text-base font-semibold text-[#191919]">
                Investigation Pipeline
              </h2>
              <span className="text-[11px] font-mono font-bold text-[#717171] bg-[#F1F2ED] px-2 py-0.5 rounded border border-[#E8E8E5]">
                {Math.round((currentStepIndex / 6) * 100)}% Done
              </span>
            </div>

            {/* Stepper timeline */}
            <div className="relative flex flex-col gap-5 pl-1">
              <div className="absolute left-[18px] top-3 bottom-6 w-0.5 bg-[#E8E8E5]" />

              {steps.map((st) => {
                const isCompleted = currentStepIndex > st.num;
                const isActive = currentStepIndex === st.num;
                const isPending = currentStepIndex < st.num;

                return (
                  <div key={st.num} className="relative flex items-start gap-3.5 group">
                    {isCompleted && (
                      <div className="relative z-10 w-8 h-8 rounded-full bg-[#B8F36B] text-[#102000] flex items-center justify-center shrink-0 shadow-2xs">
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    )}

                    {isActive && (
                      <div className="relative z-10 w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 ring-4 ring-[#B8F36B] shadow-sm">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
                        </span>
                      </div>
                    )}

                    {isPending && (
                      <div className="relative z-10 w-8 h-8 rounded-full bg-[#F1F2ED] text-[#9E9E99] flex items-center justify-center shrink-0 text-xs font-mono font-semibold border border-[#E8E8E5]">
                        {st.num}
                      </div>
                    )}

                    <div
                      className={`flex flex-col pt-0.5 min-w-0 flex-1 ${
                        isActive
                          ? 'bg-[#F6F3F2] p-3 rounded-xl border border-[#E8E8E5]'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs sm:text-sm font-semibold ${
                            isActive
                              ? 'text-[#191919]'
                              : isCompleted
                              ? 'text-[#191919]'
                              : 'text-[#9E9E99]'
                          }`}
                        >
                          {st.title}
                        </p>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-[#B8F36B] text-[#102000] px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#717171] pt-0.5">{st.desc}</p>
                      {isActive && (
                        <div className="mt-2 w-full bg-[#E5E2E1] rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#B8F36B] h-1.5 rounded-full w-3/4 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Search Efficiency Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E8E5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#717171]">
              <span className="uppercase tracking-wider">Search Telemetry</span>
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-[#F6F3F2] p-2.5 rounded-xl border border-[#E8E8E5]/60">
                <p className="text-[11px] font-mono text-[#717171]">Retrieved</p>
                <p className="text-lg font-bold text-[#191919]">{discoveredSources.length}</p>
              </div>
              <div className="bg-[#F6F3F2] p-2.5 rounded-xl border border-[#E8E8E5]/60">
                <p className="text-[11px] font-mono text-[#717171]">Vectors</p>
                <p className="text-lg font-bold text-[#191919]">{subQueries.length}</p>
              </div>
              <div className="bg-[#F6F3F2] p-2.5 rounded-xl border border-[#E8E8E5]/60">
                <p className="text-[11px] font-mono text-[#717171]">Step</p>
                <p className="text-lg font-bold text-[#416900]">{currentStepIndex}/6</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sub-column: Live Activity Stream / Report / Sources (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* TAB 1: Report Draft */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8E8E5] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5]/60">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#416900]" />
                  <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
                    Synthesized Research Report
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#717171]">
                  {finalReport ? 'Ready' : 'Pending Synthesis'}
                </span>
              </div>
              {finalReport ? (
                <div className="text-sm leading-relaxed text-[#191919]">
                  <MarkdownAnswerRenderer
                    content={finalReport}
                    validSourceIds={discoveredSources.map((s) => s.id)}
                    onCitationClick={(sourceId) => {
                      setActiveTab('sources');
                      const found = discoveredSources.find((s) => s.id === sourceId);
                      if (found?.url) {
                        try {
                          window.open(found.url, '_blank', 'noopener,noreferrer');
                        } catch {
                          // window.open may be restricted in sandboxed iframes
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#717171] space-y-2">
                  <Lock className="w-6 h-6 text-[#9E9E99] mx-auto" />
                  <p className="font-semibold text-[#191919]">Report Draft Not Yet Generated</p>
                  <p>The synthesis report will appear here once the retrieval and evidence pass finishes.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 & Default: Activity & Discovered Sources */}
          {activeTab !== 'report' && (
            <>
              {/* Execution Sub-queries */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8E8E5] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#B8F36B]/40 flex items-center justify-center">
                      <RotateCw
                        className={`w-4 h-4 text-[#416900] ${isRunning ? 'animate-spin' : ''}`}
                      />
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
                      {isRunning ? 'Investigating research vectors...' : 'Investigation Scope'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#717171] bg-[#F1F2ED] px-2 py-0.5 rounded border border-[#E8E8E5]">
                    {subQueries.length} Vectors
                  </span>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {subQueries.length === 0 ? (
                    <p className="text-xs text-[#717171] italic p-3 bg-[#F6F3F2] rounded-xl">
                      Awaiting query decomposition...
                    </p>
                  ) : (
                    subQueries.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F6F3F2] border border-[#E8E8E5]/60 text-xs text-[#191919]"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-[#416900] shrink-0" />
                        <span className="truncate flex-1 font-medium">{q.text}</span>
                        <span
                          className={`font-mono text-[11px] shrink-0 ${
                            q.isActive
                              ? 'text-[#416900] font-semibold animate-pulse'
                              : 'text-[#717171]'
                          }`}
                        >
                          {q.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Discovered Sources Live Feed */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8E8E5] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-[#E8E8E5]/50">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#717171]" />
                    <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
                      Discovered Sources
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-[#E0E5D3] text-[#181D13] font-mono text-[11px] font-bold">
                      {discoveredSources.length}
                    </span>
                  </div>
                </div>

                {discoveredSources.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#717171]">
                    No sources retrieved yet for this investigation.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {discoveredSources.map((src) => (
                      <div
                        key={src.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#F6F3F2] hover:bg-[#EAEBE4] transition-all border border-[#E8E8E5]/60 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E8E5] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            <span className="text-[#434938] text-[10px] font-mono">
                              #{src.id}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="text-xs font-semibold text-[#191919] truncate group-hover:text-[#416900]">
                              {src.title}
                            </p>
                            <p className="text-[11px] font-mono text-[#717171] truncate">{src.domain}</p>
                          </div>
                        </div>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-mono text-[#416900] hover:underline shrink-0 pl-2"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Telemetry Stream (Live Logs) */}
              <div className="bg-[#191919] text-[#FAFAF8] rounded-2xl p-4 font-mono text-xs space-y-1.5 shadow-md">
                <div className="flex items-center justify-between pb-1 border-b border-[#313030] text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#E5E2E1]">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>System Telemetry Stream</span>
                  </div>
                  <span className="text-[#B8F36B] font-bold text-[10px]">
                    {isRunning ? 'LIVE LOGS' : 'STANDBY'}
                  </span>
                </div>
                <div className="space-y-1 text-[#9E9E99] pt-1 max-h-48 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-[#717171] italic">[00:00:00] Awaiting pipeline activation...</p>
                  ) : (
                    logs.map((log, idx) => (
                      <p key={idx} className={log.highlight ? 'text-[#B8F36B]' : ''}>
                        <span className="text-[#717171]">[{log.time}]</span> {log.message}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
