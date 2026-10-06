import React, { useState, useEffect } from "react";
import {
  Database,
  Search,
  Cpu,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Trash2,
  Terminal,
  Layers,
  Clock,
  Copy,
  Check,
  Code2,
  Tag,
  X,
  ChevronDown,
  CheckSquare,
  Square,
} from "lucide-react";

interface Triple {
  subject: string;
  predicate: string;
  object: string;
}

interface SparqlBinding {
  [varName: string]: string;
}

interface SparqlQueryResult {
  success: boolean;
  type: "select" | "boolean" | "update" | "error";
  bindings?: SparqlBinding[];
  variables?: string[];
  booleanValue?: boolean;
  count?: number;
  message?: string;
  totalTriples?: number;
  error?: string;
  executionTimeMs?: number;
  rawSparql?: string;
}

function getResultColumns(res: SparqlQueryResult | null): string[] {
  if (!res) return [];
  if (res.variables && res.variables.length > 0) return res.variables;
  if (!res.bindings || res.bindings.length === 0) return [];
  const colSet = new Set<string>();
  for (const b of res.bindings) {
    for (const key of Object.keys(b)) {
      colSet.add(key);
    }
  }
  return Array.from(colSet);
}

const SAMPLE_SPARQL_QUERIES = [
  {
    label: "1. All Loaded Triples (Atomic Facts)",
    query: `SELECT ?subject ?predicate ?object 
WHERE { 
  ?subject ?predicate ?object 
} 
LIMIT 50`,
  },
  {
    label: "2. Map Active Alarms to Assets & Sensed Conditions",
    query: `SELECT ?alarm ?asset ?condition 
WHERE { 
  ?alarm :monitoredAsset ?asset ;
         :sensedCondition ?condition .
}`,
  },
  {
    label: "3. Derive Upstream Root Cause from Tool Alarm A-06 (Transitive)",
    query: `SELECT ?toolAlarm ?tool ?upstreamSupplier ?rootAsset
WHERE {
  ?toolAlarm :monitoredAsset :TOOL-LITHO-01 .
  :TOOL-LITHO-01 (^( :POWERS | :SUPPLIES | :DISTRIBUTES_TO | :COOLS | :powers | :pressurizes | :suppliesCoolantTo | :cools ))+ ?rootAsset .
  FILTER NOT EXISTS { ?anyOther ( :POWERS | :SUPPLIES | :DISTRIBUTES_TO | :COOLS | :powers | :pressurizes | :suppliesCoolantTo | :cools ) ?rootAsset }
}`,
  },
  {
    label: "4. Derive Downstream Blast Radius & Impacted Tools from MCC-01",
    query: `SELECT ?sourceAsset ?downstreamAsset ?toolType
WHERE {
  :MCC-01 ( :POWERS | :SUPPLIES | :DISTRIBUTES_TO | :COOLS | :powers | :pressurizes | :suppliesCoolantTo | :cools )+ ?downstreamAsset .
  OPTIONAL { ?downstreamAsset rdf:type ?toolType }
}`,
  },
  {
    label: "5. Derive Physics Input/Output Requirements per Equipment Class",
    query: `SELECT ?equipmentClass ?requiresInput ?providesOutput
WHERE {
  ?equipmentClass :requiresInput ?requiresInput .
  OPTIONAL { ?equipmentClass :providesOutput ?providesOutput }
}`,
  },
  {
    label: "6. Derive Unfulfilled Physics Chain (Why HeatExchanger Lost Cooling)",
    query: `SELECT ?asset ?neededInput ?supplierAsset ?supplierProvides
WHERE {
  ?asset rdf:type ?assetClass .
  ?assetClass :requiresInput ?neededInput .
  ?supplierAsset ( :SUPPLIES | :POWERS | :suppliesCoolantTo | :pressurizes | :powers ) ?asset .
  ?supplierAsset rdf:type ?supplierClass .
  ?supplierClass :providesOutput ?supplierProvides .
}`,
  },
  {
    label: "7. ASK Query: Is Lithography Tool Dependent on MCC-01?",
    query: `ASK { 
  :MCC-01 ( :POWERS | :SUPPLIES | :DISTRIBUTES_TO | :COOLS | :powers | :pressurizes | :suppliesCoolantTo | :cools )+ :TOOL-LITHO-01 
}`,
  },
  {
    label: "8. Query Past Incident Cases & Root Causes for Equipment (:CHW-P-01)",
    query: `SELECT ?equipment ?case ?symptom ?rootCause ?mitigation
WHERE {
  ?equipment :hasHistoricalCase ?case .
  OPTIONAL { ?case :hasSymptom ?symptom }
  OPTIONAL { ?case :hasRootCause ?rootCause }
  OPTIONAL { ?case :hasMitigation ?mitigation }
}`,
  },
  {
    label: "9. Live INSERT DATA: Ingest New Historical Case for CHW-P-02 (5 Triples)",
    query: `PREFIX : <http://semicon.cleanroom.twin/ontology#>

INSERT DATA {
  :CHW-P-02 :hasHistoricalCase :Case_CHW_P02_2026_BearingOverheat .
  :Case_CHW_P02_2026_BearingOverheat rdf:type :HistoricalCase ;
    :hasSymptom "High outboard bearing temp (>85 deg C) with high frequency spectrum spike" ;
    :hasRootCause "Grease degradation and micro-pitting on roller element" ;
    :hasMitigation "Flushed bearing housing, re-lubricated with Polyrex EM, and adjusted shaft alignment" .
}`,
  },
  {
    label: "10. Trace Full UPW Ultrapure Water Flow (Raw Tank -> RO -> Header -> Points of Use)",
    query: `PREFIX : <http://semicon.cleanroom.twin/ontology#>

SELECT ?source ?rel ?destination ?destType
WHERE {
  ?source ( :SUPPLIES | :FEEDS | :DISTRIBUTES_TO ) ?destination .
  FILTER(STRSTARTS(STR(?source), STR(:UPW)))
  OPTIONAL { ?destination rdf:type ?destType }
}
ORDER BY ?source`,
  },
  {
    label: "11. Victim Node RCA: CMP Tool 01 & Upstream Cascade Issues",
    query: `SELECT ?node ?alarm ?condition ?historicalCase ?rootCause ?mitigation
WHERE {
  {
    # 1. Victim node itself
    BIND(:TOOL-CMP-01 AS ?node)
  }
  UNION
  {
    # 2. All upstream equipment feeding, cooling, powering, or controlling it
    ?node (:SUPPLIES|:COOLS|:FEEDS|:DISTRIBUTES_TO|:POWERS|:CONTROLS)+ :TOOL-CMP-01 .
  }

  # Discover active alarms & sensed conditions along the supply chain
  OPTIONAL {
    ?alarm :monitoredAsset ?node ;
           :sensedCondition ?condition .
  }

  # Discover historical incidents, failure causes, and mitigations
  OPTIONAL {
    ?node :hasHistoricalCase ?historicalCase .
    OPTIONAL { ?historicalCase :hasRootCause ?rootCause . }
    OPTIONAL { ?historicalCase :hasMitigation ?mitigation . }
  }

  # Filter to only return equipment nodes that have active alarms or past incidents
  FILTER(BOUND(?condition) || BOUND(?historicalCase))
}
ORDER BY ?node`,
  },
  {
    label: "12. Case 1: UPW-RO-01 Permeate Drift & Local RCA",
    query: `SELECT ?asset ?susceptibility ?induces ?case ?symptom ?rootCause ?mitigation
WHERE {
  :UPW-RO-01 :hasHistoricalCase ?case .
  ?case :hasSymptom ?symptom ;
        :hasRootCause ?rootCause ;
        :hasMitigation ?mitigation .
  OPTIONAL { :UPW-RO-01 :susceptibleTo ?susceptibility . }
  OPTIONAL { ?susceptibility :inducesDrift ?induces . }
}`,
  },
  {
    label: "13. Case 2: T-1012 Breakthrough & Multi-Train RCA",
    query: `SELECT ?tank ?susceptibility ?induces ?affectedTrain ?case ?rootCause ?mitigation
WHERE {
  :T-1012 :hasHistoricalCase ?case .
  ?case :hasRootCause ?rootCause ;
        :hasMitigation ?mitigation .
  OPTIONAL { :T-1012 :susceptibleTo ?susceptibility . }
  OPTIONAL { ?susceptibility :inducesDrift ?induces . }
  OPTIONAL { ?induces :affectsAsset ?affectedTrain . }
}`,
  },
  {
    label: "14. Case 3: MMF Breakthrough & Plant-Wide RCA",
    query: `SELECT ?filter ?driftMode ?fouling ?affectedAsset ?case ?rootCause ?mitigation
WHERE {
  :MMF :hasHistoricalCase ?case .
  ?case :hasRootCause ?rootCause ;
        :hasMitigation ?mitigation .
  OPTIONAL { :MMF :susceptibleTo ?driftMode . }
  OPTIONAL { ?driftMode :inducesDrift ?fouling . }
  OPTIONAL { ?fouling :affectsAsset ?affectedAsset . }
}`,
  },
];

const PREDICATE_PRESETS = [
  { label: "Drift & Excursions", preds: ["susceptibleTo", "inducesDrift", "regeneratedBy", "affectsAsset"] },
  { label: "Flows", preds: ["SUPPLIES", "FEEDS", "DISTRIBUTES_TO", "RETURNS_TO"] },
  { label: "Power & Control", preds: ["POWERS", "CONTROLS", "BACKUP_FOR", "hasBackupAsset", "isAvailableAsFailover"] },
  { label: "Cooling", preds: ["COOLS"] },
  { label: "Incidents", preds: ["hasHistoricalCase", "hasSymptom", "hasDistinguishingFeature", "hasRootCause", "hasMitigation"] },
  { label: "Physics & Sensors", preds: ["monitoredAsset", "sensedCondition", "nominalRating", "carriesMedium", "failureDelay"] },
  { label: "Classes", preds: ["rdf:type"] },
];

export function RdfEngine() {
  const [triples, setTriples] = useState<Triple[]>([]);
  const [tripleFilter, setTripleFilter] = useState("");
  const [selectedPredicates, setSelectedPredicates] = useState<string[]>([]);
  const [isPredicateDropdownOpen, setIsPredicateDropdownOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"sparql" | "ai">("sparql");

  // AI Semantic Query State
  const [prompt, setPrompt] = useState("");
  const [isVerbose, setIsVerbose] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    sparql: string;
    newKnowledge: string[];
    explanation: string;
    sparqlResult?: SparqlQueryResult;
  } | null>(null);

  // Direct SPARQL Console State
  const [rawSparql, setRawSparql] = useState(SAMPLE_SPARQL_QUERIES[0].query);
  const [isLoadingSparql, setIsLoadingSparql] = useState(false);
  const [sparqlResult, setSparqlResult] = useState<SparqlQueryResult | null>(null);
  const [copiedSparql, setCopiedSparql] = useState(false);

  // Engine Stats State
  const [engineStatus, setEngineStatus] = useState<{
    isLoaded: boolean;
    loadedCount: number;
    triplesCount?: number;
  }>({ isLoaded: false, loadedCount: 0 });
  const [isReloading, setIsReloading] = useState(false);

  const fetchStatusAndTriples = async () => {
    try {
      const [triplesRes, statusRes] = await Promise.all([
        fetch("/api/twin/rdf"),
        fetch("/api/rdf/status"),
      ]);
      const triplesData = await triplesRes.json();
      const statusData = await statusRes.json();
      setTriples(Array.isArray(triplesData) ? triplesData : []);
      setEngineStatus(statusData);
    } catch (err) {
      console.error("Failed to load digital twin rdf data", err);
    }
  };

  useEffect(() => {
    fetchStatusAndTriples();
  }, []);

  const handleReloadEngine = async () => {
    setIsReloading(true);
    try {
      const res = await fetch("/api/rdf/reload", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchStatusAndTriples();
      }
    } catch (err) {
      console.error("Failed to reload Oxigraph triplestore:", err);
    } finally {
      setIsReloading(false);
    }
  };

  const handleClearEngine = async () => {
    setIsReloading(true);
    try {
      const res = await fetch("/api/rdf/clear", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTriples([]);
        setEngineStatus({ isLoaded: false, loadedCount: 0, triplesCount: 0 });
      }
    } catch (err) {
      console.error("Failed to clear Oxigraph triplestore:", err);
    } finally {
      setIsReloading(false);
    }
  };

  const handleRunDirectSparql = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawSparql.trim()) return;

    setIsLoadingSparql(true);
    setSparqlResult(null);

    try {
      const res = await fetch("/api/rdf/sparql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sparql: rawSparql }),
      });
      const data: SparqlQueryResult = await res.json();
      setSparqlResult(data);

      if (data.type === "update" || /\b(INSERT|DELETE|CLEAR)\b/i.test(rawSparql)) {
        await fetchStatusAndTriples();
      }
    } catch (err: any) {
      setSparqlResult({
        success: false,
        type: "error",
        error: err.message || "Failed to execute SPARQL query on Oxigraph",
      });
    } finally {
      setIsLoadingSparql(false);
    }
  };

  const addAiLog = (msg: string) => {
    setAiLogs((prev) => [...prev, msg]);
  };

  const handleAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoadingAi(true);
    setAiResult(null);
    setAiLogs([]);
    setAiError(null);
    addAiLog(`> Received semantic prompt: "${prompt}"`);
    addAiLog(`> Verbose reasoning mode: ${isVerbose ? "ENABLED" : "DISABLED"}`);
    addAiLog("> Translating query to SPARQL & querying Oxigraph store...");

    try {
      const res = await fetch("/api/rdf/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, isVerbose }),
      });

      addAiLog("> Received inference and Oxigraph execution results.");
      const data = await res.json();

      if (data.error) {
        addAiLog(`> ERROR: ${data.error}`);
        setAiError(data.error);
      } else {
        addAiLog("> Oxigraph SPARQL evaluated successfully.");
        if (data.sparqlResult?.executionTimeMs) {
          addAiLog(`> Oxigraph Execution Time: ${data.sparqlResult.executionTimeMs} ms`);
        }
        addAiLog("> Extracted inferred knowledge and logical explanations.");
        setAiResult(data);
      }
    } catch (err: any) {
      console.error(err);
      const errStr = err?.message || "Failed to reach semantic engine";
      addAiLog(`> ERROR: ${errStr}`);
      setAiError(errStr);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSparql(true);
    setTimeout(() => setCopiedSparql(false), 2000);
  };

  const predicateCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    triples.forEach((t) => {
      map.set(t.predicate, (map.get(t.predicate) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [triples]);

  const togglePredicate = (pred: string) => {
    setSelectedPredicates((prev) =>
      prev.includes(pred) ? prev.filter((p) => p !== pred) : [...prev, pred]
    );
  };

  const clearPredicates = () => {
    setSelectedPredicates([]);
  };

  const selectAllPredicates = () => {
    setSelectedPredicates(predicateCounts.map(([p]) => p));
  };

  const selectPreset = (preds: string[]) => {
    setSelectedPredicates(preds);
  };

  const filteredTriples = React.useMemo(() => {
    // 1. Filter by selected predicates (multi-select) and search query
    const matching = triples.filter((t) => {
      if (selectedPredicates.length > 0 && !selectedPredicates.includes(t.predicate)) {
        return false;
      }
      if (!tripleFilter.trim()) return true;
      const q = tripleFilter.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.predicate.toLowerCase().includes(q) ||
        t.object.toLowerCase().includes(q)
      );
    });

    // 2. Identify all historical case root triples (e.g. CHW-P-01 :hasHistoricalCase Case_...)
    const caseRootTriples = matching.filter((t) => t.predicate === "hasHistoricalCase");

    const bundled: Triple[] = [];
    const visited = new Set<Triple>();

    // For each historical case, output the main case triple, then immediately its symptoms, root cause, mitigation
    caseRootTriples.forEach((root) => {
      bundled.push(root);
      visited.add(root);

      const caseId = root.object;
      const children = matching.filter((t) => t.subject === caseId && !visited.has(t));

      const childRank = (pred: string) => {
        if (pred === "hasSymptom") return 1;
        if (pred === "hasRootCause") return 2;
        if (pred === "hasMitigation") return 3;
        if (pred === "rdf:type") return 4;
        return 5;
      };

      children.sort((a, b) => childRank(a.predicate) - childRank(b.predicate));
      children.forEach((c) => {
        bundled.push(c);
        visited.add(c);
      });
    });

    // Also pick up any standalone symptom/cause/mitigation triples that might match if search specifically isolated them
    const orphanCaseTriples = matching.filter(
      (t) =>
        (t.predicate === "hasSymptom" ||
          t.predicate === "hasRootCause" ||
          t.predicate === "hasMitigation" ||
          (t.predicate === "rdf:type" && t.object === "HistoricalCase")) &&
        !visited.has(t)
    );
    orphanCaseTriples.forEach((t) => {
      bundled.push(t);
      visited.add(t);
    });

    // 3. All standard ontology triples follow below
    const standardTriples = matching.filter((t) => !visited.has(t));
    return [...bundled, ...standardTriples];
  }, [triples, tripleFilter, selectedPredicates]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] w-full gap-4 text-slate-800">
      {/* Left Column: Triplestore Database (Knowledge Base) */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden h-full">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Ontology Triplestore
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                W3C RDF/OWL Triples in Subject-Predicate-Object format
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearEngine}
              disabled={isReloading}
              title="Remove All Triples from Oxigraph Store"
              className="p-1.5 rounded-md text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            </button>
            <button
              onClick={handleReloadEngine}
              disabled={isReloading}
              title="Clear & Reload fresh Triples into in-memory Oxigraph Store"
              className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReloading ? "animate-spin text-emerald-600" : ""}`} />
            </button>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filteredTriples.length} / {triples.length} Triples
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-2">
          {/* Row 1: Search Input & Multi-Select Predicate Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={tripleFilter}
                onChange={(e) => setTripleFilter(e.target.value)}
                placeholder="Search subject, predicate, or object..."
                className="w-full bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs rounded-md pl-8 pr-7 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors shadow-2xs"
              />
              {tripleFilter && (
                <button
                  type="button"
                  onClick={() => setTripleFilter("")}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Clear text search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Predicate Multi-Selector Popover Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsPredicateDropdownOpen(!isPredicateDropdownOpen)}
                className={`flex items-center gap-1.5 border text-xs rounded-md px-2.5 py-1.5 font-medium shadow-2xs transition-colors cursor-pointer ${
                  selectedPredicates.length > 0
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-300"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                title="Select multiple predicates to filter"
              >
                <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate max-w-[130px]">
                  {selectedPredicates.length === 0
                    ? "All Predicates"
                    : selectedPredicates.length === 1
                    ? selectedPredicates[0]
                    : `${selectedPredicates.length} Selected`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isPredicateDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Popover Menu */}
              {isPredicateDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsPredicateDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-40 p-2.5 text-xs flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                    {/* Header with Quick Actions */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                        Filter Predicates ({selectedPredicates.length > 0 ? `${selectedPredicates.length} active` : "All"})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllPredicates}
                          className="text-[10px] text-emerald-600 hover:underline font-semibold cursor-pointer"
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

                    {/* Quick Bundles */}
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
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-[10px] text-slate-700 transition-colors font-medium border border-slate-200/60 cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* List of checkboxes for all predicates */}
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
                                ? "bg-emerald-50 text-emerald-950 font-semibold"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
          </div>

          {/* Row 2: Multi-Select Quick Predicate Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] scrollbar-thin">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0 mr-0.5">
              Predicates:
            </span>
            <button
              type="button"
              onClick={clearPredicates}
              className={`px-2.5 py-0.5 rounded-full font-medium transition-colors shrink-0 text-xs cursor-pointer ${
                selectedPredicates.length === 0
                  ? "bg-emerald-600 text-white font-semibold shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              All ({triples.length})
            </button>

            {[
              "rdf:type",
              "susceptibleTo",
              "inducesDrift",
              "regeneratedBy",
              "SUPPLIES",
              "FEEDS",
              "COOLS",
              "POWERS",
              "CONTROLS",
              "hasHistoricalCase",
              "BACKUP_FOR",
              "DISTRIBUTES_TO",
              "RETURNS_TO",
            ].map((p) => {
              const count = triples.filter((t) => t.predicate === p).length;
              if (count === 0) return null;
              const isSelected = selectedPredicates.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePredicate(p)}
                  className={`px-2 py-0.5 rounded-full transition-all shrink-0 flex items-center gap-1 text-[11px] cursor-pointer ${
                    isSelected
                      ? "bg-emerald-600 text-white font-bold shadow-2xs ring-1 ring-emerald-500"
                      : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200"
                  }`}
                  title={`Toggle filter for ${p} (${count} triples)`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 text-emerald-100" />}
                  <span>{p}</span>
                  <span className={`text-[10px] ${isSelected ? "text-emerald-100" : "text-slate-400 font-mono"}`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Clear All Selected Pills Button */}
            {selectedPredicates.length > 0 && (
              <button
                type="button"
                onClick={clearPredicates}
                className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 transition-colors shrink-0 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                title="Clear all predicate filters"
              >
                <span>Reset ({selectedPredicates.length})</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Triples Table */}
        <div className="p-3 overflow-y-auto flex-1 font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200 text-[10px] uppercase tracking-wider sticky top-0 bg-white">
                <th className="pb-2 font-bold w-1/3">Subject</th>
                <th className="pb-2 font-bold w-1/3">Predicate</th>
                <th className="pb-2 font-bold w-1/3">Object</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTriples.map((t, i) => {
                const isPredicateActive = selectedPredicates.includes(t.predicate);
                const isCase1Triple = 
                  t.subject.startsWith("Case_RO01_") ||
                  t.object.startsWith("Case_RO01_") ||
                  t.subject.startsWith("Case_R001_") ||
                  t.object.startsWith("Case_R001_") ||
                  t.subject === "Case_RO01_2026_ProbeDrift_ORingLeak" ||
                  t.object === "Case_RO01_2026_ProbeDrift_ORingLeak" ||
                  t.subject === "SensorDrift_ORingLeak" ||
                  t.object === "SensorDrift_ORingLeak" ||
                  (t.subject === "UPW-RO-01" && 
                    (t.predicate === "hasHistoricalCase" || t.predicate === "susceptibleTo" || t.predicate === "carriesMedium" || t.predicate === "nominalRating" || t.predicate === "failureDelay"));

                const isCase2Triple = 
                  t.subject.startsWith("Case_T1012_") ||
                  t.object.startsWith("Case_T1012_") ||
                  t.subject === "Case_T1012_2026_CationBreakthrough_FeedContamination" ||
                  t.object === "Case_T1012_2026_CationBreakthrough_FeedContamination" ||
                  t.subject === "CationResinExhaustion_MineralSlip" ||
                  t.object === "CationResinExhaustion_MineralSlip" ||
                  t.subject === "CommonMode_RO_FeedContamination" ||
                  t.object === "CommonMode_RO_FeedContamination" ||
                  ((t.subject === "T-1012" || t.subject === "SAC-0913" || t.subject === "SAC-0914" || t.subject === "T-1011") && 
                    (t.predicate === "hasHistoricalCase" || t.predicate === "susceptibleTo" || t.predicate === "regeneratedBy" || t.predicate === "hasBackupAsset" || t.predicate === "isAvailableAsFailover" || t.predicate === "carriesMedium" || t.predicate === "nominalRating"));

                const isCase3Triple = 
                  t.subject.startsWith("Case_MMF_") ||
                  t.object.startsWith("Case_MMF_") ||
                  t.subject === "UnderdrainNozzleFailure_MediaSlip" ||
                  t.object === "UnderdrainNozzleFailure_MediaSlip" ||
                  t.subject === "PlantWide_Silt_Colloidal_Fouling" ||
                  t.object === "PlantWide_Silt_Colloidal_Fouling" ||
                  (t.subject === "MMF" &&
                    (t.predicate === "hasHistoricalCase" || t.predicate === "susceptibleTo" || t.predicate === "carriesMedium" || t.predicate === "nominalRating" || t.predicate === "failureDelay"));

                const isPurpleDriftPredicate = 
                  t.predicate === "susceptibleTo" || 
                  t.predicate === "inducesDrift" || 
                  t.predicate === "regeneratedBy" ||
                  t.predicate === "affectsAsset";

                return (
                  <tr key={i} className={`transition-colors ${
                    isCase3Triple
                      ? 'bg-amber-50/40 hover:bg-amber-50/80 border-l-2 border-l-amber-500'
                      : isCase2Triple 
                      ? 'bg-purple-50/40 hover:bg-purple-50/80 border-l-2 border-l-purple-600' 
                      : isCase1Triple 
                      ? 'bg-rose-50/40 hover:bg-rose-50/80 border-l-2 border-l-rose-500' 
                      : 'hover:bg-slate-50/90'
                  }`}>
                    <td className="py-2 pr-2 font-mono text-xs font-semibold text-slate-800 truncate max-w-[140px]" title={t.subject}>
                      {t.subject}
                    </td>
                    <td className="py-2 px-2 font-mono text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => togglePredicate(t.predicate)}
                        className={`inline-block px-1.5 py-0.5 rounded truncate max-w-[130px] border text-left cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                          isCase3Triple
                            ? isPredicateActive
                              ? "bg-amber-600 text-white border-amber-600 font-extrabold shadow-2xs ring-1 ring-amber-400"
                              : "bg-amber-100 text-amber-900 border-amber-300 font-bold hover:bg-amber-200"
                            : isCase2Triple
                            ? isPredicateActive
                              ? "bg-purple-700 text-white border-purple-700 font-extrabold shadow-2xs ring-1 ring-purple-400"
                              : "bg-purple-100 text-purple-900 border-purple-300 font-bold hover:bg-purple-200"
                            : isCase1Triple
                            ? isPredicateActive
                              ? "bg-rose-600 text-white border-rose-600 font-extrabold shadow-2xs ring-1 ring-rose-400"
                              : "bg-rose-100 text-rose-800 border-rose-300 font-bold hover:bg-rose-200"
                            : isPurpleDriftPredicate
                            ? isPredicateActive
                              ? "bg-purple-700 text-white border-purple-700 font-extrabold shadow-2xs ring-1 ring-purple-400"
                              : "bg-purple-100 text-purple-900 border-purple-300 font-bold hover:bg-purple-200"
                            : t.predicate === "hasHistoricalCase"
                            ? "bg-blue-600 text-white border-blue-500 font-extrabold shadow-xs ring-1 ring-blue-400"
                            : t.predicate === "hasSymptom" ||
                              t.predicate === "hasDistinguishingFeature" ||
                              t.predicate === "hasRootCause" ||
                              t.predicate === "hasMitigation" ||
                              (t.predicate === "rdf:type" && (t.object === "HistoricalCase" || t.subject.startsWith("Case_")))
                            ? "bg-sky-50 text-sky-700 border-sky-300 font-semibold"
                            : isPredicateActive
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                        }`}
                        title={`Click to toggle predicate in multi-filter: ${t.predicate} ${isCase3Triple ? '(Case 3 Triple)' : isCase2Triple ? '(Case 2 Triple)' : isCase1Triple ? '(Case 1 Triple)' : ''}`}
                      >
                        {t.predicate}
                      </button>
                    </td>
                    <td className="py-2 pl-2 font-mono text-xs text-slate-600 truncate max-w-[140px]" title={t.object}>
                      {t.object === "HistoricalCase" ? (
                        <span className={`inline-block font-semibold border px-1.5 py-0.5 rounded text-[11px] ${
                          isCase3Triple
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : isCase2Triple
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : isCase1Triple
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-sky-50 text-sky-800 border-sky-200"
                        }`}>
                          {t.object}
                        </span>
                      ) : (
                        t.object
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredTriples.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center py-8 text-slate-400 text-xs font-sans"
                  >
                    No triples found {selectedPredicates.length > 0 ? `matching predicates [${selectedPredicates.join(", ")}]` : ""} {tripleFilter ? `matching "${tripleFilter}"` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Dual-Mode Testing (SPARQL Console / AI Semantic Engine) */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden h-full">
        {/* Header with Mode Switcher */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              {activeMode === "sparql" ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Oxigraph Semantic Engine
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {engineStatus.loadedCount || triples.length} Triples Active
                </span>
              </h2>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveMode("sparql")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeMode === "sparql"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>SPARQL Console</span>
            </button>
            <button
              onClick={() => setActiveMode("ai")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeMode === "ai"
                  ? "bg-white text-emerald-800 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Inferences</span>
            </button>
          </div>
        </div>

        {/* MODE 1: Direct SPARQL 1.1 Console */}
        {activeMode === "sparql" && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
            {/* Top Toolbar */}
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Presets:
                </span>
                <select
                  onChange={(e) => {
                    const selected = SAMPLE_SPARQL_QUERIES.find((q) => q.label === e.target.value);
                    if (selected) {
                      setRawSparql(selected.query);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer w-full max-w-sm"
                >
                  {SAMPLE_SPARQL_QUERIES.map((q) => (
                    <option key={q.label} value={q.label}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(rawSparql)}
                  className="px-2.5 py-1 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono flex items-center gap-1 border border-slate-700 transition-colors"
                  title="Copy SPARQL"
                >
                  {copiedSparql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSparql ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunDirectSparql()}
                  disabled={isLoadingSparql || !rawSparql.trim()}
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingSparql ? (
                    <>
                      <Cpu className="w-3.5 h-3.5 animate-spin" /> Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Run SPARQL
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SPARQL Query Input Area */}
            <div className="h-44 shrink-0 border-b border-slate-800 relative">
              <textarea
                value={rawSparql}
                onChange={(e) => setRawSparql(e.target.value)}
                placeholder="Enter SPARQL 1.1 query (SELECT, ASK, CONSTRUCT, DESCRIBE)..."
                className="w-full h-full p-3 font-mono text-xs text-emerald-400 bg-slate-900 border-none resize-none focus:outline-none focus:ring-0 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Results Console Section */}
            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              {/* Result Bar */}
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold text-slate-300">Oxigraph Execution Results</span>
                </div>
                {sparqlResult && (
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    {sparqlResult.executionTimeMs !== undefined && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-emerald-400" /> {sparqlResult.executionTimeMs} ms
                      </span>
                    )}
                    {sparqlResult.count !== undefined && (
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                        {sparqlResult.count} {sparqlResult.count === 1 ? "row" : "rows"}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Result Content */}
              <div className="flex-1 overflow-auto p-3">
                {isLoadingSparql && (
                  <div className="h-full flex items-center justify-center text-emerald-400 text-xs font-mono animate-pulse">
                    <Cpu className="w-4 h-4 mr-2 animate-spin" /> Querying in-memory Oxigraph W3C Triplestore...
                  </div>
                )}

                {!isLoadingSparql && !sparqlResult && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-2">
                    <Terminal className="w-8 h-8 text-slate-700" />
                    <p>Click "Run SPARQL" above or select any preset to execute queries directly on Oxigraph.</p>
                  </div>
                )}

                {!isLoadingSparql && sparqlResult?.type === "error" && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-lg text-xs font-mono space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-200">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      SPARQL Execution Error
                    </div>
                    <p className="text-rose-300/90 whitespace-pre-wrap">{sparqlResult.error}</p>
                  </div>
                )}

                {!isLoadingSparql && sparqlResult?.type === "update" && (
                  <div className="p-4 bg-blue-950/60 border border-blue-700 text-blue-200 rounded-lg text-xs font-mono space-y-2">
                    <div className="flex items-center gap-2 font-bold text-blue-100 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      SPARQL UPDATE Executed Successfully
                    </div>
                    <p className="text-slate-300 leading-relaxed">{sparqlResult.message}</p>
                    <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
                      <span className="bg-blue-900/60 text-blue-200 border border-blue-700 px-2 py-0.5 rounded">
                        Total Triples in Store: {sparqlResult.totalTriples}
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        ⚡ Triplestore Table automatically reloaded & prioritized at top!
                      </span>
                    </div>
                  </div>
                )}

                {!isLoadingSparql && sparqlResult?.type === "boolean" && (
                  <div className="p-6 flex flex-col items-center justify-center space-y-3">
                    <span className="text-xs text-slate-400 font-mono">ASK Query Evaluation:</span>
                    <div
                      className={`text-2xl font-bold font-mono px-6 py-2 rounded-xl border ${
                        sparqlResult.booleanValue
                          ? "bg-emerald-950 text-emerald-400 border-emerald-700"
                          : "bg-rose-950 text-rose-400 border-rose-700"
                      }`}
                    >
                      {sparqlResult.booleanValue ? "TRUE (Graph Matched)" : "FALSE (Not Matched)"}
                    </div>
                  </div>
                )}

                {!isLoadingSparql && sparqlResult?.type === "select" && sparqlResult.bindings && (
                  <div>
                    {sparqlResult.bindings.length === 0 ? (
                      <div className="text-slate-400 text-xs font-mono p-4 text-center">
                        Query returned 0 matching rows.
                      </div>
                    ) : (() => {
                      const columns = getResultColumns(sparqlResult);
                      return (
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                          <table className="w-full text-left font-mono text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-900 border-b border-slate-800 text-emerald-400 text-[11px]">
                                <th className="py-2 px-3 w-10 text-slate-500 font-normal">#</th>
                                {columns.map((col) => (
                                  <th key={col} className="py-2 px-3 font-bold border-l border-slate-800 whitespace-nowrap">
                                    ?{col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900 bg-slate-950">
                              {sparqlResult.bindings.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-900/80 transition-colors">
                                  <td className="py-1.5 px-3 text-slate-600 text-[10px]">{idx + 1}</td>
                                  {columns.map((col) => (
                                    <td key={col} className="py-1.5 px-3 text-slate-200 border-l border-slate-900 whitespace-nowrap max-w-xs truncate" title={row[col] ?? ""}>
                                      {row[col] ? (
                                        <span className="text-emerald-300 font-semibold">{row[col]}</span>
                                      ) : (
                                        <span className="text-slate-600">—</span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: AI Semantic Inferences */}
        {activeMode === "ai" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top: Query Form & Sample Queries */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 shrink-0 space-y-3">
              <form onSubmit={handleAiQuery} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Natural Language Semantic Query
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-600 font-semibold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isVerbose}
                      onChange={(e) => setIsVerbose(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    <span>Verbose Reasoning</span>
                  </label>
                </div>

                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., 'What equipment is located in CUP_Level_1?' or 'Is Mario certified for Gas_Bunker_A?'"
                    className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm rounded-lg pl-10 pr-28 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingAi || !prompt.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase px-3.5 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5"
                  >
                    {isLoadingAi ? (
                      <>
                        <Cpu className="w-3.5 h-3.5 animate-spin" /> Reasoning...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Discover
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Sample Queries */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Sample Queries:
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) setPrompt(e.target.value);
                      e.target.value = "";
                    }}
                    className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-emerald-500 shadow-xs cursor-pointer hover:border-emerald-300"
                  >
                    <option value="">-- Select a semantic query to test inferencing --</option>
                    <option value="What equipment is located in CUP_Level_1?">[*] What equipment is located in CUP_Level_1?</option>
                    <option value="What are the failure modes of UPW-P-01?">[**] What are the failure modes of UPW-P-01?</option>
                    <option value="Find all equipment that is a sub-class of ProcessAsset.">[***] Find all equipment that is a sub-class of ProcessAsset.</option>
                    <option value="If a vibration sensor detects an anomaly, which specific assets should be inspected?">[***] If a vibration sensor detects an anomaly, which specific assets should be inspected?</option>
                    <option value="Licheng is assigned to maintain Scrubber_01. Based on its location and his certifications, is this safe? If not, what is the fallback action?">[****] SAFETY GUARD: Is Licheng qualified to maintain Scrubber_01?</option>
                    <option value="What safety protocols and PPE are triggered if a technician is dispatched to Silane_Cabinet_01? If they lack PPE, what is the fallback?">[****] SAFETY GUARD: Silane_Cabinet_01 dispatch protocols & fallbacks</option>
                    <option value="Compare the maintenance requirements (protocols and certifications) for UPW-P-01 versus Scrubber_01.">[****] Compare maintenance requirements for UPW-P-01 vs Scrubber_01</option>
                    <option value="Mario is requested to maintain a Gas Cabinet in Gas_Bunker_A. Is he certified? What protocols must he follow?">[****] SAFETY GUARD: Is Mario certified for Gas_Bunker_A?</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Output Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {/* Error Message */}
              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Default Empty State */}
              {!aiResult && aiLogs.length === 0 && !aiError && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-3 px-4 py-12">
                  <Database className="w-8 h-8 text-slate-300" />
                  <p className="text-xs text-slate-500 max-w-sm">
                    Enter a natural language query above or select a sample question to test automated SPARQL translation,
                    Oxigraph execution, and ontological inferencing.
                  </p>
                </div>
              )}

              {/* Execution Trace Output */}
              {aiLogs.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-inner">
                  <h4 className="text-slate-400 mb-2 font-semibold text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-emerald-400" /> Execution Trace
                  </h4>
                  <div className="font-mono text-[11px] max-h-36 overflow-y-auto space-y-1 pr-2">
                    {aiLogs.map((log, i) => (
                      <div key={i} className="text-emerald-400 leading-tight opacity-90">
                        {log}
                      </div>
                    ))}
                    {isLoadingAi && (
                      <div className="text-emerald-500 animate-pulse mt-1">
                        _ computing inference & evaluating Oxigraph triplestore...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Query Results */}
              {aiResult && (
                <div className="space-y-4">
                  {/* Generated SPARQL Query with 1-click test in console */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-emerald-600" /> Generated SPARQL 1.1 Query
                      </h3>
                      <button
                        onClick={() => {
                          setRawSparql(aiResult.sparql);
                          setActiveMode("sparql");
                          setTimeout(() => handleRunDirectSparql(), 100);
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" /> Open in SPARQL Console
                      </button>
                    </div>
                    <code className="block bg-slate-900 p-3 rounded-lg border border-slate-800 text-emerald-400 font-mono text-xs whitespace-pre-wrap shadow-inner overflow-x-auto">
                      {aiResult.sparql}
                    </code>
                  </div>

                  {/* Deterministic Oxigraph SPARQL Results */}
                  {aiResult.sparqlResult?.bindings && aiResult.sparqlResult.bindings.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" /> Oxigraph Engine Results ({aiResult.sparqlResult.count} rows, {aiResult.sparqlResult.executionTimeMs} ms)
                        </h4>
                      </div>
                      <div className="overflow-x-auto max-h-48 border border-slate-800 rounded-lg">
                        {(() => {
                          const columns = getResultColumns(aiResult.sparqlResult);
                          return (
                            <table className="w-full text-left font-mono text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-950 border-b border-slate-800 text-emerald-400 text-[10px]">
                                  {columns.map((col) => (
                                    <th key={col} className="py-1.5 px-2.5 font-bold whitespace-nowrap">
                                      ?{col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 bg-slate-900 text-slate-300 text-[11px]">
                                {aiResult.sparqlResult.bindings.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-800/60">
                                    {columns.map((col) => (
                                      <td key={col} className="py-1 px-2.5 text-emerald-300 font-medium whitespace-nowrap max-w-xs truncate" title={row[col] ?? ""}>
                                        {row[col] ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Discovered Knowledge */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 shadow-xs relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
                      <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" /> Discovered Knowledge & Inferences
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Inference Complete
                      </span>
                    </div>

                    {aiResult.newKnowledge && aiResult.newKnowledge.length > 0 ? (
                      <ul className="space-y-2 mb-4">
                        {aiResult.newKnowledge.map((fact, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-xs font-medium text-emerald-950 bg-white p-3 rounded-lg border border-emerald-200/80 shadow-2xs"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="leading-relaxed">{fact}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-500 text-xs mb-4 italic">
                        No new knowledge inferred from the current triples based on this query.
                      </p>
                    )}

                    <div className="pt-3 border-t border-emerald-200/60">
                      <h4 className="text-slate-600 font-bold text-[10px] uppercase tracking-wider mb-1">
                        Reasoning Analysis
                      </h4>
                      <p className="text-slate-700 text-xs leading-relaxed">{aiResult.explanation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
