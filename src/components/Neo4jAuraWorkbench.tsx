import React, { useState, useEffect } from "react";
import {
  Database,
  Play,
  RefreshCw,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Bell,
  Trash2,
  Check,
  Eye,
  AlertTriangle,
  Flame,
} from "lucide-react";

interface Neo4jStatus {
  connected: boolean;
  uri?: string;
  user?: string;
  instanceId?: string;
  agent?: string;
  address?: string;
  nodeCount?: number;
  relCount?: number;
  labels?: string[];
  relTypes?: string[];
  error?: string;
}

interface QueryResult {
  success: boolean;
  cypher: string;
  columns: string[];
  records: Record<string, any>[];
  executionTimeMs: number;
  error?: string;
  graph?: {
    nodes: any[];
    edges: any[];
  };
}

interface Neo4jAuraWorkbenchProps {
  initialCypher?: string;
  onHighlightNodes?: (nodeIds: string[]) => void;
  onAlarmStateChange?: (alarms: any[]) => void;
  onSwitchTab?: (tab: "visualizer" | "forcegraph" | "neo4j_live" | "adjacency") => void;
}

const PRESET_QUERIES = [
  {
    name: "Equipment by Type / Subsystem",
    icon: "📊",
    cypher: `MATCH (e:Equipment)
RETURN labels(e)[1] AS Subsystem, count(*) AS Units
ORDER BY Units DESC`,
  },
  {
    name: "Chillers & Downstream Cooling",
    icon: "❄️",
    cypher: `MATCH (c:Chiller)-[r:SUPPLIES|FEEDS]->(target)
RETURN c.name AS Chiller, type(r) AS Link, target.name AS DownstreamUnit, labels(target)[1] AS TargetType
ORDER BY Chiller, DownstreamUnit`,
  },
  {
    name: "UPW Tanks to Process Tools Path",
    icon: "💧",
    cypher: `MATCH path = (t:Tank {id: 'UPW-TK-01'})-[:SUPPLIES|FEEDS*..6]->(tool:ProcessTool)
RETURN tool.name AS ProcessTool, length(path) AS SupplyHops
LIMIT 10`,
  },
  {
    name: "MCCs & Powered Mechanical Pumps",
    icon: "⚡",
    cypher: `MATCH (mcc:MCC)-[r:POWERS]->(p:Pump)
RETURN mcc.name AS ElectricalPanel, p.name AS PumpEquipment
ORDER BY ElectricalPanel`,
  },
  {
    name: "Process Tools Requiring UPW & Cooling",
    icon: "🔬",
    cypher: `MATCH (tool:ProcessTool)
OPTIONAL MATCH (upw:Header {id: 'UPW-HDR-01'})-[:DISTRIBUTES_TO*..3]->(tool)
OPTIONAL MATCH (chw:Header {id: 'CHW-HDR-01'})-[:DISTRIBUTES_TO*..3]->(tool)
RETURN tool.id AS ToolID, tool.name AS Name, 
       CASE WHEN upw IS NOT NULL THEN 'YES' ELSE 'NO' END AS UsesUPW,
       CASE WHEN chw IS NOT NULL THEN 'YES' ELSE 'NO' END AS UsesCHW`,
  },
  {
    name: "All Graph Nodes (Limit 30)",
    icon: "🌐",
    cypher: `MATCH (n:Equipment)
RETURN n.id AS ID, n.name AS Name, labels(n)[1] AS Category
LIMIT 30`,
  },
];

export const Neo4jAuraWorkbench: React.FC<Neo4jAuraWorkbenchProps> = ({
  initialCypher,
  onHighlightNodes,
  onAlarmStateChange,
  onSwitchTab,
}) => {
  const [status, setStatus] = useState<Neo4jStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [cypherQuery, setCypherQuery] = useState(
    initialCypher || PRESET_QUERIES[0].cypher
  );
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // 3 Alarm Actions State
  const [isCreatingAlarms, setIsCreatingAlarms] = useState(false);
  const [isCheckingAlarms, setIsCheckingAlarms] = useState(false);
  const [isClearingAlarms, setIsClearingAlarms] = useState(false);
  const [isPlantingCase, setIsPlantingCase] = useState<number | null>(null);
  const [alarmFeedback, setAlarmFeedback] = useState<{
    type: "success" | "info" | "error" | "warning";
    message: string;
    alarms?: any[];
  } | null>(null);

  useEffect(() => {
    fetchStatus();
    // Silently check alarms upon mounting to know current status
    checkAlarmsSilently();
  }, []);

  const checkAlarmsSilently = async () => {
    try {
      const res = await fetch("/api/neo4j/alarms/check");
      const data = await res.json();
      if (data.success && data.exists && onAlarmStateChange) {
        onAlarmStateChange(data.alarms || []);
      }
    } catch (e) {
      // ignore silent check error
    }
  };

  useEffect(() => {
    if (initialCypher) {
      setCypherQuery(initialCypher);
      handleExecuteQuery(initialCypher);
    }
  }, [initialCypher]);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch("/api/neo4j/status");
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setStatus({
        connected: false,
        error: err?.message || "Failed to reach backend",
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleExecuteQuery = async (queryToRun?: string) => {
    const q = queryToRun || cypherQuery;
    if (!q.trim()) return;

    setIsExecuting(true);
    try {
      const res = await fetch("/api/neo4j/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cypher: q }),
      });
      const data = await res.json();
      setQueryResult(data);

      // If results contain node IDs or graph nodes, offer highlighting
      if (data.success && onHighlightNodes) {
        const foundIds: string[] = [];
        if (data.graph?.nodes?.length) {
          data.graph.nodes.forEach((n: any) => foundIds.push(n.id));
        }
        if (data.records?.length) {
          data.records.forEach((row: any) => {
            Object.values(row).forEach((val) => {
              if (typeof val === "string" && (val.startsWith("UPW-") || val.startsWith("CHW-") || val.startsWith("TOOL-") || val.startsWith("MCC-") || val.startsWith("TX-") || val.startsWith("PLC-") || val.startsWith("A-"))) {
                foundIds.push(val);
              }
            });
          });
        }
        if (foundIds.length > 0) {
          onHighlightNodes(Array.from(new Set(foundIds)));
        }
      }
    } catch (err: any) {
      setQueryResult({
        success: false,
        cypher: q,
        columns: [],
        records: [],
        executionTimeMs: 0,
        error: err?.message || "Query network failure",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm("This will synchronize all 80 semiconductor digital twin equipment nodes and 144 relationships into your Enterprise Cloud Graph database. Proceed?")) {
      return;
    }
    setIsSeeding(true);
    setSeedMessage(null);
    try {
      const res = await fetch("/api/neo4j/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedMessage(`Successfully synced ${data.nodesSeeded} nodes and ${data.relationshipsSeeded} relationships to Enterprise Property Graph!`);
        await fetchStatus();
      } else {
        setSeedMessage(`Sync failed: ${data.error}`);
      }
    } catch (err: any) {
      setSeedMessage(`Error: ${err?.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Button 1: Create Alarm Nodes
  const handleCreateAlarms = async () => {
    setIsCreatingAlarms(true);
    setAlarmFeedback(null);
    try {
      const res = await fetch("/api/neo4j/alarms/create", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAlarmFeedback({
          type: "success",
          message: `Created/Verified ${data.count} Alarm nodes in Property Graph! Each alarm has 4 attributes (id, code, severity, timestamp) attached to target assets.`,
          alarms: data.alarms,
        });

        // Notify parent to add these alarms into Graph View (ForceGraph)
        if (onAlarmStateChange) {
          onAlarmStateChange(data.alarms || []);
        }

        // Refresh database node count in status
        await fetchStatus();
      } else {
        setAlarmFeedback({
          type: "error",
          message: `Failed to create alarm nodes: ${data.error}`,
        });
      }
    } catch (err: any) {
      setAlarmFeedback({
        type: "error",
        message: `Error connecting to server: ${err?.message}`,
      });
    } finally {
      setIsCreatingAlarms(false);
    }
  };

  // Button 2: Check Alarm Nodes
  const handleCheckAlarms = async () => {
    setIsCheckingAlarms(true);
    setAlarmFeedback(null);
    try {
      const res = await fetch("/api/neo4j/alarms/check");
      const data = await res.json();
      if (data.success) {
        if (!data.exists || data.count === 0) {
          // Exact required prompt: "alarm nodes no have"
          setAlarmFeedback({
            type: "warning",
            message: "alarm nodes no have",
            alarms: [],
          });
          if (onAlarmStateChange) {
            onAlarmStateChange([]);
          }
        } else {
          setAlarmFeedback({
            type: "info",
            message: `Found ${data.count} active Alarm nodes in Property Graph (IDs: ${data.alarms.map((a: any) => a.id).join(", ")})`,
            alarms: data.alarms,
          });
          if (onAlarmStateChange) {
            onAlarmStateChange(data.alarms || []);
          }
        }
      } else {
        setAlarmFeedback({
          type: "error",
          message: `Check failed: ${data.error}`,
        });
      }
    } catch (err: any) {
      setAlarmFeedback({
        type: "error",
        message: `Error checking alarm nodes: ${err?.message}`,
      });
    } finally {
      setIsCheckingAlarms(false);
    }
  };

  // Button 3: Clear Alarm Nodes
  const handleClearAlarms = async () => {
    setIsClearingAlarms(true);
    setAlarmFeedback(null);
    try {
      const res = await fetch("/api/neo4j/alarms/clear", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        if (data.deletedCount === 0) {
          setAlarmFeedback({
            type: "info",
            message: "No alarm nodes existed in Property Graph to delete (alarm nodes no have).",
            alarms: [],
          });
        } else {
          setAlarmFeedback({
            type: "success",
            message: `Cleared ${data.deletedCount} Alarm nodes from Property Graph. Removed from Graph View.`,
            alarms: [],
          });
        }

        // Notify parent so alarm nodes disappear from Graph View
        if (onAlarmStateChange) {
          onAlarmStateChange([]);
        }

        // Refresh database node count in status
        await fetchStatus();
      } else {
        setAlarmFeedback({
          type: "error",
          message: `Failed to clear alarm nodes: ${data.error}`,
        });
      }
    } catch (err: any) {
      setAlarmFeedback({
        type: "error",
        message: `Error clearing alarms: ${err?.message}`,
      });
    } finally {
      setIsClearingAlarms(false);
    }
  };

  // Handler for Agent Hive Event Simulator Scenarios
  const handlePlantCaseAlarms = async (caseId: 1 | 2 | 3) => {
    setIsPlantingCase(caseId);
    setAlarmFeedback(null);
    try {
      const res = await fetch(`/api/neo4j/alarms/case/${caseId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAlarmFeedback({
          type: "success",
          message: `Planted ${data.count} Alarm node(s) for ${data.caseName} in Property Graph! Connected via TRIGGERED_ON to [${data.alarms.map((a: any) => a.assetId).join(", ")}] with strict ISA-18.2 attributes.`,
          alarms: data.alarms,
        });

        // Re-check all active alarms so ForceGraph and counters get the full current state
        await checkAlarmsSilently();
        await fetchStatus();
      } else {
        setAlarmFeedback({
          type: "error",
          message: `Failed to plant Case ${caseId} alarms: ${data.error}`,
        });
      }
    } catch (err: any) {
      setAlarmFeedback({
        type: "error",
        message: `Error planting Case ${caseId} alarms: ${err?.message}`,
      });
    } finally {
      setIsPlantingCase(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto p-4 space-y-4">
      {/* 1. Cloud Instance Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Enterprise Property Graph (Live Cloud Instance)</h3>
                {status?.connected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {isLoadingStatus ? "Connecting..." : "Offline"}
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                {status?.uri ? "cloud-graph://enterprise-instance-30544b94" : "cloud-graph://enterprise-instance-30544b94"} • Instance ID: <span className="font-semibold text-slate-700">{status?.instanceId || "30544b94"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={fetchStatus}
              disabled={isLoadingStatus}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors"
              title="Refresh Connection Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? "animate-spin" : ""}`} />
              Ping
            </button>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              title="Upload digital twin nodes to Property Graph"
            >
              <Zap className={`w-3.5 h-3.5 ${isSeeding ? "animate-bounce" : ""}`} />
              {isSeeding ? "Syncing..." : "Sync Digital Twin"}
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Total Nodes</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {status?.nodeCount !== undefined ? status.nodeCount : "..."}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Equipments & Zones</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Relationships</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {status?.relCount !== undefined ? status.relCount : "..."}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Topological edges</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Node Labels</span>
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              {status?.labels ? status.labels.length : "..."}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Tank, Pump, Chiller...</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Engine Version</span>
            <span className="text-xs font-bold text-slate-800 font-mono truncate block mt-1">
              Property Graph Engine v5.27
            </span>
            <span className="text-[10px] text-slate-500 block">Enterprise Cloud Store</span>
          </div>
        </div>

        {seedMessage && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{seedMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Alarm Nodes Control Panel (3 Buttons requested by user) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-red-600" />
                Live Alarm Nodes Management (Property Graph)
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Create, check, and clear dynamic alarm nodes (<span className="font-mono text-slate-700">id, code, severity, timestamp</span>) attached to 8 critical semiconductor assets.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* Button 1: Create Alarm Nodes */}
            <button
              onClick={handleCreateAlarms}
              disabled={isCreatingAlarms || isCheckingAlarms || isClearingAlarms || isPlantingCase !== null}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Create/update 8 Alarm nodes attached to MCC-01, CHW pumps, headers, AHUs, and process tools"
            >
              <Bell className={`w-3.5 h-3.5 ${isCreatingAlarms ? "animate-bounce" : ""}`} />
              {isCreatingAlarms ? "Creating..." : "Create Alarm Nodes"}
            </button>

            {/* Button 2: Check Alarm Nodes */}
            <button
              onClick={handleCheckAlarms}
              disabled={isCreatingAlarms || isCheckingAlarms || isClearingAlarms || isPlantingCase !== null}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 rounded-lg border border-slate-200/90 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Verify if Alarm nodes exist in Property Graph"
            >
              <Check className={`w-3.5 h-3.5 ${isCheckingAlarms ? "animate-spin" : "text-emerald-600"}`} />
              {isCheckingAlarms ? "Checking..." : "Check Alarm Nodes"}
            </button>

            {/* Button 3: Clear Alarm Nodes */}
            <button
              onClick={handleClearAlarms}
              disabled={isCreatingAlarms || isCheckingAlarms || isClearingAlarms || isPlantingCase !== null}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200/80 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Delete all Alarm nodes from Property Graph"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isClearingAlarms ? "animate-pulse" : ""}`} />
              {isClearingAlarms ? "Clearing..." : "Clear Alarm Nodes"}
            </button>

            {/* Subtle Divider */}
            <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            {/* Case 1 */}
            <button
              onClick={() => handlePlantCaseAlarms(1)}
              disabled={isCreatingAlarms || isCheckingAlarms || isClearingAlarms || isPlantingCase !== null}
              className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 active:bg-sky-200 disabled:opacity-50 rounded-lg border border-sky-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Case 1: Plants alarm on UPW-RO-01 (Sensor Drift / O-Ring Leak)"
            >
              <Zap className={`w-3.5 h-3.5 ${isPlantingCase === 1 ? "animate-spin" : "text-sky-600"}`} />
              {isPlantingCase === 1 ? "Planting..." : "Case 1: RO-01 Drift"}
            </button>

            {/* Case 2 */}
            <button
              onClick={() => handlePlantCaseAlarms(2)}
              disabled={isCreatingAlarms || isCheckingAlarms || isClearingAlarms || isPlantingCase !== null}
              className="px-3 py-1.5 text-xs font-semibold text-violet-800 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 disabled:opacity-50 rounded-lg border border-violet-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Case 2: Plants alarms on T-1012, S-111, UPW-RO-01, UPW-RO-02 (Cation Breakthrough)"
            >
              <Flame className={`w-3.5 h-3.5 ${isPlantingCase === 2 ? "animate-bounce" : "text-violet-600"}`} />
              {isPlantingCase === 2 ? "Planting..." : "Case 2: T-1012 Breakthrough"}
            </button>

            {/* Case 3 */}
            <button
              onClick={() => handlePlantCaseAlarms(3)}
              disabled={isCreatingAlarms || isCheckingAlarms || isClearingAlarms || isPlantingCase !== null}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 disabled:opacity-50 rounded-lg border border-amber-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Case 3: Plants alarms on MMF, T-1011, T-1012, UPW-RO-01, UPW-RO-02 (Intake MMF Rupture)"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${isPlantingCase === 3 ? "animate-pulse" : "text-amber-600"}`} />
              {isPlantingCase === 3 ? "Planting..." : "Case 3: MMF Rupture"}
            </button>
          </div>
        </div>

        {/* Feedback Message Bar */}
        {alarmFeedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start justify-between gap-2 border transition-all ${
              alarmFeedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : alarmFeedback.type === "warning"
                ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                : alarmFeedback.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <div className="flex items-start gap-2">
              {alarmFeedback.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {alarmFeedback.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              {alarmFeedback.type === "info" && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              {alarmFeedback.type === "error" && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              <div>
                <span className="font-mono text-[12px]">{alarmFeedback.message}</span>
                {alarmFeedback.alarms && alarmFeedback.alarms.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60">
                    {alarmFeedback.alarms.map((a: any) => (
                      <div key={a.id} className="bg-white/80 border border-slate-200/80 rounded p-1.5 text-[11px] font-mono shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-700">{a.id}</span>
                          <span className={`px-1 rounded text-[9px] font-bold ${a.severity === "P1" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}`}>
                            {a.severity}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-800 font-medium truncate mt-0.5" title={a.code}>{a.code}</div>
                        <div className="text-[9px] text-slate-500 truncate">Asset: {a.assetId}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setAlarmFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 3. Cypher Query Workbench */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              Real Cypher Query Console
            </h4>
            <p className="text-[11px] text-slate-500">
              Direct execution against your remote Enterprise Graph database
            </p>
          </div>

          {/* Preset Queries Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600">Sample Cypher:</span>
            <select
              className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-700 focus:outline-none focus:border-emerald-500"
              onChange={(e) => {
                const q = PRESET_QUERIES.find((p) => p.name === e.target.value);
                if (q) {
                  setCypherQuery(q.cypher);
                  handleExecuteQuery(q.cypher);
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>
                -- Choose Preset Query --
              </option>
              {PRESET_QUERIES.map((p, idx) => (
                <option key={idx} value={p.name}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Query Input Area */}
        <div className="relative">
          <textarea
            value={cypherQuery}
            onChange={(e) => setCypherQuery(e.target.value)}
            rows={4}
            className="w-full font-mono text-xs p-3 bg-slate-900 text-emerald-300 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            placeholder="MATCH (n:Equipment) RETURN n LIMIT 25"
          />
          <button
            onClick={() => handleExecuteQuery()}
            disabled={isExecuting || !cypherQuery.trim()}
            className="absolute bottom-3 right-3 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-md shadow-md flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isExecuting ? "Executing..." : "Execute Graph Query"}
          </button>
        </div>

        {/* Execution Status Bar */}
        {queryResult && (
          <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              {queryResult.success ? (
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Query Succeeded
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  Execution Failed
                </span>
              )}
              <span className="text-slate-500 font-mono">
                {queryResult.records.length} record{queryResult.records.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{queryResult.executionTimeMs} ms</span>
            </div>
          </div>
        )}

        {/* Query Error Display */}
        {queryResult?.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-mono whitespace-pre-wrap">
            {queryResult.error}
          </div>
        )}

        {/* Tabular Output */}
        {queryResult?.success && queryResult.records.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                <tr>
                  {queryResult.columns.map((col, idx) => (
                    <th key={idx} className="p-2.5 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {queryResult.records.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    {queryResult.columns.map((col, cIdx) => (
                      <td key={cIdx} className="p-2.5 text-slate-800 whitespace-nowrap">
                        {typeof row[col] === "object"
                          ? JSON.stringify(row[col])
                          : String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {queryResult?.success && queryResult.records.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
            Query executed successfully. (0 records matched).
          </div>
        )}
      </div>
    </div>
  );
};
