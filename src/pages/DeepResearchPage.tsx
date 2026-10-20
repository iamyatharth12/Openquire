import React, { useState } from 'react';
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
} from 'lucide-react';
import { DevPlaceholderBadge } from '../components/common/UIPrimitives';

interface DeepResearchPageProps {
  initialQuery?: string;
  initialModel?: string;
}

export const DeepResearchPage: React.FC<DeepResearchPageProps> = ({ initialQuery }) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'activity' | 'sources' | 'report'>('activity');
  const [isStopped, setIsStopped] = useState(false);
  const displayQuery = initialQuery || 'The future of renewable energy';

  const steps = [
    {
      num: 1,
      title: '1. Planning the investigation',
      desc: 'Defining primary scope, hypothesis matrices, and core queries.',
      status: 'completed',
      meta: '4 scope targets defined',
    },
    {
      num: 2,
      title: '2. Generating research queries',
      desc: 'Creating targeted scientific queries and regulatory lookups.',
      status: 'completed',
      meta: '18 vector search seeds compiled',
    },
    {
      num: 3,
      title: '3. Searching & retrieving sources',
      desc: 'Crawling academic repositories, policy registries, and energy grids.',
      status: 'active',
      meta: 'In progress',
    },
    {
      num: 4,
      title: '4. Reviewing evidence',
      desc: 'Cross-verifying statistical claims and discarding hallucinations.',
      status: 'pending',
      meta: 'Queued',
    },
    {
      num: 5,
      title: '5. Synthesizing findings',
      desc: 'Connecting quantitative projections and identifying macro trends.',
      status: 'pending',
      meta: 'Queued',
    },
    {
      num: 6,
      title: '6. Producing final report',
      desc: 'Formatting executive summary, key charts, and cited appendix.',
      status: 'pending',
      meta: 'Queued',
    },
  ];

  const subQueries = [
    { text: 'Latest renewable energy trends 2025', status: '12 msgs', isDone: true },
    { text: 'Global solar and wind energy capacity additions', status: 'Retrieving...', isActive: true },
    { text: 'Renewable energy subsidy policies by OECD country', status: 'Queued', isPending: true },
    { text: 'Next-gen battery storage challenges and adoption curves', status: 'Queued', isPending: true },
  ];

  const discoveredSources = [
    {
      initials: 'IR',
      title: 'IRENA — Renewable Energy Statistics 2025',
      url: 'irena.org/publications/reports/2025/renewable-stats',
      format: '2.4MB PDF',
    },
    {
      initials: 'IE',
      title: 'IEA — World Energy Outlook Synthesis',
      url: 'iea.org/weo2024/executive-summary',
      format: 'Data Portal',
    },
    {
      initials: 'Nat',
      initialsClass: 'text-red-600 font-bold',
      title: 'Nature Energy — Advances in Perovskite Solar Technology',
      url: 'nature.com/articles/s41560-024-01582-x',
      format: 'Peer Reviewed',
    },
    {
      initials: 'MIT',
      title: 'MIT Energy Initiative — Grid-Scale Long Duration Storage',
      url: 'energy.mit.edu/research/grid-storage-whitepaper-2025',
      format: 'Whitepaper',
    },
  ];

  return (
    <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* Development Notice */}
      <DevPlaceholderBadge label="Openquire Deep Research Pipeline & Autonomous Agent Execution (Phase 1 Canonical Design)" />

      {/* Top Context & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-[#717171]">
            <span>Deep Research</span>
            <span className="text-[#DFE0DC]">/</span>
            <span className="font-mono bg-[#F1F2ED] px-2 py-0.5 rounded text-[#191919] border border-[#E8E8E5]">
              ID-8924A
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#191919] tracking-tight">
            {displayQuery}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8E8E5] text-xs font-medium text-[#191919]">
              <Sparkles className="w-3.5 h-3.5 text-[#416900]" />
              <span>Deep Research</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8E8E5] text-xs text-[#717171]">
              <span>GPT-4o (Reasoning High)</span>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B8F36B]/40 text-[#102000] border border-[#B8F36B]/60 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-600 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span>{isStopped ? 'Research Stopped' : 'In progress • Step 8 of 12'}</span>
            </span>
          </div>
        </div>

        {/* Action & View Controls */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            type="button"
            onClick={() => setIsStopped(!isStopped)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              isStopped
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
          >
            <StopCircle className="w-4 h-4" />
            <span>{isStopped ? 'Resume research' : 'Stop research'}</span>
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-[#E8E8E5] text-[#717171] hover:text-[#191919] hover:bg-[#F1F2ED] transition-colors"
            title="Share research"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Selector Navigation Bar */}
      <div className="flex items-center justify-between bg-[#F1F2ED] p-1.5 rounded-2xl border border-[#E8E8E5]">
        <div className="flex items-center gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'plan' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            Research plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'activity' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            <span>Activity</span>
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'sources' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            <span>Sources</span>
            <span className="bg-[#E0E5D3] text-[#181D13] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
              24
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'report' ? 'bg-white text-[#191919] shadow-2xs font-semibold' : 'text-[#717171] hover:text-[#191919]'
            }`}
          >
            <span>Report Draft</span>
            <Lock className="w-3 h-3 text-[#9E9E99]" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 pr-2 text-xs font-mono text-[#717171]">
          <span>Runtime: 01m 42s</span>
        </div>
      </div>

      {/* Main Investigation Split Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sub-column: Research Stepper & Pipeline (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8E8E5] shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between pb-1 border-b border-[#E8E8E5]/50">
              <h2 className="text-sm sm:text-base font-semibold text-[#191919]">
                Investigation Pipeline
              </h2>
              <span className="text-[11px] font-mono font-bold text-[#717171] bg-[#F1F2ED] px-2 py-0.5 rounded border border-[#E8E8E5]">
                66% Done
              </span>
            </div>

            {/* Stepper timeline */}
            <div className="relative flex flex-col gap-5 pl-1">
              {/* Continuous vertical line backdrop */}
              <div className="absolute left-[18px] top-3 bottom-6 w-0.5 bg-[#E8E8E5]" />

              {steps.map((st) => (
                <div key={st.num} className="relative flex items-start gap-3.5 group">
                  {st.status === 'completed' && (
                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#B8F36B] text-[#102000] flex items-center justify-center shrink-0 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  )}

                  {st.status === 'active' && (
                    <div className="relative z-10 w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center shrink-0 ring-4 ring-[#B8F36B] shadow-sm">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
                      </span>
                    </div>
                  )}

                  {st.status === 'pending' && (
                    <div className="relative z-10 w-8 h-8 rounded-full bg-[#F1F2ED] text-[#9E9E99] flex items-center justify-center shrink-0 text-xs font-mono font-semibold border border-[#E8E8E5]">
                      {st.num}
                    </div>
                  )}

                  <div
                    className={`flex flex-col pt-0.5 min-w-0 flex-1 ${
                      st.status === 'active'
                        ? 'bg-[#F6F3F2] p-3 rounded-xl border border-[#E8E8E5]'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs sm:text-sm font-semibold ${
                          st.status === 'active'
                            ? 'text-[#191919]'
                            : st.status === 'completed'
                            ? 'text-[#191919]'
                            : 'text-[#9E9E99]'
                        }`}
                      >
                        {st.title}
                      </p>
                      {st.status === 'active' && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-[#B8F36B] text-[#102000] px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#717171] pt-0.5">{st.desc}</p>
                    {st.status === 'active' && (
                      <div className="mt-2 w-full bg-[#E5E2E1] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#B8F36B] h-1.5 rounded-full w-3/4 animate-pulse" />
                      </div>
                    )}
                    {st.status === 'completed' && (
                      <span className="text-[10px] font-mono text-[#416900] pt-1 font-medium">
                        ✓ {st.meta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry Search Efficiency Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E8E5] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#717171]">
              <span className="uppercase tracking-wider">Search Efficiency</span>
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-[#F6F3F2] p-2.5 rounded-xl border border-[#E8E8E5]/60">
                <p className="text-[11px] font-mono text-[#717171]">Fetched</p>
                <p className="text-lg font-bold text-[#191919]">142</p>
              </div>
              <div className="bg-[#F6F3F2] p-2.5 rounded-xl border border-[#E8E8E5]/60">
                <p className="text-[11px] font-mono text-[#717171]">Filtered</p>
                <p className="text-lg font-bold text-[#191919]">24</p>
              </div>
              <div className="bg-[#F6F3F2] p-2.5 rounded-xl border border-[#E8E8E5]/60">
                <p className="text-[11px] font-mono text-[#717171]">Density</p>
                <p className="text-lg font-bold text-[#416900]">94%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sub-column: Live Activity Stream & Discovered Sources (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Live Action Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E8E8E5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#B8F36B]/40 flex items-center justify-center">
                  <RotateCw className="w-4 h-4 text-[#416900] animate-spin" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-[#191919]">
                  Searching for sources...
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#717171] bg-[#F1F2ED] px-2 py-0.5 rounded border border-[#E8E8E5]">
                Web Agent v2.4
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#717171] leading-relaxed">
              Broadening query parameters to capture 2024–2025 regulatory filings, IEA grid forecasts, and lithium-alternatives.
            </p>

            {/* Current Execution Sub-queries */}
            <div className="flex flex-col gap-2 pt-1">
              {subQueries.map((q, idx) => (
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
              ))}
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
                  12
                </span>
              </div>
              <button
                type="button"
                className="text-xs text-[#416900] font-semibold hover:underline inline-flex items-center gap-0.5"
              >
                <span>View all (24)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {discoveredSources.map((src, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#F6F3F2] hover:bg-[#EAEBE4] transition-all border border-[#E8E8E5]/60 group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E8E5] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <span className={src.initialsClass || 'text-[#434938]'}>
                        {src.initials}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="text-xs font-semibold text-[#191919] truncate group-hover:text-[#416900]">
                        {src.title}
                      </p>
                      <p className="text-[11px] font-mono text-[#717171] truncate">{src.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 pl-2">
                    <span className="text-[11px] font-mono text-[#717171] hidden sm:inline bg-white px-2 py-0.5 rounded border border-[#E8E8E5]">
                      {src.format}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Verified" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Telemetry Stream (Live Logs) */}
          <div className="bg-[#191919] text-[#FAFAF8] rounded-2xl p-4 font-mono text-xs space-y-1.5 shadow-md">
            <div className="flex items-center justify-between pb-1 border-b border-[#313030] text-[11px]">
              <div className="flex items-center gap-1.5 text-[#E5E2E1]">
                <Terminal className="w-3.5 h-3.5" />
                <span>System Telemetry Stream</span>
              </div>
              <span className="text-[#B8F36B] font-bold text-[10px]">LIVE LOGS</span>
            </div>
            <div className="space-y-1 text-[#9E9E99] pt-1">
              <p>
                <span className="text-[#717171]">[14:22:04]</span> Connecting to CrossRef semantic mesh API endpoint...
              </p>
              <p>
                <span className="text-[#717171]">[14:22:08]</span> Extracted 42 citations from IEA report, assessing impact factors...
              </p>
              <p>
                <span className="text-[#717171]">[14:22:15]</span>{' '}
                <span className="text-[#B8F36B]">Matched:</span> Perovskite tandem cell efficiency benchmark (33.9% record verified).
              </p>
              <p>
                <span className="text-[#717171]">[14:22:21]</span> Initiating synthesis pass for regional grid parity milestones...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
