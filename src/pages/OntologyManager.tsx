import React, { useState, useEffect, useMemo } from "react";
import {
  Network,
  Database,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Tag,
  Eye,
  Info,
  X,
  Code,
  ShieldAlert,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";

interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

interface EquipmentClass {
  className: string;
  count: number;
  assets: string[];
}

interface PredicateInfo {
  predicate: string;
  count: number;
  isLpgEdgeType: boolean;
}

interface MappedNode {
  id: string;
  label: string;
  type: string;
  domain: string;
  hasRdfType: boolean;
}

interface OverviewData {
  triples: Triple[];
  lpgNodes: any[];
  lpgEdges: any[];
  stats: {
    totalTriples: number;
    totalLpgNodes: number;
    totalLpgEdges: number;
    distinctSubjectsCount: number;
    distinctObjectsCount: number;
    distinctClassesCount: number;
    distinctPredicatesCount: number;
    mappedLpgNodesCount: number;
    unmappedLpgNodesCount: number;
    alignmentPercentage: number;
    oxigraphLoaded: boolean;
    oxigraphLoadedCount: number;
  };
  classes: EquipmentClass[];
  predicates: PredicateInfo[];
  domains: Record<string, number>;
  mappedNodes: MappedNode[];
  unmappedNodes: MappedNode[];
}

// Quick predicate filter bundles, mirroring the RDF Semantic Engine page.
const PREDICATE_PRESETS = [
  { label: "Drift & Excursions", preds: ["susceptibleTo", "inducesDrift", "regeneratedBy", "affectsAsset"] },
  { label: "Flows", preds: ["SUPPLIES", "FEEDS", "DISTRIBUTES_TO", "RETURNS_TO"] },
  { label: "Power & Control", preds: ["POWERS", "CONTROLS", "BACKUP_FOR", "hasBackupAsset", "isAvailableAsFailover"] },
  { label: "Cooling", preds: ["COOLS"] },
  { label: "Incidents", preds: ["hasHistoricalCase", "hasSymptom", "hasDistinguishingFeature", "hasRootCause", "hasMitigation"] },
  { label: "Physics & Sensors", preds: ["monitoredAsset", "sensedCondition", "nominalRating", "carriesMedium", "failureDelay"] },
  { label: "Classes", preds: ["rdf:type"] },
];

type SortColumn = "subject" | "predicate" | "object";
type SortDirection = "asc" | "desc";

export const OntologyManager: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"triples" | "taxonomy" | "predicates" | "inspector" | "cases">("triples");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Triples Registry: search, multi-select predicate filter, sort, pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPredicates, setSelectedPredicates] = useState<string[]>([]);
  const [isPredicateDropdownOpen, setIsPredicateDropdownOpen] = useState<boolean>(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("subject");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Class Taxonomy / Predicate Dictionary: local search
  const [taxonomySearch, setTaxonomySearch] = useState<string>("");
  const [predicateSearch, setPredicateSearch] = useState<string>("");

  // Inspector State
  const [inspectedAssetId, setInspectedAssetId] = useState<string>("UPW-RO-01");

  // Load Overview Data
  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ontology/overview");
      if (!res.ok) throw new Error("Failed to load ontology overview.");
      const json = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Unknown server error");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load ontology");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  // Refresh the read-only view: re-pull the live Oxigraph store & overview stats
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/rdf/reload", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        showToast(`Refreshed view (${json.count} triples loaded).`, "success");
      }
      await loadOverview();
    } catch (err: any) {
      showToast("Failed to refresh: " + err.message, "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.triples, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fabcore-ontology-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded ontology JSON file.", "info");
  };

  // Export Turtle (.ttl)
  const handleExportTurtle = () => {
    if (!data) return;
    const lines = [
      "@prefix : <http://fabcore.semiconductor.org/schema#> .",
      "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .",
      "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
      "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
      "",
    ];
    data.triples.forEach((t) => {
      const s = t.subject.startsWith("http") ? `<${t.subject}>` : `:${t.subject}`;
      const p = t.predicate === "rdf:type" ? "a" : t.predicate.startsWith("http") ? `<${t.predicate}>` : `:${t.predicate}`;
      const o = t.object.startsWith("http")
        ? `<${t.object}>`
        : t.object.includes(" ") || t.object.includes(",") || t.object.includes(">")
        ? `"${t.object.replace(/"/g, '\\"')}"`
        : `:${t.object}`;
      lines.push(`${s} ${p} ${o} .`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/turtle" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fabcore-ontology-${new Date().toISOString().slice(0, 10)}.ttl`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Downloaded ontology Turtle (.ttl) file.", "info");
  };

  // Predicate counts across the full triple set (for the multi-select filter menu)
  const predicateCounts = useMemo(() => {
    if (!data) return [] as [string, number][];
    const map = new Map<string, number>();
    data.triples.forEach((t) => {
      map.set(t.predicate, (map.get(t.predicate) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const togglePredicate = (pred: string) => {
    setSelectedPredicates((prev) =>
      prev.includes(pred) ? prev.filter((p) => p !== pred) : [...prev, pred]
    );
    setCurrentPage(1);
  };

  const clearPredicates = () => {
    setSelectedPredicates([]);
    setCurrentPage(1);
  };

  const selectAllPredicates = () => {
    setSelectedPredicates(predicateCounts.map(([p]) => p));
    setCurrentPage(1);
  };

  const selectPreset = (preds: string[]) => {
    setSelectedPredicates(preds);
    setCurrentPage(1);
  };

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filtered + Sorted Triples
  const filteredTriples = useMemo(() => {
    if (!data) return [];
    const matching = data.triples.filter((t) => {
      if (selectedPredicates.length > 0 && !selectedPredicates.includes(t.predicate)) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.predicate.toLowerCase().includes(q) ||
        t.object.toLowerCase().includes(q)
      );
    });

    const sorted = [...matching].sort((a, b) => {
      const cmp = a[sortColumn].localeCompare(b[sortColumn]);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [data, searchQuery, selectedPredicates, sortColumn, sortDirection]);

  // Paginated Triples
  const paginatedTriples = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTriples.slice(start, start + pageSize);
  }, [filteredTriples, currentPage]);

  const totalPages = Math.ceil(filteredTriples.length / pageSize) || 1;

  // Filtered Classes (Taxonomy tab search)
  const filteredClasses = useMemo(() => {
    if (!data) return [];
    const q = taxonomySearch.toLowerCase().trim();
    if (!q) return data.classes;
    return data.classes.filter(
      (cls) =>
        cls.className.toLowerCase().includes(q) ||
        cls.assets.some((a) => a.toLowerCase().includes(q))
    );
  }, [data, taxonomySearch]);

  // Filtered Predicates (Predicate Dictionary tab search)
  const filteredPredicates = useMemo(() => {
    if (!data) return [];
    const q = predicateSearch.toLowerCase().trim();
    if (!q) return data.predicates;
    return data.predicates.filter((p) => p.predicate.toLowerCase().includes(q));
  }, [data, predicateSearch]);

  // Selected Inspected Asset Data
  const inspectedNode = useMemo(() => {
    if (!data) return null;
    return data.lpgNodes.find((n) => n.id === inspectedAssetId);
  }, [data, inspectedAssetId]);

  const inspectedTriples = useMemo(() => {
    if (!data) return [];
    return data.triples.filter(
      (t) => t.subject === inspectedAssetId || t.object === inspectedAssetId
    );
  }, [data, inspectedAssetId]);

  // Historical Cases
  const historicalCases = useMemo(() => {
    if (!data) return [];
    const caseMap: Record<string, Record<string, string[]>> = {};
    data.triples.forEach((t) => {
      if (t.subject.startsWith("Case_") || t.object === "HistoricalCase") {
        const id = t.subject;
        if (!caseMap[id]) caseMap[id] = {};
        if (!caseMap[id][t.predicate]) caseMap[id][t.predicate] = [];
        caseMap[id][t.predicate].push(t.object);
      }
    });
    return Object.entries(caseMap).map(([caseId, props]) => ({
      caseId,
      props,
    }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold tracking-wide text-slate-600">
          Loading Dual-Model Common Ontology...
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-sm text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">Failed to Load Ontology</h2>
        <p className="text-sm text-slate-600 mb-4">{error}</p>
        <button
          onClick={loadOverview}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 text-indigo-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {actionMessage && (
        <div className="fixed top-18 right-6 z-50 animate-bounce-short">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold border ${
              actionMessage.type === "success"
                ? "bg-slate-900 border-emerald-500/50 text-white"
                : actionMessage.type === "error"
                ? "bg-rose-950 border-rose-500 text-rose-100"
                : "bg-slate-900 border-indigo-500 text-white"
            }`}
          >
            {actionMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {actionMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {actionMessage.type === "info" && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                <Network className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Common Ontology Manager</h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                LPG ⇄ W3C RDF
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/60">
                Read-Only
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Unified semantic dictionary and knowledge graph repository. Bridges physical topology relationships in Labeled Property Graphs (Neo4j) with atomic descriptive facts in W3C RDF (Oxigraph) for automated alarm rationalization and agentic reasoning.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Re-fetch the live Oxigraph store & overview stats"
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />
            <button
              onClick={handleExportJson}
              title="Download as JSON"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Engine Status Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Oxigraph Store:</span>
            <span className="text-emerald-400 font-mono">
              {data?.stats.oxigraphLoaded ? `ACTIVE (${data?.stats.oxigraphLoadedCount} triples loaded)` : "STANDBY"}
            </span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-medium">LPG Alignment:</span>
            <span className="text-cyan-300 font-semibold">
              {data?.stats.alignmentPercentage}% ({data?.stats.mappedLpgNodesCount}/{data?.stats.totalLpgNodes} assets mapped)
            </span>
          </div>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-slate-300 font-medium">Dual Format:</span>
            <span className="text-amber-300">W3C RDF 1.1 / Neo4j LPG Graph</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RDF Triples</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{data?.stats.totalTriples ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Atomic facts in store</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LPG Assets</span>
            <Boxes className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{data?.stats.totalLpgNodes ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>{data?.stats.totalLpgEdges ?? 0} physical edges</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipment Classes</span>
            <Tag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{data?.stats.distinctClassesCount ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Ontology type taxonomy</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Predicates</span>
            <Share2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{data?.stats.distinctPredicatesCount ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Relations & Properties</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Alignment Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{data?.stats.alignmentPercentage ?? 0}%</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-700 font-medium">{data?.stats.unmappedLpgNodesCount ?? 0} unmapped assets</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("triples")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "triples"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Triples Registry</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "triples" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"}`}>
            {data?.stats.totalTriples}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("taxonomy")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "taxonomy"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Class Taxonomy</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "taxonomy" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"}`}>
            {data?.classes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("predicates")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "predicates"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Predicate Dictionary</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "predicates" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"}`}>
            {data?.predicates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("inspector")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "inspector"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Dual-Model Asset Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab("cases")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "cases"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Historical Case Knowledge</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "cases" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"}`}>
            {historicalCases.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRIPLES REGISTRY */}
      {/* ========================================================================= */}
      {activeTab === "triples" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, predicate, or object..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Predicate Multi-Selector Popover Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPredicateDropdownOpen(!isPredicateDropdownOpen)}
                  className={`flex items-center gap-1.5 border text-xs rounded-lg px-2.5 py-1.5 font-medium shadow-2xs transition-colors cursor-pointer ${
                    selectedPredicates.length > 0
                      ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-semibold ring-1 ring-indigo-300"
                      : "bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                  title="Select one or more predicates to filter"
                >
                  <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate max-w-[130px]">
                    {selectedPredicates.length === 0
                      ? "All Predicates"
                      : selectedPredicates.length === 1
                      ? selectedPredicates[0]
                      : `${selectedPredicates.length} Selected`}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isPredicateDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isPredicateDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsPredicateDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-2.5 text-xs flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                          Filter Predicates ({selectedPredicates.length > 0 ? `${selectedPredicates.length} active` : "All"})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllPredicates}
                            className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                          >
                            Select All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={clearPredicates}
                            className="text-[10px] text-rose-500 hover:underline font-semibold cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Quick Bundles:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {PREDICATE_PRESETS.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => selectPreset(preset.preds)}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-[10px] text-slate-700 transition-colors font-medium border border-slate-200/60 cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        {predicateCounts.map(([pred, count]) => {
                          const isChecked = selectedPredicates.includes(pred);
                          return (
                            <button
                              key={pred}
                              type="button"
                              onClick={() => togglePredicate(pred)}
                              className={`flex items-center justify-between px-2 py-1 rounded transition-colors text-left w-full cursor-pointer ${
                                isChecked
                                  ? "bg-indigo-50 text-indigo-950 font-semibold"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {isChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                )}
                                <span className="font-mono text-[11px] truncate">{pred}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1.5">
                                ({count})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleExportTurtle}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
              >
                <Code className="w-3 h-3 text-slate-500" />
                <span>Export .ttl</span>
              </button>
            </div>
          </div>

          {/* Active Predicate Filter Pills */}
          {selectedPredicates.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedPredicates.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePredicate(p)}
                  className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-semibold shadow-2xs flex items-center gap-1 text-[11px] cursor-pointer"
                  title={`Remove ${p} from filter`}
                >
                  <span>{p}</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              ))}
              <button
                onClick={clearPredicates}
                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 transition-colors text-[11px] font-semibold cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Triples Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-slate-400">#</th>
                  <th className="py-2.5 px-4">
                    <button onClick={() => toggleSort("subject")} className="flex items-center gap-1 cursor-pointer hover:text-slate-900">
                      Subject (Asset / Entity) <SortIcon column="subject" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button onClick={() => toggleSort("predicate")} className="flex items-center gap-1 cursor-pointer hover:text-slate-900">
                      Predicate (Relation / Property) <SortIcon column="predicate" />
                    </button>
                  </th>
                  <th className="py-2.5 px-4">
                    <button onClick={() => toggleSort("object")} className="flex items-center gap-1 cursor-pointer hover:text-slate-900">
                      Object (Value / Target) <SortIcon column="object" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {paginatedTriples.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-sans">
                      No ontology triples match your search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedTriples.map((triple, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const isType = triple.predicate === "rdf:type";
                    const isCase = triple.subject.startsWith("Case_") || triple.predicate.includes("Historical");
                    const isPhysicalRel = [
                      "SUPPLIES",
                      "FEEDS",
                      "POWERS",
                      "COOLS",
                      "DISTRIBUTES_TO",
                      "DRAINS_TO",
                    ].includes(triple.predicate);

                    return (
                      <tr key={`${triple.subject}-${triple.predicate}-${triple.object}-${idx}`} className="hover:bg-indigo-50/40 transition-colors group">
                        <td className="py-2 px-4 text-slate-400">{rowNumber}</td>
                        <td className="py-2 px-4 font-semibold text-slate-900">
                          <button
                            onClick={() => {
                              setInspectedAssetId(triple.subject);
                              setActiveTab("inspector");
                            }}
                            className="hover:text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer text-left"
                            title="Inspect in Dual-Model Inspector"
                          >
                            <span>{triple.subject}</span>
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-indigo-500" />
                          </button>
                        </td>
                        <td className="py-2 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md font-sans text-[10px] font-semibold border ${
                              isType
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : isPhysicalRel
                                ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                : isCase
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {triple.predicate}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-slate-700 max-w-md truncate" title={triple.object}>
                          {isType ? (
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm">
                              {triple.object}
                            </span>
                          ) : (
                            <span>{triple.object}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-500">
            <div>
              Showing {filteredTriples.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredTriples.length)} of {filteredTriples.length} triples
            </div>
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 disabled:opacity-40 transition-colors cursor-pointer text-xs"
              >
                Previous
              </button>
              <span className="px-2 font-medium text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 disabled:opacity-40 transition-colors cursor-pointer text-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EQUIPMENT TAXONOMY */}
      {/* ========================================================================= */}
      {activeTab === "taxonomy" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  <span>Standard Equipment Classes ({filteredClasses.length}{filteredClasses.length !== data?.classes.length ? ` of ${data?.classes.length}` : ""})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  All physical plant assets in FabCore belong to one of these ontology classes. These classes standardize semantic queries across LPG Cypher and SPARQL 1.1 reasoning.
                </p>
              </div>
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search classes or assets..."
                  value={taxonomySearch}
                  onChange={(e) => setTaxonomySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClasses.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                  No classes match your search.
                </div>
              ) : (
                filteredClasses.map((cls) => (
                  <div
                    key={cls.className}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-900 font-mono">:{cls.className}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {cls.count} {cls.count === 1 ? "asset" : "assets"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cls.assets.slice(0, 8).map((assetId) => (
                        <button
                          key={assetId}
                          onClick={() => {
                            setInspectedAssetId(assetId);
                            setActiveTab("inspector");
                          }}
                          className="text-[10px] font-mono bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          {assetId}
                        </button>
                      ))}
                      {cls.assets.length > 8 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{cls.assets.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PREDICATE DICTIONARY */}
      {/* ========================================================================= */}
      {activeTab === "predicates" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-500" />
                <span>Ontology Predicates & Edge Relationships ({filteredPredicates.length}{filteredPredicates.length !== data?.predicates.length ? ` of ${data?.predicates.length}` : ""})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Predicates represent either physical edges in the Labeled Property Graph (e.g., <code className="bg-slate-100 px-1 rounded">:SUPPLIES</code>) or descriptive attributes in RDF (e.g., <code className="bg-slate-100 px-1 rounded">:hasSymptom</code>, <code className="bg-slate-100 px-1 rounded">:carriesMedium</code>).
              </p>
            </div>
            <div className="relative max-w-xs w-full shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search predicates..."
                value={predicateSearch}
                onChange={(e) => setPredicateSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Predicate</th>
                  <th className="py-2.5 px-4">Usage Type</th>
                  <th className="py-2.5 px-4">Total Occurrences</th>
                  <th className="py-2.5 px-4">Cross-Model Query Syntax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {filteredPredicates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-sans">
                      No predicates match your search.
                    </td>
                  </tr>
                ) : (
                  filteredPredicates.map((p) => {
                    const isPhysical = p.isLpgEdgeType || [
                      "SUPPLIES",
                      "FEEDS",
                      "POWERS",
                      "COOLS",
                      "DISTRIBUTES_TO",
                      "DRAINS_TO",
                      "RETURNS_TO",
                    ].includes(p.predicate);

                    return (
                      <tr key={p.predicate} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                          {p.predicate}
                        </td>
                        <td className="py-2.5 px-4">
                          {isPhysical ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-100 text-cyan-800 border border-cyan-200">
                              Physical Graph Edge &amp; RDF Predicate
                            </span>
                          ) : p.predicate === "rdf:type" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              W3C Type Specification
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                              Semantic Property / Rule
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-700 font-semibold">
                          {p.count} triples
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-500">
                          {isPhysical ? (
                            <span>
                              Cypher: <span className="text-cyan-700">[:{p.predicate}]</span> | SPARQL: <span className="text-indigo-700">:{p.predicate}</span>
                            </span>
                          ) : (
                            <span>
                              SPARQL: <span className="text-indigo-700">:{p.predicate} ?val</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DUAL-MODEL ASSET INSPECTOR */}
      {/* ========================================================================= */}
      {activeTab === "inspector" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-500" />
                  <span>Dual-Model Asset Inspector</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select any equipment node to inspect how it is modeled simultaneously in the Labeled Property Graph (LPG) and the W3C RDF Triplestore.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-medium">Select Asset:</span>
                <select
                  value={inspectedAssetId}
                  onChange={(e) => setInspectedAssetId(e.target.value)}
                  className="text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {data?.lpgNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} — {n.data?.label || n.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split Comparison View */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: LPG Graph View */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      LPG Property Graph Model
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-100 text-cyan-800 font-bold rounded">
                    Neo4j Node
                  </span>
                </div>

                {inspectedNode ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Node ID:</span>
                      <span className="font-mono font-bold text-slate-900">{inspectedNode.id}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Display Label:</span>
                      <span className="font-semibold text-slate-800">{inspectedNode.data?.label}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Primary Classification:</span>
                      <span className="font-mono px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                        {inspectedNode.data?.type || "Unknown"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Domain / System:</span>
                      <span className="text-slate-700">{inspectedNode.data?.domain || "General"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Medium Handled:</span>
                      <span className="text-slate-700">{inspectedNode.data?.medium || "Water / Energy"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Redundancy Configuration:</span>
                      <span className="text-slate-700">{inspectedNode.data?.redundancy || "Standard"}</span>
                    </div>

                    <div className="mt-3">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Node Metadata Properties (JSON)
                      </span>
                      <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48">
                        {JSON.stringify(inspectedNode.data?.properties || inspectedNode.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">Node not found in LPG.</div>
                )}
              </div>

              {/* Right: RDF Triplestore View */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      W3C RDF Semantic Triples
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded">
                    Oxigraph Store
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-slate-600 mb-2">
                    Found <strong>{inspectedTriples.length} atomic triples</strong> referencing{" "}
                    <code className="text-indigo-600 font-bold">:{inspectedAssetId}</code>:
                  </div>

                  <div className="overflow-y-auto max-h-80 space-y-1.5 pr-1 font-mono text-[11px]">
                    {inspectedTriples.map((t, i) => (
                      <div
                        key={i}
                        className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={t.subject === inspectedAssetId ? "text-indigo-600 font-bold" : "text-slate-600"}>
                            :{t.subject}
                          </span>
                          <span className="text-amber-600 font-semibold">:{t.predicate}</span>
                          <span className={t.object === inspectedAssetId ? "text-indigo-600 font-bold" : "text-slate-800"}>
                            {t.object}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* SPARQL Query Generator for this asset */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Quick SPARQL 1.1 Discovery Query
                    </span>
                    <pre className="p-2 bg-slate-900 text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto">
{`SELECT ?predicate ?object WHERE {
  :${inspectedAssetId} ?predicate ?object .
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: HISTORICAL CASE KNOWLEDGE BASE */}
      {/* ========================================================================= */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-600" />
              <span>Historical Cases &amp; OCAP Failure Mode Ontologies</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Encoded operational fault cases with symptoms, distinguishing features, root causes, and OCAP mitigation procedures shared across both semantic engines.
            </p>

            <div className="space-y-3">
              {historicalCases.map(({ caseId, props }) => (
                <div
                  key={caseId}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-purple-300 transition-colors space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="font-bold text-xs text-slate-900 font-mono">{caseId}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                      HistoricalCase
                    </span>
                  </div>

                  {props.hasSymptom && (
                    <div className="text-xs">
                      <span className="font-semibold text-slate-600">Symptom: </span>
                      <span className="text-slate-800">{props.hasSymptom.join(", ")}</span>
                    </div>
                  )}

                  {props.hasDistinguishingFeature && (
                    <div className="text-xs bg-amber-50/80 border border-amber-200 p-2 rounded-lg text-amber-900">
                      <span className="font-bold">Distinguishing Feature: </span>
                      <span>{props.hasDistinguishingFeature.join(", ")}</span>
                    </div>
                  )}

                  {props.hasRootCause && (
                    <div className="text-xs">
                      <span className="font-semibold text-rose-700">Root Cause: </span>
                      <span className="text-slate-800">{props.hasRootCause.join(", ")}</span>
                    </div>
                  )}

                  {props.hasMitigation && (
                    <div className="text-xs bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-900">
                      <span className="font-bold">Automated OCAP Mitigation: </span>
                      <span>{props.hasMitigation.join(", ")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
