'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ExternalLink,
  ChevronUp,
  Cpu,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { ENTERPRISE_PERSONAS } from '@/lib/supabase';
import { EnterprisePersona, OrchestrationResult } from '@/lib/types';
import { useAnalytics } from './providers';

interface PopularQuery {
  id: string;
  tag: string;
  tagType: 'action' | 'confidential' | 'hr' | 'public' | 'tech';
  query: string;
  accessRule: string;
}

export default function CopilotChatLandingPage() {
  const { captureEvent } = useAnalytics();

  // State: Persona defaults to Neil Wright (Intern) or loaded from localStorage
  const [selectedPersona, setSelectedPersona] = useState<EnterprisePersona>(ENTERPRISE_PERSONAS[4]);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [currentResult, setCurrentResult] = useState<OrchestrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMicroAudit, setShowMicroAudit] = useState(false);

  // Popular Queries specified in the PRD
  const popularQueries: PopularQuery[] = [
    {
      id: 'q1',
      tag: 'Agent Action - SRE',
      tagType: 'action',
      query: 'The website seems slow, can you restart the production bastion host or reboot the API gateway?',
      accessRule: 'Allowed: Binny Lee (L6) • Denied: Jane, Alex, Sarah, Neil (403 Consent Required)',
    },
    {
      id: 'q2',
      tag: 'Agent Action - Finance',
      tagType: 'action',
      query: 'Approve vendor invoice #9021 for $150,000 and queue the ACH wire transfer.',
      accessRule: 'Allowed: Jane Doe (FinanceDirector) • Denied: Binny, Alex, Sarah, Neil (403 Forbidden)',
    },
    {
      id: 'q3',
      tag: 'Agent Action - Data Governance',
      tagType: 'action',
      query: 'Delete all inactive customer test records from the production CRM database.',
      accessRule: 'Allowed: Binny Lee (L6) • Denied: All others (403 Destructive Action Blocked)',
    },
    {
      id: 'q4',
      tag: 'Knowledge Retrieval - Confidential',
      tagType: 'confidential',
      query: "What was the CEO’s and VP of Engineering's total stock vesting value and bonus last quarter?",
      accessRule: 'Allowed: Jane Doe & Sarah Chen • Denied / Masked: Alex, Binny, Neil (RLS Trimmed)',
    },
    {
      id: 'q5',
      tag: 'Knowledge Retrieval - HR/Comp',
      tagType: 'hr',
      query: 'What is the salary range and recent offer letters sent to candidates in London?',
      accessRule: 'Allowed: Sarah Chen (EnterpriseAdmin) • Denied: Jane, Alex, Binny, Neil',
    },
    {
      id: 'q6',
      tag: 'Knowledge Retrieval - Public',
      tagType: 'public',
      query: 'Who is the CEO of this company?',
      accessRule: 'Allowed: Everyone (including Neil Wright - Intern)',
    },
    {
      id: 'q7',
      tag: 'Knowledge Retrieval - Technical',
      tagType: 'tech',
      query: 'Summarize the root cause analysis for Postgres RDS failover incident #8921.',
      accessRule: 'Alex (Full Technical Logs) • Sarah/Binny/Jane (Executive Summary) • Neil (Restricted)',
    },
  ];

  // Sync persona with localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('omni_active_persona');
      if (saved) {
        const found = ENTERPRISE_PERSONAS.find((p) => p.id === saved);
        if (found) setSelectedPersona(found);
      }
    } catch {}
  }, []);

  const handleSelectPersona = (p: EnterprisePersona) => {
    setSelectedPersona(p);
    setIsPersonaDropdownOpen(false);
    try {
      localStorage.setItem('omni_active_persona', p.id);
    } catch {}

    // If there is an active result, re-run query under new persona
    if (currentResult?.query) {
      executeQuery(currentResult.query, p);
    }
  };

  const executeQuery = async (queryText: string, personaToUse = selectedPersona) => {
    if (!queryText.trim()) return;
    setIsLoading(true);
    setInputQuery(queryText);
    captureEvent('copilot_query_dispatched', {
      query: queryText,
      persona: personaToUse.name,
      role: personaToUse.role,
    });

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText,
          personaId: personaToUse.id,
        }),
      });

      const data: OrchestrationResult = await res.json();
      setCurrentResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isJaySeal = selectedPersona.id === 'persona-jay';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600/40">
      {/* ==================================================================== */}
      {/* TOP-RIGHT HEADER WITH PERSONA SWITCHER & ADMIN OBSERVABILITY LINK     */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#090e1c]/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-xs">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-white">OmniConnect</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded font-semibold">
                  Enterprise AI
                </span>
              </div>
            </div>
          </div>

          {/* Right Header: Jay Seal Admin Link & Persona Switcher */}
          <div className="flex items-center space-x-3">
            {/* Prominent Secondary Button for Jay Seal */}
            {isJaySeal && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all border border-purple-400/30 animate-in fade-in duration-200"
              >
                <span>Open Dev Workbench</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPersonaDropdownOpen(!isPersonaDropdownOpen)}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-slate-600 transition-all text-left shadow-sm"
              >
                <img
                  src={selectedPersona.avatar}
                  alt={selectedPersona.name}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-blue-500/40"
                />
                <div className="text-left hidden sm:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-white">{selectedPersona.name}</span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        selectedPersona.clearanceLevel === 'L6'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : selectedPersona.clearanceLevel === 'L4'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : selectedPersona.clearanceLevel === 'L3'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {selectedPersona.levelDisplay}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedPersona.department} • {selectedPersona.role}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-1" />
              </button>

              {/* Persona Dropdown Menu */}
              {isPersonaDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#0d1424] border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Enterprise Persona
                  </div>
                  <div className="mt-1 space-y-1">
                    {ENTERPRISE_PERSONAS.map((p) => {
                      const isCurrent = p.id === selectedPersona.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPersona(p)}
                          className={`w-full flex items-start space-x-3 p-2.5 rounded-lg text-left transition-all ${
                            isCurrent
                              ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                              : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                          }`}
                        >
                          <img
                            src={p.avatar}
                            alt={p.name}
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-600 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate">{p.name}</span>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  p.clearanceLevel === 'L6'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : p.clearanceLevel === 'L4'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : p.clearanceLevel === 'L3'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {p.levelDisplay}
                              </span>
                            </div>
                            <div className="text-[10px] text-blue-300 truncate">
                              {p.department} • {p.role}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* MAIN CONVERSATIONAL WORKSPACE                                        */}
      {/* ==================================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-start space-y-6">
        {/* Minimal Hero Header */}
        <div className="text-center pt-2 sm:pt-4 pb-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-400 mb-3 shadow-inner">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Enterprise Knowledge Gateway • Role-Based</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            OmniConnect — Enterprise Knowledge Search AI Assistant
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xl mx-auto leading-relaxed">
            Ask questions across company documents with automated role-based permission controls.
          </p>
        </div>

        {/* Search / Command Input Bar */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputQuery.trim()) {
                  executeQuery(inputQuery);
                }
              }}
              placeholder={`Ask questions across company documents as ${selectedPersona.name} (${selectedPersona.role})...`}
              className="w-full pl-10 pr-24 py-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs sm:text-sm text-slate-100 placeholder-slate-500 shadow-xl focus:outline-none transition-all font-mono"
            />
            <div className="absolute right-2 flex items-center">
              <button
                onClick={() => executeQuery(inputQuery)}
                disabled={isLoading || !inputQuery.trim()}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-semibold shadow transition-all flex items-center space-x-1"
              >
                {isLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <span>Dispatch</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* INTERACTION STATE: RESPONSE CARD DIRECTLY BELOW SEARCH BAR         */}
        {/* ================================================================== */}
        {isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center shadow-lg">
            <RefreshCw className="h-5 w-5 text-blue-400 animate-spin mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-200">Evaluating Gateway Security Boundary...</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Checking Row Level Security &amp; OAuth write authorization for {selectedPersona.name}
            </div>
          </div>
        ) : currentResult ? (
          <div
            className={`rounded-2xl border p-5 sm:p-6 shadow-xl transition-all ${
              currentResult.success
                ? 'bg-emerald-950/15 border-emerald-500/40 shadow-emerald-950/10'
                : 'bg-rose-950/20 border-rose-500/40 shadow-rose-950/10'
            }`}
          >
            {/* Status Header Badge */}
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center space-x-2.5">
                {currentResult.success ? (
                  <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        currentResult.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {currentResult.decision?.badge || (currentResult.success ? 'Authorized & Grounded' : 'Access Denied')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                      Persona: {currentResult.persona.name} ({currentResult.persona.role})
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-medium mt-0.5">
                    {currentResult.decision?.headline || currentResult.query}
                  </div>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  currentResult.success
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                }`}
              >
                {currentResult.success ? '200 OK' : currentResult.consentRequired?.code || '403 Forbidden'}
              </span>
            </div>

            {/* Policy Reason & Rule Banner */}
            <div className="my-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
              <div className="text-slate-200 leading-snug">
                <strong className="text-slate-400">Enforcement Reason: </strong>
                {currentResult.decision?.reason}
              </div>
              {currentResult.decision?.authorizedRoles && (
                <div className="text-[11px] text-blue-300 font-mono">
                  <strong className="text-slate-400 font-sans">Authorized Roles: </strong>
                  {currentResult.decision.authorizedRoles.join(', ')}
                </div>
              )}
            </div>

            {/* Grounded LLM Response Body */}
            <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-950/90 p-4 rounded-xl border border-slate-800 font-sans">
              {currentResult.groundedResponse}
            </div>

            {/* Subtle 1-line Link for Policy Enforcement Log */}
            <div className="mt-3 pt-2 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span>Latency: {currentResult.latencyMs}ms</span>
                {currentResult.trimRatio > 0 && (
                  <span className="text-amber-400">Pruned: {currentResult.trimRatio}% by RLS</span>
                )}
              </div>

              {isJaySeal ? (
                <Link
                  href="/admin"
                  className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 font-medium text-[11px] transition-colors"
                >
                  <span>View policy enforcement log in Admin Deck</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <button
                  onClick={() => setShowMicroAudit(!showMicroAudit)}
                  className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 font-medium text-[11px] transition-colors"
                >
                  <span>{showMicroAudit ? 'Hide policy enforcement trace' : 'View policy enforcement trace'}</span>
                  {showMicroAudit ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>

            {/* Expandable Micro-Audit Drawer for Non-Jay-Seal users */}
            {showMicroAudit && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5 animate-in fade-in duration-150">
                <div className="text-slate-400 font-bold mb-1">Gateway Pipeline Trace:</div>
                {currentResult.executionSteps.map((s) => (
                  <div key={s.step} className="flex items-start space-x-2 text-[11px] text-slate-300">
                    <span className="text-blue-400">Stage {s.step}:</span>
                    <span>{s.name}</span>
                    <span className="text-slate-500">({s.durationMs}ms)</span>
                  </div>
                ))}
                {currentResult.trimmedRecords.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-300">
                    Security Intercept: Filtered {currentResult.trimmedRecords.length} candidate rows from prompt context.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* ================================================================== */}
        {/* POPULAR QUERIES SECTION                                            */}
        {/* ================================================================== */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Popular Test Scenarios
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Evaluating as: <strong className="text-slate-300">{selectedPersona.name}</strong>
            </span>
          </div>

          <div className="space-y-2.5">
            {popularQueries.map((item, idx) => {
              const isTagAction = item.tagType === 'action';
              const isTagConf = item.tagType === 'confidential';
              const isTagPublic = item.tagType === 'public';

              let badgeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/30';
              if (isTagAction) badgeColor = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
              else if (isTagConf) badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
              else if (isTagPublic) badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';

              return (
                <button
                  key={item.id}
                  onClick={() => executeQuery(item.query)}
                  disabled={isLoading}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-800/90 bg-slate-900/40 hover:bg-slate-800/50 hover:border-slate-700 transition-all flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-500 mt-0.5">{idx + 1}.</span>
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors leading-snug">
                        {item.query}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">{item.accessRule}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 border ${badgeColor}`}
                  >
                    {item.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
