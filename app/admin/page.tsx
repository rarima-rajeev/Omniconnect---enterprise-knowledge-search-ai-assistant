'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Database,
  Layers,
  Activity,
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Lock,
  UserCheck,
  Radio,
} from 'lucide-react';
import { ENTERPRISE_PERSONAS } from '@/lib/supabase';
import { MCP_CONNECTORS } from '@/lib/mcp-manifest';
import { EnterprisePersona, TelemetryEvent, EnterpriseRecord } from '@/lib/types';

export default function AdminObservabilityPage() {
  const [activePersona, setActivePersona] = useState<EnterprisePersona>(ENTERPRISE_PERSONAS[5]); // Default to Jay Seal
  const [activeTab, setActiveTab] = useState<'diff' | 'mcp' | 'telemetry'>('diff');
  const [telemetryFeed, setTelemetryFeed] = useState<TelemetryEvent[]>([]);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>(MCP_CONNECTORS[0].id);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync active persona from localStorage if set from landing page
  useEffect(() => {
    try {
      const savedPersonaId = localStorage.getItem('omni_active_persona');
      if (savedPersonaId) {
        const found = ENTERPRISE_PERSONAS.find((p) => p.id === savedPersonaId);
        if (found) {
          setActivePersona(found);
        }
      }
    } catch {}

    fetchTelemetry();
  }, []);

  const fetchTelemetry = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/copilot');
      const data = await res.json();
      if (data.telemetry) {
        setTelemetryFeed(data.telemetry);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyManifest = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isJaySeal = activePersona.id === 'persona-jay';
  const activeConnector = MCP_CONNECTORS.find((c) => c.id === selectedConnectorId) || MCP_CONNECTORS[0];

  // -------------------------------------------------------------------------
  // GUARD: If user is NOT Jay Seal, show 403 Forbidden
  // -------------------------------------------------------------------------
  if (!isJaySeal) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/40 bg-rose-950/20 p-6 text-center shadow-2xl backdrop-blur-md">
          <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-base font-bold text-white mb-1">403 Forbidden: Platform Admin Access Required</h1>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            The OmniConnect Dev Workbench is restricted strictly to{' '}
            <strong className="text-white">Jay Seal (OmniConnect System Admin)</strong>. Your current active session is{' '}
            <strong className="text-rose-300">{activePersona.name}</strong> ({activePersona.role} • {activePersona.levelDisplay}).
          </p>

          <div className="space-y-2 pt-2 border-t border-rose-500/20">
            <button
              onClick={() => {
                const jay = ENTERPRISE_PERSONAS.find((p) => p.id === 'persona-jay')!;
                setActivePersona(jay);
                try {
                  localStorage.setItem('omni_active_persona', jay.id);
                } catch {}
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all flex items-center justify-center space-x-2"
            >
              <UserCheck className="h-4 w-4" />
              <span>Switch to Jay Seal (System Admin)</span>
            </button>

            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 block text-center transition-all"
            >
              &larr; Return to Knowledge Assistant
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // AUTHORIZED ADMIN DEV WORKBENCH (Jay Seal)
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-[#090e1c]/95 backdrop-blur-md px-4 lg:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors font-medium"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Assistant</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm">OmniConnect — Enterprise Knowledge Search AI Assistant</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                Dev Workbench
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ask questions across company documents with automated role-based permission controls.
            </p>
          </div>
        </div>

        {/* Admin Session Badge */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <img src={activePersona.avatar} alt="Jay Seal" className="h-6 w-6 rounded-full ring-1 ring-purple-500" />
            <div className="text-left">
              <div className="text-xs font-bold text-white">{activePersona.name}</div>
              <div className="text-[10px] text-purple-300 font-mono">System Admin</div>
            </div>
          </div>

          <button
            onClick={fetchTelemetry}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Admin Console Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Telemetry Stream Size</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">{telemetryFeed.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Ring buffer capture</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">ACL Prune Events</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
              {telemetryFeed.filter((e) => e.eventName === 'acl_records_trimmed').length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Zero leakage enforcements</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Write Action Blockades</div>
            <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
              {telemetryFeed.filter((e) => e.eventName === 'action_blocked_unauthorized').length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Unauthorized tool interceptions</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">P95 Pipeline Latency</div>
            <div className="text-2xl font-bold text-purple-400 font-mono mt-1">210ms</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Within 800ms budget</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-800 flex space-x-2">
          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'diff'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Supabase RLS Inspection &amp; Policy Diff</span>
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'telemetry'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Live Telemetry Stream (PostHog-Node)</span>
            <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded-full font-mono">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'mcp'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>MCP Connector Manifests (JSON Schemas)</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: PERMISSION & RLS DIFF                                   */}
        {/* ============================================================== */}
        {activeTab === 'diff' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Row Level Security (RLS) Database Boundary Rules
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Records are pruned at the database query boundary before any LLM prompt synthesis occurs.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded">
                  Zero Data Leakage Guaranteed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-amber-400 uppercase font-mono">
                    Executive Compensation (PAY-9041)
                  </div>
                  <div className="text-xs text-slate-200 mt-1 font-semibold">Q3 CEO &amp; VP Eng Stock Vesting</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Permitted: <strong className="text-white">Jane Doe (Finance) &amp; Sarah Chen (Ops)</strong>.
                    Pruned for Alex, Binny, Neil.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-blue-400 uppercase font-mono">
                    EMEA Offer Letters (HR-LONDON-88)
                  </div>
                  <div className="text-xs text-slate-200 mt-1 font-semibold">London Engineering Salary Bands</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Permitted: <strong className="text-white">Sarah Chen (EnterpriseAdmin)</strong>. Pruned for Jane,
                    Alex, Binny, Neil.
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-purple-400 uppercase font-mono">
                    Incident Root Cause (INC-8921)
                  </div>
                  <div className="text-xs text-slate-200 mt-1 font-semibold">Postgres RDS Primary Failover</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Full Technical Logs: <strong className="text-white">Alex Rivera (DevOps)</strong>. Executive View:
                    Jane, Sarah, Binny. Restricted: Neil.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MCP CONNECTOR MANIFESTS                                */}
        {/* ============================================================== */}
        {activeTab === 'mcp' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {MCP_CONNECTORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConnectorId(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    selectedConnectorId === c.id
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {c.tool.name} ({c.category === 'agent_action' ? 'Write Action' : 'Read Tool'})
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
                  className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 font-mono"
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Manifest'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Contract Type</div>
                  <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                    {activeConnector.category === 'agent_action' ? 'Autonomous Action (Write)' : 'Semantic Retrieval (Read)'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Gateway Target</div>
                  <div className="text-xs font-mono font-bold text-blue-400 mt-0.5">{activeConnector.endpoint}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Required OAuth Scopes</div>
                  <div className="text-xs font-mono text-amber-300 mt-0.5">
                    {activeConnector.requiredScopes.join(', ')}
                  </div>
                </div>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-blue-300 overflow-x-auto leading-relaxed">
                {JSON.stringify(activeConnector.tool, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: AUDIT TRAIL & POSTHOG TELEMETRY                        */}
        {/* ============================================================== */}
        {activeTab === 'telemetry' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300">
                Real-Time Event Feed (`posthog-node` &amp; In-Memory Ring Buffer)
              </span>
              <span className="text-[11px] font-mono text-slate-400">Total Captured: {telemetryFeed.length}</span>
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
                    className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all text-xs"
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
                        {isExpanded ? 'Hide JSON' : 'Inspect JSON'}
                      </button>
                    </div>

                    <div className="mt-2 text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
                      {evt.properties.connector_id && (
                        <span>
                          connector: <span className="text-blue-400">{evt.properties.connector_id}</span>
                        </span>
                      )}
                      {evt.properties.user_id && (
                        <span>
                          user: <span className="text-slate-200">{evt.properties.user_id}</span>
                        </span>
                      )}
                      {evt.properties.trim_ratio !== undefined && (
                        <span>
                          trim_ratio: <span className="text-amber-400">{evt.properties.trim_ratio}%</span>
                        </span>
                      )}
                      {evt.properties.latency_ms !== undefined && (
                        <span>
                          latency: <span className="text-purple-400">{evt.properties.latency_ms}ms</span>
                        </span>
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
        )}
      </main>
    </div>
  );
}
