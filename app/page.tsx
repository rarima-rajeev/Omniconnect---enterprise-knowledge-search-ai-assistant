'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Server,
  Database,
  Activity,
  Cpu,
  Layers,
  Terminal,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Copy,
  FileText,
  Sparkles,
  Clock,
  Zap,
  Info,
  UserCheck,
  Check,
  ExternalLink,
  ChevronDown,
  Gauge,
} from 'lucide-react';
import { ENTERPRISE_PERSONAS } from '@/lib/supabase';
import { MCP_CONNECTORS } from '@/lib/mcp-manifest';
import { EnterprisePersona, OrchestrationResult, TelemetryEvent, EnterpriseRecord } from '@/lib/types';
import { useAnalytics } from './providers';

export default function WorkbenchPage() {
  const { captureEvent } = useAnalytics();

  // State
  const [selectedPersona, setSelectedPersona] = useState<EnterprisePersona>(ENTERPRISE_PERSONAS[0]);
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'diff' | 'mcp' | 'telemetry'>('diff');
  const [queryInput, setQueryInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OrchestrationResult | null>(null);
  const [telemetryFeed, setTelemetryFeed] = useState<TelemetryEvent[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>(MCP_CONNECTORS[0].id);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Scenarios
  const scenarios = [
    {
      id: 'sc-1',
      title: '1. Query IT Infrastructure Outages',
      subtitle: 'Tests IT vs. Finance ACL clearance',
      badge: 'Read / RLS Filter',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      query: 'Summarize all recent P1/P2 cloud infrastructure outages and active cluster failovers.',
      expectedResult: 'Finance (Jane): prunes 4 restricted IT tickets. IT (Alex) & Admin (Sarah): access all 5.',
    },
    {
      id: 'sc-2',
      title: '2. Query Q3 Executive Payroll & RSUs',
      subtitle: 'Tests Finance vs. IT confidential ledger',
      badge: 'Read / RLS Filter',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      query: 'What are the Q3 executive RSU vesting grants and retention bonus allocations for senior leadership?',
      expectedResult: 'IT (Alex): 100% trimmed (Access Denied). Finance (Jane) & Admin (Sarah): view all equity rows.',
    },
    {
      id: 'sc-3',
      title: '3. Trigger Action: Restart Bastion Host',
      subtitle: 'Tests write gatekeeper & OAuth consent',
      badge: 'Write / Consent Gate',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      query: 'restart_service(service_name="prod-bastion-us-east-1", region="us-east-1", reason="Scheduled TLS certificate flush")',
      expectedResult: 'Jane & Alex: 403 ConsentRequired. Sarah (EnterpriseAdmin): 200 OK Executed.',
    },
  ];

  // Execute scenario or custom query
  const executeQuery = async (queryText: string, actionName?: string, actionPayload?: any) => {
    setIsLoading(true);
    captureEvent('workbench_query_submitted', {
      query: queryText,
      persona: selectedPersona.name,
      department: selectedPersona.department,
    });

    try {
      const isAction =
        actionName ||
        queryText.toLowerCase().includes('restart') ||
        queryText.toLowerCase().includes('reboot');

      const payload = {
        query: queryText,
        personaId: selectedPersona.id,
        actionName: isAction ? 'restart_service' : undefined,
        actionPayload: isAction
          ? {
              service_name: 'prod-bastion-us-east-1',
              region: 'us-east-1',
              reason: 'Scheduled TLS cert flush & connection drain',
            }
          : undefined,
      };

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: OrchestrationResult = await res.json();
      setResult(data);

      if (data.telemetry) {
        setTelemetryFeed(data.telemetry);
      }
    } catch (err) {
      console.error('Execution error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetch('/api/copilot')
      .then((r) => r.json())
      .then((data) => {
        if (data.telemetry) {
          setTelemetryFeed(data.telemetry);
        }
      })
      .catch(() => {});

    // Run first scenario by default
    executeQuery(scenarios[0].query);
  }, []);

  const handleCopyManifest = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Selected connector for Tab 2
  const activeConnector = MCP_CONNECTORS.find((c) => c.id === selectedConnectorId) || MCP_CONNECTORS[0];

  return (
    <div className="flex flex-col min-h-screen bg-[#070b14] text-slate-100 selection:bg-blue-600/40">
      {/* ==================================================================== */}
      {/* TOP HEADER */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090e1c]/90 backdrop-blur-md px-4 lg:px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-white text-base lg:text-lg">OmniConnect</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 tracking-wider">
                  M365 Gateway
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Copilot Connector Gateway &amp; Enterprise Dev Workbench
              </p>
            </div>
          </div>

          {/* Active Connector Badges */}
          <div className="hidden xl:flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-soft-pulse" />
              <span className="text-slate-300 font-medium">IT Incidents (v2.4)</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-soft-pulse" />
              <span className="text-slate-300 font-medium">Payroll &amp; Equity (v1.9)</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-amber-500/30 text-[11px]">
              <Lock className="h-3 w-3 text-amber-400" />
              <span className="text-amber-300 font-medium">Bastion SRE (Write-Gated)</span>
            </div>
          </div>

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <div className="flex items-center space-x-2 text-xs text-slate-400 mr-1 hidden sm:inline-flex">
              <span>Persona:</span>
            </div>
            <button
              onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
              className="flex items-center space-x-3 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-blue-500/50 transition-all text-left shadow-sm"
            >
              <img
                src={selectedPersona.avatar}
                alt={selectedPersona.name}
                className="h-7 w-7 rounded-full object-cover ring-1 ring-blue-500/40"
              />
              <div className="text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold text-white leading-none">{selectedPersona.name}</span>
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                      selectedPersona.role === 'EnterpriseAdmin'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : selectedPersona.department === 'IT'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {selectedPersona.clearanceLevel}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {selectedPersona.department} • {selectedPersona.role}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
            </button>

            {/* Persona Menu Popover */}
            {isPersonaMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#0e1628] border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Select Enterprise Persona
                </div>
                <div className="mt-1 space-y-1">
                  {ENTERPRISE_PERSONAS.map((p) => {
                    const isCurrent = p.id === selectedPersona.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPersona(p);
                          setIsPersonaMenuOpen(false);
                        }}
                        className={`w-full flex items-start space-x-3 p-2.5 rounded-lg text-left transition-all ${
                          isCurrent
                            ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                            : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                        }`}
                      >
                        <img src={p.avatar} alt={p.name} className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{p.name}</span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                p.role === 'EnterpriseAdmin'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : p.department === 'IT'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {p.clearanceLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium">{p.title}</p>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN WORKBENCH GRID */}
      {/* ==================================================================== */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* ================================================================== */}
        {/* LEFT COLUMN: COPILOT CHAT, SCENARIOS & PIPELINE EXECUTION (5 cols) */}
        {/* ================================================================== */}
        <section className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-800/80 bg-[#090d19] flex flex-col p-4 sm:p-5 overflow-y-auto max-h-screen">
          {/* Persona Clearance Summary Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <UserCheck className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">Active Security Boundary</span>
              </div>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                ACL Tier: {selectedPersona.clearanceLevel}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400 leading-relaxed">
              Querying as <span className="font-semibold text-slate-200">{selectedPersona.name}</span> in{' '}
              <span className="font-semibold text-slate-200">{selectedPersona.department}</span>. All Copilot context
              injections are restricted strictly to permitted records.
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {selectedPersona.scopes.map((scope) => (
                <span
                  key={scope}
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/50"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>

          {/* Scenario Quick Buttons */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Enterprise Test Scenarios
              </span>
              <span className="text-[10px] text-slate-500">1-Click Trigger</span>
            </div>
            <div className="space-y-2">
              {scenarios.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => {
                    setQueryInput(sc.query);
                    executeQuery(sc.query);
                  }}
                  disabled={isLoading}
                  className="w-full text-left p-3 rounded-lg border border-slate-800/90 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                      {sc.title}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{sc.subtitle}</p>
                  <p className="text-[10px] text-slate-500 mt-1.5 font-mono bg-slate-950/60 p-1 rounded border border-slate-800/50">
                    Expectation: {sc.expectedResult}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Query Input Box */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="custom-query" className="text-xs font-semibold text-slate-300">
                Custom Copilot Query / Tool Dispatch
              </label>
              <button
                onClick={() => setQueryInput('')}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="relative">
              <textarea
                id="custom-query"
                rows={2}
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Ask Copilot a question or invoke restart_service(...)..."
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => executeQuery(queryInput)}
                  disabled={isLoading || !queryInput.trim()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold shadow transition-all"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Orchestrating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Dispatch Gateway</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Execution Pipeline Timeline */}
          {result && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                  <Activity className="h-3.5 w-3.5 text-blue-400" />
                  <span>Gateway Pipeline Stages</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">Total: {result.latencyMs}ms</span>
              </div>

              <div className="space-y-2">
                {result.executionSteps.map((step) => {
                  const isBlocked = step.status === 'blocked';
                  return (
                    <div
                      key={step.step}
                      className={`flex items-start space-x-2.5 p-2 rounded-lg border text-xs ${
                        isBlocked
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isBlocked ? (
                          <XCircle className="h-3.5 w-3.5 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">
                            {step.step}. {step.name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">{step.durationMs}ms</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grounded LLM Response / Security Banner */}
          {result && (
            <div className="flex-1 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold text-slate-200">Grounded Copilot Output</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 bg-slate-800 rounded">
                  {result.modelUsed}
                </span>
              </div>

              {/* Security Intercept Banner */}
              {result.securityInterceptNote && (
                <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Enterprise Clearance Policy Enforced</div>
                    <div className="text-[11px] text-amber-200/80 mt-0.5">{result.securityInterceptNote}</div>
                  </div>
                </div>
              )}

              {/* 403 Consent Required Error Banner */}
              {result.consentRequired && (
                <div className="mb-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-200 text-xs">
                  <div className="flex items-center space-x-2 font-bold text-rose-400 mb-1">
                    <Lock className="h-4 w-4" />
                    <span>{result.consentRequired.code}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed mb-2">{result.consentRequired.message}</p>
                  <div className="font-semibold text-[11px] text-slate-300 mb-1">Remediation Steps:</div>
                  <ul className="space-y-1 text-[10px] text-slate-400 font-mono">
                    {result.consentRequired.resolutionSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Markdown Content Output */}
              <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap flex-1 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 overflow-y-auto">
                {result.groundedResponse}
              </div>

              {/* Telemetry Stats Footer */}
              <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
                <div className="flex items-center space-x-3">
                  <span>Latency: {result.latencyMs}ms</span>
                  <span>Tokens: {result.tokenStats.totalTokens}</span>
                </div>
                <div>Trimming Ratio: {result.trimRatio}%</div>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================== */}
        {/* RIGHT COLUMN: OBSERVABILITY & GOVERNANCE DECK (7 cols)            */}
        {/* ================================================================== */}
        <section className="lg:col-span-7 bg-[#080c17] flex flex-col overflow-hidden max-h-screen">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#0a0f1e] px-4 pt-3">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('diff')}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-t border-l border-r ${
                  activeTab === 'diff'
                    ? 'bg-[#080c17] border-slate-700 text-blue-400 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>Permission &amp; RLS Diff</span>
                {result && result.trimmedRecords.length > 0 && (
                  <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded-full font-mono">
                    {result.trimmedRecords.length} pruned
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('mcp')}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-t border-l border-r ${
                  activeTab === 'mcp'
                    ? 'bg-[#080c17] border-slate-700 text-blue-400 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>MCP Connector Manifests</span>
              </button>

              <button
                onClick={() => setActiveTab('telemetry')}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-t border-l border-r ${
                  activeTab === 'telemetry'
                    ? 'bg-[#080c17] border-slate-700 text-blue-400 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Audit Trail &amp; PostHog</span>
                <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded-full font-mono">
                  Live
                </span>
              </button>
            </div>

            <div className="flex items-center space-x-2 pb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Telemetry Active</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 p-4 lg:p-5 overflow-y-auto">
            {/* ============================================================== */}
            {/* TAB 1: PERMISSION & RLS DIFF                                   */}
            {/* ============================================================== */}
            {activeTab === 'diff' && (
              <div className="space-y-4">
                {/* Trimming Statistics Header Card */}
                {result && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Records Scanned</div>
                      <div className="text-xl font-bold text-white font-mono mt-1">{result.recordsScanned}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Database candidate pool</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Records Permitted</div>
                      <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{result.recordsPermitted}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Injected into prompt</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Records Pruned (ACL)</div>
                      <div className="text-xl font-bold text-rose-400 font-mono mt-1">{result.trimmedRecords.length}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Zero data leakage</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Trimming Ratio</div>
                      <div className="text-xl font-bold text-amber-400 font-mono mt-1">{result.trimRatio}%</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">ACL enforcement delta</div>
                    </div>
                  </div>
                )}

                {/* Candidate Records Dual-Pane Inspector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-300">
                      Row Level Security (RLS) Inspection Deck
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Green = Permitted to LLM | Red = Pruned by Gateway
                    </div>
                  </div>

                  {result && result.scannedRecords.length > 0 ? (
                    <div className="space-y-2.5">
                      {result.scannedRecords.map((rec) => {
                        const isPermitted = result.permittedRecords.some((p) => p.id === rec.id);
                        const isExpanded = expandedRecordId === rec.id;

                        return (
                          <div
                            key={rec.id}
                            className={`rounded-xl border p-3.5 transition-all ${
                              isPermitted
                                ? 'bg-slate-900/40 border-emerald-500/30 hover:border-emerald-500/50'
                                : 'bg-rose-950/10 border-rose-500/30 hover:border-rose-500/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-2.5">
                                <div className="mt-0.5">
                                  {isPermitted ? (
                                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                  ) : (
                                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-xs font-bold text-white">{rec.id}</span>
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.2 rounded ${
                                        isPermitted
                                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                                      }`}
                                    >
                                      {isPermitted ? 'PERMITTED (Context Injected)' : 'PRUNED (Zero Leakage)'}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                                      Dept: {rec.department}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                                      Req Clearance: {rec.minClearance}
                                    </span>
                                  </div>

                                  <div className="text-xs font-semibold text-slate-200 mt-1">
                                    {rec.data.title || rec.data.service}
                                  </div>

                                  {!isPermitted && (
                                    <div className="mt-1.5 text-[11px] text-rose-300 font-mono bg-rose-950/40 px-2 py-1 rounded border border-rose-500/20">
                                      Interception Reason: {rec.metadata.acl_tag || 'Clearance policy denied'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                                className="text-[11px] text-slate-400 hover:text-slate-200 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700"
                              >
                                {isExpanded ? 'Collapse JSON' : 'Inspect JSON'}
                              </button>
                            </div>

                            {isExpanded && (
                              <pre className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto">
                                {JSON.stringify(rec, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs rounded-xl border border-slate-800 bg-slate-900/30">
                      No records in current execution candidate pool. Trigger a scenario to inspect RLS trimming.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: MCP CONNECTOR MANIFESTS                                */}
            {/* ============================================================== */}
            {activeTab === 'mcp' && (
              <div className="space-y-4">
                {/* Connector Selector Pill bar */}
                <div className="flex flex-wrap gap-2">
                  {MCP_CONNECTORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedConnectorId(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        selectedConnectorId === c.id
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {c.tool.name} ({c.category === 'agent_action' ? 'Write' : 'Read'})
                    </button>
                  ))}
                </div>

                {/* Connector Details Card */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{activeConnector.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          v{activeConnector.version}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{activeConnector.description}</p>
                    </div>

                    <button
                      onClick={() => handleCopyManifest(activeConnector)}
                      className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all font-mono"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy Manifest</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Manifest Properties Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Contract Type</div>
                      <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                        {activeConnector.category === 'agent_action' ? 'Autonomous Action (Write)' : 'Semantic Retrieval (Read)'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Gateway Target</div>
                      <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">{activeConnector.endpoint}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Required OAuth Scopes</div>
                      <div className="text-xs font-mono text-amber-300 mt-0.5">
                        {activeConnector.requiredScopes.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Formatted MCP JSON View */}
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-2">Model Context Protocol (MCP) Tool Schema</div>
                    <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed">
                      {JSON.stringify(activeConnector.tool, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: AUDIT TRAIL & POSTHOG TELEMETRY                        */}
            {/* ============================================================== */}
            {activeTab === 'telemetry' && (
              <div className="space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Events Captured</div>
                    <div className="text-xl font-bold text-white font-mono mt-1">{telemetryFeed.length}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Stream buffer size</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Mean Latency</div>
                    <div className="text-xl font-bold text-blue-400 font-mono mt-1">
                      {result ? `${result.latencyMs}ms` : '182ms'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">End-to-end gateway</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">ACL Trim Events</div>
                    <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                      {telemetryFeed.filter((e) => e.eventName === 'acl_records_trimmed').length}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Leakage mitigations</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Write Blockades</div>
                    <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                      {telemetryFeed.filter((e) => e.eventName === 'action_blocked_unauthorized').length}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Unauthorized intercepted</div>
                  </div>
                </div>

                {/* Telemetry Stream Feed */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-300">
                      Live Telemetry Stream (`posthog-node` &amp; `posthog-js`)
                    </div>
                    <button
                      onClick={() => {
                        fetch('/api/copilot')
                          .then((r) => r.json())
                          .then((d) => d.telemetry && setTelemetryFeed(d.telemetry));
                      }}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 font-mono"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {telemetryFeed.map((evt) => {
                      const isExpanded = expandedEventId === evt.id;

                      let badgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                      if (evt.eventName === 'acl_records_trimmed') {
                        badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                      } else if (evt.eventName === 'action_blocked_unauthorized') {
                        badgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                      } else if (evt.eventName === 'agent_action_executed') {
                        badgeColor =
                          evt.properties.status === 'success'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30';
                      }

                      return (
                        <div
                          key={evt.id}
                          className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                                {evt.eventName}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(evt.timestamp).toLocaleTimeString()}
                              </span>
                            </div>

                            <button
                              onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 font-mono bg-slate-800 px-2 py-0.5 rounded"
                            >
                              {isExpanded ? 'Hide Payload' : 'Payload'}
                            </button>
                          </div>

                          <div className="mt-2 text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
                            {evt.properties.connector_id && (
                              <span>connector: <span className="text-blue-400">{evt.properties.connector_id}</span></span>
                            )}
                            {evt.properties.user_id && (
                              <span>user: <span className="text-slate-200">{evt.properties.user_id}</span></span>
                            )}
                            {evt.properties.trim_ratio !== undefined && (
                              <span>trim_ratio: <span className="text-amber-400">{evt.properties.trim_ratio}%</span></span>
                            )}
                            {evt.properties.latency_ms !== undefined && (
                              <span>latency: <span className="text-purple-400">{evt.properties.latency_ms}ms</span></span>
                            )}
                            {evt.properties.action_type && (
                              <span>action: <span className="text-rose-400">{evt.properties.action_type}</span></span>
                            )}
                          </div>

                          {isExpanded && (
                            <pre className="mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto">
                              {JSON.stringify(evt.properties, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
