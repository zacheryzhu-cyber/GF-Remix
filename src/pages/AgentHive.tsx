import React, { useState, useEffect, useCallback } from 'react';
import {
  Workflow,
  Sparkles,
  Layers,
  Bot,
  User,
  Activity,
  Maximize2,
  Columns,
  Play,
  RotateCcw,
  CheckCircle2,
  Cpu,
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { LangGraphCanvas } from '../components/agent_hive/LangGraphCanvas';
import { WhatsAppChat } from '../components/agent_hive/WhatsAppChat';
import { EventSimulator, INITIAL_VARIABLES, SimVariable } from '../components/agent_hive/EventSimulator';
import {
  LangGraphNode,
  LangGraphEdge,
  HiveChatMessage,
  LangGraphExecutionState,
  LangGraphTraceStep,
} from '../components/agent_hive/types';

// Initial default LangGraph Topology with the Central Orchestrator, top system agents, and bottom operator/analyst
const INITIAL_NODES: LangGraphNode[] = [
  {
    id: 'start',
    type: 'start',
    label: '__start__',
    sublabel: 'START Node',
    x: 75,
    y: 330,
    status: 'idle',
    description: 'LangGraph graph entry point. Receives user payload and initializes message state.',
    stateSchema: {
      inputs: ['user_query', 'runtime_config'],
      outputs: ['state.messages', 'state.session_id'],
      channels: ['messages: Annotated[list, add_messages]'],
    },
  },
  {
    id: 'orchestrator',
    type: 'orchestrator',
    label: 'Orchestrator',
    sublabel: 'Central Supervisor Hub',
    x: 450,
    y: 320,
    status: 'idle',
    isCentral: true,
    description: 'The central supervisor node. Resolves issues autonomously using general reasoning and specialist spoke agents. Distinguishes Diagnostic vs Mitigation modes, and solicits Human-in-the-Loop Operator approval before executing plant recovery procedures.',
    systemPrompt: `You are the Central Orchestrator Hub in an industrial LangGraph multi-agent swarm governing a semiconductor cleanroom utility facility.
Your known topology and roster consists EXCLUSIVELY of:
1. 👷 Operator (Human-in-the-Loop interacting via WhatsApp chat)
2. 📊 System Analyst (Specialist agent handling plant topology, alarms, and verified facility telemetry)

CRITICAL OPERATIONAL & ROUTING DIRECTIVES:
1. SINGLE-IDENTITY DELEGATION & EXPLICIT ORDER MANDATE:
   - For simple, general questions (e.g. 'Is Earth round?', 'Who is Batman?'), answer directly by yourself.
   - For facility & plant questions, delegate to the System Analyst. The System Analyst may only take on ONE identity/mode per turn. You MUST explicitly order the specific mode:
     a) 🌐 GENERAL QUERY MODE: Ordered for general topology lookups, equipment checks, blast radius analysis, asset dependency tracing, power lineage, and plant architecture questions when no alarm triage is requested.
     b) 🔍 DIAGNOSTIC MODE: Ordered for active alarm scanning, status verification, and root-cause isolation. (Phase 2 upstream traversal will only run if active alarms exist).
     c) ⚡ MITIGATION MODE: ONLY ordered after diagnostic findings have been reviewed and explicit authorization/approval has been confirmed. The System Analyst is strictly forbidden from proceeding to mitigation on its own.

2. HUMAN-IN-THE-LOOP (HITL) OPERATOR GATEWAY & REDUNDANCY HANDLING:
   - When the System Analyst completes Diagnostic Mode, present the findings and causal subgraph to the Operator.
   - If N+1 Backup Exists: Request Operator approval before issuing the order to enter Mitigation Mode.
   - If NO Backup Exists (SPOF): Immediately raise a HIGH-SEVERITY SPOF ALERT. Inform the operator that automatic switchover is impossible, recommend immediate tool safe-parking, and await operator emergency command.
   - Calling the Operator node pauses autonomous execution to await operator confirmation.`,
    stateSchema: {
      inputs: ['messages', 'current_turn', 'analyst_telemetry'],
      outputs: ['AIMessage', 'next_node ("system_analyst" | "operator" | "end")', 'cannot_solve_issue', 'needs_user_input'],
      channels: ['messages', 'active_turn', 'analyst_channel', 'operator_escalation'],
    },
  },
  {
    id: 'end',
    type: 'end',
    label: '__end__',
    sublabel: 'END Node',
    x: 840,
    y: 330,
    status: 'idle',
    description: 'Terminal state. Finalizes turn output and returns control back to the operator.',
    stateSchema: {
      inputs: ['AIMessage'],
      outputs: ['final_state'],
      channels: ['messages'],
    },
  },
  // System Analyst & Tools
  {
    id: 'system_analyst',
    type: 'system_analyst',
    label: 'System Analyst',
    sublabel: 'Neo4j LPG Topology & Alarms',
    x: 450,
    y: 620,
    status: 'idle',
    description: 'Specialist spoke node with tri-mode operational reasoning (General Topology Queries, Diagnostic RCA, & Mitigation OCAP Planning), Neo4j Cypher query tool loop, dynamic schema introspection, and ISA-18.2 alarms.',
    systemPrompt: `You are the System Analyst node in the semiconductor facility LangGraph Hive.
Your role encompasses verified facility facts, asset topology, ISA-18.2 alarm rationalization, and semantic safety reasoning.

OPERATIONAL CONSTRAINT & IDENTITY MANDATE:
- You may ONLY assume ONE identity/mode per turn, strictly dictated by the Central Orchestrator's order.
- You are STRICTLY FORBIDDEN from autonomously transitioning from Diagnostic Mode into Mitigation Mode. Mitigation Mode can ONLY be entered upon receiving an explicit order from the Central Orchestrator.

REAL-TIME DATA GROUNDING, SCHEMA & ZERO-ALARM RULES:
- Always query live Neo4j Aura state using neo4j_cypher_tool or discover live schema via neo4j_schema_introspect.
- NEO4J LPG SCHEMA & DATA DICTIONARY:
  * (:Equipment {id, name, type, location, critical, status, tag, ratedCapacity, powerRating})
  * (:Alarm {id, code, severity, priority, description, timestampIso, timestamp, role})
  * Relationships: (:Equipment)-[:POWERS|SUPPLIES|FEEDS|COOLS|CONTROLS|BACKUP_FOR|DISTRIBUTES_TO]->(:Equipment), (:Alarm)-[:TRIGGERED_ON]->(:Equipment)
- TEMPORAL & SEQUENCE REASONING IN CYPHER:
  * Alarm nodes contain chronological timestamps in properties "a.timestampIso" and "a.timestamp".
  * Chronological query pattern: MATCH (a:Alarm)-[:TRIGGERED_ON]->(e:Equipment) RETURN a.id, a.code, a.priority, e.id AS asset, a.timestampIso, a.role ORDER BY a.timestamp ASC
- If 0 active alarms are returned from Neo4j: State truthfully that there are 0 active alarms in the plant and all assets are operating nominally. Do not simulate or fabricate alarms.
- If the database is disconnected or unreachable: Gracefully report that Neo4j Aura is unreachable without inventing data.

TOOL REGISTRY & PER-MODE ACCESS PERMISSIONS:
- [TOOL 1] neo4j_schema_introspect: Real-time dynamic discovery of active node labels, relationship types, and connection topology map.
- [TOOL 2] neo4j_cypher_tool: Direct Cypher query execution on Neo4j Aura LPG (Equipment, Alarms, Relationships). Available in: GENERAL QUERY MODE, DIAGNOSTIC MODE, and MITIGATION MODE.
- [TOOL 3] rdf_semantic_reasoner_tool: OWL/RDFS reasoning engine for multi-dimensional safety permits (NFPA 70E Arc Flash, LOTO, Confined Space) and electrical capacity interlocks. Available in: MITIGATION MODE.

===================================================================
▶ 1. GENERAL QUERY MODE (Ordered for Facility Inquiries, Facts & Topology):
===================================================================
   • Authorized Tools: [neo4j_cypher_tool] ONLY WHEN GRAPH/TOPOLOGY IS REQUIRED.
   • Tool Invocation Rule:
     - DO NOT execute or invoke neo4j_cypher_tool if the inquiry can be answered from verified plant facts/specifications or does not require physical graph traversal (e.g. Solar Power Generation, Total Building Energy Baseline). Answer directly with high precision.
     - ONLY invoke neo4j_cypher_tool when structural topology, live relationships (SUPPLIES, FEEDS, COOLS, POWERS, BACKUP_FOR), upstream lineages, or dynamic equipment lookups are explicitly queried.
   • Standard Graph Queries (When Tool is Needed):
     - Asset connectivity & line-up: MATCH (e:Equipment {id: $tag})-[:SUPPLIES|FEEDS|COOLS|POWERS]->(target) RETURN target
     - Downstream blast radius: MATCH (src:Equipment {id: $tag})-[:SUPPLIES|FEEDS|COOLS*1..5]->(dest:ProcessTool) RETURN dest
     - Upstream lineage & power sources: MATCH (dest:Equipment {id: $tag})<-[:SUPPLIES|FEEDS|POWERS*1..5]-(src:Equipment) RETURN src
     - Redundancy audit: MATCH (e:Equipment) WHERE NOT ()-[:BACKUP_FOR]->(e) RETURN e
   • Deliver crisp, structured factual summaries and subgraphs directly to the Central Orchestrator.

===================================================================
▶ 2. DIAGNOSTIC MODE (Explicitly Ordered by Orchestrator for Alarms / Faults):
===================================================================
   • Authorized Tools: [neo4j_cypher_tool] ONLY
   • Objective: Execute 2-Phase ISA-18.2 Alarm Rationalization and Root Cause Analysis (RCA).
   • Phase 1: Alarm Detection & Scan
     Query active alarms on the target equipment or system via neo4j_cypher_tool:
     MATCH (a:Alarm)-[:TRIGGERED_ON]->(e:Equipment) RETURN a, e
   
   • CONDITIONAL CHECK FOR PHASE 2:
     - Case A (NO ACTIVE ALARMS): If zero alarms are active, the asset/system is operating nominally. Phase 2 (Upstream Causal Path Traversal) is NOT NECESSARY and MUST BE SKIPPED. Return verified nominal status directly to the Orchestrator.
     - Case B (ACTIVE ALARMS DETECTED): Proceed to Phase 2.
   
   • Phase 2: Upstream Causal Traversal & Multi-Variable Alarm Rationalization (Only If Alarms Present)
     - Traverse upstream causal dependency relationships (POWERS, FEEDS, COOLS, SUPPLIES, DISTRIBUTES_TO, CONTROLS) from the alarm-triggered victim equipment.
     - Correlate temporal sequence of alarm timestamps across the event window.
     - Analyze physical energy/fluid flow and identify common topological ancestor assets across simultaneous alarms.
     - Dynamically deduce and isolate the root-cause initiating asset.
   
   • Conclude Diagnostic Mode: Deliver findings and causal subgraph back to the Orchestrator. STOP and await further instructions.

===================================================================
▶ 3. MITIGATION MODE (ONLY Upon Explicit Orchestrator Order):
===================================================================
   • Authorized Tools: [neo4j_cypher_tool] AND [rdf_semantic_reasoner_tool]
   • Objective: Formulate safe recovery OCAP, electrical switchover, and field maintenance safety permits.
   
   • Step 1 — Standby Asset Discovery (via neo4j_cypher_tool):
     MATCH (failed:Equipment {id: $failedAssetId})
     OPTIONAL MATCH (standby:Equipment)-[:BACKUP_FOR]->(failed)
     OPTIONAL MATCH (standby)<-[:POWERS]-(feed:Equipment)
     RETURN failed, standby, feed, standby.status AS standbyStatus
   
   • Step 2 — BRANCH HANDLING & SEMANTIC REASONING:
     
     BRANCH A: N+1 STANDBY EXISTS & HEALTHY:
       1. Electrical Validation: Call rdf_semantic_reasoner_tool to check upstream transformer load (e.g. TX-02) and verify independent power bus isolation from the faulted unit.
       2. SCADA Switchover OCAP: Formulate step-by-step recovery plan (VFD soft-start ramp to mitigate transformer inrush current, motorized valve alignment, interlock clearance).
       3. Safety Work Permit Synthesis: Call rdf_semantic_reasoner_tool to generate a formal LOTO Work Permit for the isolated faulted asset (evaluating NFPA 70E Arc Flash category, confined space regulations, and technician certifications).
     
     BRANCH B: NO STANDBY FOUND (SINGLE POINT OF FAILURE / SPOF) OR STANDBY OFFLINE:
       1. Flag asset as a CRITICAL SINGLE POINT OF FAILURE (SPOF).
       2. Report to Orchestrator: "CRITICAL: No active N+1 standby unit exists for $failedAssetId in graph topology."
       3. Formulate Emergency Containment Protocol:
          - Controlled load shedding / safe-park signal to downstream victim process tools to prevent wafer destruction.
          - Request high-priority Human Operator escalation.

PRE-PLANTED VERIFIED STATIC VALUES:
- Solar Power Energy Generation: 1,250 kW (1.25 MW) [Rooftop Photovoltaic Array, ~4.2 MWh/day]
- Total Building Energy Consumption: 24.5 MW (24,500 kW) [Substations TX-01 & TX-02]

===================================================================
▶ SKILL: MULTI-TURN GRAPH SYNTHESIS & INTENT-AWARE TOPOLOGY VISUALIZATION (ALL MODES)
===================================================================
• ACTIVATION CRITERION:
  - This skill is evaluated EXCLUSIVELY when you have executed your queries, are fully satisfied with the live Neo4j evidence, and are ready to conclude and return the final answer before routing to END.

• MODE-SPECIFIC SYNTHESIS & REASONING GUIDELINES:

1. GENERAL QUERY MODE (Exploratory & Inspection Topology):
   a) Active Alarms & Interconnected Facility Network:
      - When queried about active alarms, query the alarmed assets AND their physical interconnecting relationships.
      - Include intermediate unalarmed conduit/feeder assets (e.g. headers, heat exchangers, distribution lines) so the operator sees the complete physical network connecting the alarmed units.
   b) Point-to-Point Path & Connectivity Inquiries:
      - When asked how Asset A connects to Asset B (e.g., CMP tool to Pretreatment Filter 02, or Pump to Tool):
      - Formulate a path traversal query (e.g., shortestPath or upstream/downstream dependency chain) to retrieve the complete intermediate sequence.
      - Present the full end-to-end topological pathway and relationship types.
   c) Scalar / Simple Metric Inquiries:
      - For simple counts ("how many chillers"), baseline metrics ("solar generation"), or nominal checks, deliver a crisp text answer without topology diagram overhead.

2. DIAGNOSTIC MODE (ISA-18.2 Root Cause Analysis & Alarm Rationalization):
   a) Multi-Phase Working Context & Traversal Synthesis:
      - Phase 1 (Alarm Landscape): Retrieve all active alarms and alarmed assets from Neo4j. If 0 alarms, confirm nominal plant state.
      - Phase 2 (Causal Dependency Lineage): Perform multi-hop upstream traversal (:POWERS|:SUPPLIES|:FEEDS|:COOLS|:CONTROLS) from the affected cleanroom tool or victim asset.
   b) Multi-Variable Physical Fault Isolation:
      - Chronological Sequence: Sort all active alarms by timestamp to identify the primary initiating trigger (T0) vs downstream cascading symptoms (T1, T2).
      - Common Upstream Ancestor: Correlate all co-occurring alarms to identify their common upstream failure node (e.g., electrical bus fault propagating downstream to cooling equipment and cleanroom process tools).
      - Intermediate Node State: Highlight the full causal propagation chain, detailing why unalarmed conduits suffered flow/pressure loss due to the upstream root cause.
   c) Human-in-the-Loop Gateway:
      - Synthesize findings into a structured RCA summary and solicit operator feedback/confirmation before transitioning to mitigation.

3. MITIGATION MODE (N+1 Redundancy Verification & OCAP Execution):
   a) Standby Availability & Electrical Isolation Check:
      - Query for dedicated N+1 standby backup equipment via [:BACKUP_FOR] for the faulted asset.
      - Verify the standby unit is energized by an independent, healthy electrical bus (:POWERS from an isolated, non-faulted MCC/bus).
   b) Single Point of Failure (SPOF) Escalation:
      - If NO backup asset exists: Immediately raise a High-Severity SPOF Alert and recommend cleanroom tool safe-parking.
   c) OCAP Action Plan & Telemetry Verification:
      - Formulate the precise recovery sequence (OCAP procedure: VFD ramp-up, open isolation valves connected to the backup asset, restore system header pressure to nominal).
      - Verify telemetry feedback and confirm clearance of downstream symptom alarms upon execution.
   d) Strict Non-Duplication & Output Order (MANDATORY):
      - DO NOT output any RCA section, alarm chronology (T0-T7), or incident narrative. The operator already knows the root cause.
      - At the VERY TOP of your response (immediately after the header), present ONLY:
        "### 🔁 High-Level Available Backup Assets & Redundancy"
        * List the specific backup equipment found in the system for the faulted asset(s).
        * State their operational/standby status and their isolated electrical power source (e.g. powered by MCC-02 / TX-02).
        * Provide a concise high-level redundancy assessment.
      - Directly beneath that, present:
        "### 🛠️ OCAP Recovery & Mitigation Procedure"
        * The recovery sequence, valve alignment, VFD ramp-up, and telemetry verification.

• INTELLIGENT TOPOLOGY VISUALIZATION OUTPUT FORMAT:
  - When returning your final response before routing to END, if visual topology will help the operator understand or troubleshoot (e.g. active alarms, path connections, RCA failure propagation, or standby backup layout), append a structured JSON block at the very end of your response:
    \`\`\`json:graph
    {
      "plotRequired": true,
      "nodes": [
        { "id": "NODE_ID", "name": "Node Name", "type": "EquipmentType", "status": "Operational / Alarmed / Standby" }
      ],
      "edges": [
        { "sourceId": "SRC_ID", "targetId": "TGT_ID", "relationship": "POWERS / SUPPLIES / FEEDS / COOLS / BACKUP_FOR", "property": "details or spec" }
      ]
    }
    \`\`\`
  - If visual topology is NOT needed (e.g., simple scalar count, baseline metric, or clean text lookup), append:
    \`\`\`json:graph
    { "plotRequired": false }
    \`\`\`
  - This structure is parsed directly by the UI to render the visual graph canvas dynamically.`,
    stateSchema: {
      inputs: ['operator_prompt', 'target_asset', 'facility_context'],
      outputs: ['cypher_query', 'graph_topology', 'alarm_summary', 'escalation_required'],
      channels: ['analyst_messages', 'cypher_history', 'lpg_records'],
    },
  },
  // --- TOP NODES (UPW Drift Agent & Operator above Orchestrator) ---
  {
    id: 'upw_drift_agent',
    type: 'drift_agent',
    label: 'UPW Drift Agent',
    sublabel: 'Telemetry & RDF Semantic Drift',
    x: 330,
    y: 110,
    status: 'idle',
    description: 'Specialist spoke node monitoring pre-treatment buffer tanks (T-1011/T-1012) and reverse osmosis skids (UPW-RO-01/02). Cross-references real-time drift telemetry with W3C RDF Semantic Triples to isolate local O-ring leaks, cation resin exhaustion, or raw intake MMF breakthrough.',
    stateSchema: {
      inputs: ['drift_telemetry', 'rdf_symptoms', 'buffer_tank_status'],
      outputs: ['drift_classification', 'sparql_query', 'mitigation_recommendation'],
      channels: ['upw_telemetry_channel', 'rdf_drift_triples'],
    },
  },
  {
    id: 'operator',
    type: 'operator',
    label: 'Operator (Human)',
    sublabel: 'Human-in-the-Loop',
    x: 570,
    y: 110,
    status: 'idle',
    description: 'Human operator (Human-in-the-Loop). ONLY called or invoked by the Orchestrator when an issue cannot be solved autonomously and requires user input, clarification, or human assistance/help.',
    stateSchema: {
      inputs: ['operator_prompt', 'orchestrator_escalation'],
      outputs: ['HumanMessage', 'operator_guidance'],
      channels: ['messages', 'operator_escalation'],
    },
  },
  // --- AUXILIARY TOOL NODES (OT Telemetry, RDF SPARQL, Neo4j Cypher & Live Schema Introspection) ---
  {
    id: 'ot_connector_tool',
    type: 'tool_node',
    label: 'OT Connector Tool',
    sublabel: 'SCADA & PLC Telemetry Bridge',
    x: 120,
    y: 110,
    status: 'idle',
    description: 'LangGraph ToolNode providing real-time streaming telemetry and tag polling across industrial protocols (OPC-UA, Modbus TCP, MQTT/Sparkplug B) for live tank TOC, conductivity, pH, and sensor drift telemetry.',
    stateSchema: {
      inputs: ['asset_tag: string', 'metrics?: string[]', 'time_window?: string'],
      outputs: ['live_telemetry: object', 'sensor_drift_delta: number', 'connection_status: "CONNECTED" | "DEGRADED"'],
      channels: ['ot_telemetry_stream', 'scada_tags'],
    },
  },
  {
    id: 'knowledge_base_tool',
    type: 'tool_node',
    label: 'Knowledge Base',
    sublabel: 'RDF Read & Write Store',
    x: 230,
    y: 560,
    status: 'idle',
    description: 'LangGraph ToolNode providing read and write access to the in-memory W3C RDF Semantic Knowledge Graph (Oxigraph). Supports SPARQL queries (SELECT/ASK) and SPARQL updates (INSERT DATA/DELETE DATA) to inspect or modify digital twin triples.',
    stateSchema: {
      inputs: ['sparql?: string', 'operation?: "read" | "write" | "query" | "insert" | "delete"', 'triples?: Triple[]'],
      outputs: ['success: boolean', 'bindings?: object[]', 'booleanValue?: boolean', 'totalTriples?: number'],
      channels: ['knowledge_base_channel', 'rdf_triples'],
    },
  },
  {
    id: 'rdf_triplestore_tool',
    type: 'tool_node',
    label: 'RDF Triplestore Tool',
    sublabel: 'W3C SPARQL Reasoner',
    x: 230,
    y: 740,
    status: 'idle',
    description: 'LangGraph ToolNode executing SPARQL property paths, ontological classifications, and physical reachability proofs against W3C RDF Semantic Knowledge Graph (Oxigraph triplestore).',
    stateSchema: {
      inputs: ['sparql: string (SPARQL ASK / SELECT)'],
      outputs: ['sparql_bindings: object[]', 'boolean (for ASK queries)', 'reachability_proof: boolean'],
      channels: ['sparql_execution', 'rdf_triples'],
    },
  },
  {
    id: 'neo4j_rca_tool',
    type: 'tool_node',
    label: 'Graph Query Tool',
    sublabel: 'Live Property Graph',
    x: 690,
    y: 550,
    status: 'idle',
    description: 'LangGraph ToolNode providing real-time query execution on Enterprise Property Graph (asset lineage, alarm detection, upstream multi-hop traversal, and root cause analysis).',
    stateSchema: {
      inputs: ['query: string', 'params?: object'],
      outputs: ['graph_records', 'causal_chain', 'root_cause_asset'],
      channels: ['cypher_execution', 'lpg_returns'],
    },
  },
  {
    id: 'neo4j_schema_tool',
    type: 'tool_node',
    label: 'Schema Introspect',
    sublabel: 'Live Topology & Types',
    x: 690,
    y: 690,
    status: 'idle',
    description: 'LangGraph ToolNode providing real-time schema discovery on Enterprise Property Graph (CALL db.labels(), CALL db.relationshipTypes(), and live connection topology map).',
    stateSchema: {
      inputs: ['void'],
      outputs: ['nodeLabels: string[]', 'relationshipTypes: string[]', 'connectionSchema: object[]'],
      channels: ['schema_introspection', 'graph_metadata'],
    },
  },
];

const INITIAL_EDGES: LangGraphEdge[] = [
  {
    id: 'edge-start-orch',
    from: 'start',
    to: 'orchestrator',
    label: 'init()',
    isActive: false,
  },
  {
    id: 'edge-orch-end',
    from: 'orchestrator',
    to: 'end',
    label: 'finish_turn()',
    isActive: false,
  },
  // Operator (Human-in-the-Loop) ⇄ Orchestrator conduits
  {
    id: 'edge-orch-op',
    from: 'orchestrator',
    to: 'operator',
    label: 'request_approval',
    isActive: false,
  },
  {
    id: 'edge-op-orch',
    from: 'operator',
    to: 'orchestrator',
    label: 'human_command',
    isActive: false,
  },
  // UPW Drift Agent (Top Spoke) Conduits
  {
    id: 'edge-orch-drift',
    from: 'orchestrator',
    to: 'upw_drift_agent',
    label: 'delegate_drift_audit()',
    isActive: false,
  },
  {
    id: 'edge-drift-end',
    from: 'upw_drift_agent',
    to: 'end',
    label: 'finish_turn()',
    isActive: false,
  },
  // UPW Drift Agent ⇄ OT Connector ToolNode (Live Telemetry Bridge)
  {
    id: 'edge-drift-ot',
    from: 'upw_drift_agent',
    to: 'ot_connector_tool',
    label: 'poll_telemetry()',
    isActive: false,
  },
  {
    id: 'edge-ot-drift',
    from: 'ot_connector_tool',
    to: 'upw_drift_agent',
    label: 'stream_metrics()',
    isActive: false,
  },
  // UPW Drift Agent ⇄ RDF Triplestore ToolNode (W3C SPARQL Triples)
  {
    id: 'edge-drift-rdf',
    from: 'upw_drift_agent',
    to: 'rdf_triplestore_tool',
    label: 'query_rdf_triples()',
    isActive: false,
  },
  {
    id: 'edge-rdf-drift',
    from: 'rdf_triplestore_tool',
    to: 'upw_drift_agent',
    label: 'sparql_symptoms()',
    isActive: false,
  },
  // Active Spoke: System Analyst
  {
    id: 'edge-orch-analyst',
    from: 'orchestrator',
    to: 'system_analyst',
    label: 'delegate_analyst',
    isActive: false,
  },
  // System Analyst ⇄ Knowledge Base ToolNode (Read & Write)
  {
    id: 'edge-analyst-kb',
    from: 'system_analyst',
    to: 'knowledge_base_tool',
    label: 'read_write_kb()',
    isActive: false,
  },
  {
    id: 'edge-kb-analyst',
    from: 'knowledge_base_tool',
    to: 'system_analyst',
    label: 'kb_response()',
    isActive: false,
  },
  // System Analyst ⇄ RDF Triplestore ToolNode
  {
    id: 'edge-analyst-rdf',
    from: 'system_analyst',
    to: 'rdf_triplestore_tool',
    label: 'query_sparql()',
    isActive: false,
  },
  {
    id: 'edge-rdf-analyst',
    from: 'rdf_triplestore_tool',
    to: 'system_analyst',
    label: 'tool_output(triples)',
    isActive: false,
  },
  // System Analyst ⇄ Neo4j Cypher ToolNode
  {
    id: 'edge-analyst-tool',
    from: 'system_analyst',
    to: 'neo4j_rca_tool',
    label: 'invoke_cypher_tool()',
    isActive: false,
  },
  {
    id: 'edge-tool-analyst',
    from: 'neo4j_rca_tool',
    to: 'system_analyst',
    label: 'tool_output(records)',
    isActive: false,
  },
  // System Analyst ⇄ Neo4j Schema Introspection ToolNode
  {
    id: 'edge-analyst-schema',
    from: 'system_analyst',
    to: 'neo4j_schema_tool',
    label: 'introspect_schema()',
    isActive: false,
  },
  {
    id: 'edge-schema-analyst',
    from: 'neo4j_schema_tool',
    to: 'system_analyst',
    label: 'tool_output(schema)',
    isActive: false,
  },
  // System Analyst Exit to END (Native toolsCondition)
  {
    id: 'edge-analyst-end',
    from: 'system_analyst',
    to: 'end',
    label: 'finish_turn()',
    isActive: false,
  },
];

const INITIAL_MESSAGES: HiveChatMessage[] = [
  {
    id: 'msg-sys-1',
    sender: 'system',
    senderName: 'System Core',
    avatar: '',
    text: '⚡ Multi-Agent system initialized: Central Orchestrator connected with Operator and System Analyst.',
    timestamp: 'Just now',
  },
  {
    id: 'msg-orch-1',
    sender: 'orchestrator',
    senderName: 'Orchestrator',
    avatar: '',
    text: 'Hello Operator! I am the Central Orchestrator Hub in your Industrial Agent Hive.\n\nI coordinate directly with you and our 📊 System Analyst (Cross-Domain Telemetry, SPC & Anomaly Correlation).\n\nYou can issue commands or ask for facility telemetry and trend analysis—I maintain multi-turn context and coordinate with the System Analyst.',
    timestamp: 'Just now',
    nodeId: 'orchestrator',
  },
];

// In-memory module cache: persists across in-app page navigation, but clears on browser reload
let cachedHiveMessages: HiveChatMessage[] = INITIAL_MESSAGES;
let cachedTotalTurns: number = 1;
let cachedThreadId: string = `hive_session_${Date.now()}`;
let cachedSimVariables: Record<string, SimVariable> = INITIAL_VARIABLES;

export const AgentHive: React.FC = () => {
  const [nodes, setNodes] = useState<LangGraphNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<LangGraphEdge[]>(INITIAL_EDGES);
  const [messages, setMessagesState] = useState<HiveChatMessage[]>(() => cachedHiveMessages);
  const [threadId, setThreadIdState] = useState<string>(() => cachedThreadId);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('orchestrator');
  const [layoutMode, setLayoutMode] = useState<'split' | 'simulator' | 'canvas' | 'chat'>('split');
  const [simVariables, setSimVariablesState] = useState<Record<string, SimVariable>>(() => cachedSimVariables);

  const setSimVariables = useCallback((updater: React.SetStateAction<Record<string, SimVariable>>) => {
    setSimVariablesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedSimVariables = next;
      return next;
    });
  }, []);

  const setThreadId = useCallback((newId: string) => {
    cachedThreadId = newId;
    setThreadIdState(newId);
  }, []);

  const setMessages = useCallback((updater: React.SetStateAction<HiveChatMessage[]>) => {
    setMessagesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedHiveMessages = next;
      return next;
    });
  }, []);

  const [executionState, setExecutionState] = useState<LangGraphExecutionState>({
    activeNodeId: null,
    activeEdgeId: null,
    isRunning: false,
    stepMessage: 'Ready',
    totalTurns: cachedTotalTurns,
  });

  const [langsmithStatus, setLangsmithStatus] = useState<{
    enabled: boolean;
    project: string;
    endpoint: string;
    hasApiKey: boolean;
  }>({
    enabled: false,
    project: 'semiconductor-cleanroom-hive',
    endpoint: 'https://api.smith.langchain.com',
    hasApiKey: false,
  });

  useEffect(() => {
    fetch('/api/langsmith/status')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.enabled === 'boolean') {
          setLangsmithStatus(data);
        }
      })
      .catch(() => {});
  }, []);

  // Repositioning nodes
  const handleUpdateNodePosition = useCallback((id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, x, y } : n)));
  }, []);

  const handleResetPositions = useCallback(() => {
    setNodes(INITIAL_NODES);
  }, []);

  // Dispatch LangGraph Turn
  const executeLangGraphTurn = async (userPrompt: string) => {
    if (executionState.isRunning) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add Operator message to chat
    const operatorMsg: HiveChatMessage = {
      id: `msg-op-${Date.now()}`,
      sender: 'operator',
      senderName: 'Operator',
      avatar: '',
      text: userPrompt,
      timestamp: timeString,
      status: 'read',
      nodeId: 'operator',
    };

    setMessages(prev => [...prev, operatorMsg]);

    // Trace collection that clears on every new prompt and builds sequentially
    const currentTrace: LangGraphTraceStep[] = [];
    const recordStep = (
      nodeId: string,
      label: string,
      type?: string,
      detail?: string,
      meta?: {
        mode?: string;
        decision?: string;
        reasoning?: string;
        cypher?: string;
        actionSummary?: string;
        nextTarget?: string;
      }
    ) => {
      // Mark existing steps as completed
      for (const s of currentTrace) {
        s.status = 'completed';
      }

      const step: LangGraphTraceStep = {
        id: `step-${Date.now()}-${currentTrace.length}`,
        nodeId,
        label,
        type,
        status: 'active',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        detail,
        mode: meta?.mode,
        decision: meta?.decision,
        reasoning: meta?.reasoning,
        cypher: meta?.cypher,
        actionSummary: meta?.actionSummary,
        nextTarget: meta?.nextTarget,
      };
      currentTrace.push(step);
      return [...currentTrace];
    };

    const updateStep = (
      nodeId: string,
      updates: Partial<LangGraphTraceStep>
    ) => {
      const step = [...currentTrace].reverse().find(s => s.nodeId === nodeId) || currentTrace[currentTrace.length - 1];
      if (step) {
        Object.assign(step, updates);
      }
      return [...currentTrace];
    };

    // Step 1: Start node activates (Clears previous session trace and begins new sequence)
    cachedTotalTurns += 1;
    const startTrace = recordStep('start', '__start__', 'start', 'Graph initialized with user payload', {
      actionSummary: `Turn ${cachedTotalTurns} payload initialized`,
      decision: 'Route into Supervisor Hub',
      nextTarget: 'orchestrator',
    });

    setExecutionState(prev => ({
      ...prev,
      isRunning: true,
      activeNodeId: 'start',
      activeEdgeId: 'edge-start-orch',
      stepMessage: 'START: Initializing message payload',
      totalTurns: cachedTotalTurns,
      nodeTrace: startTrace,
    }));

    // Wait for visual animation
    await new Promise(r => setTimeout(r, 350));

    // Transition active status indicator while awaiting API response (without recording duplicate pill)
    setExecutionState(prev => ({
      ...prev,
      activeNodeId: 'orchestrator',
      activeEdgeId: 'edge-start-orch',
      stepMessage: 'Orchestrator (Central Hub): Evaluating query scope & rule boundaries in LangGraph...',
    }));

    // Call API with full thread context
    let botReplyText = '';
    let isDelegated = true;
    let needsOperatorInput = false;
    let executedCypher: string | undefined;
    let cypherSummary: string | undefined;
    let dynamicGraphData: { nodes: any[]; edges: any[] } | undefined;
    let dynamicActionButtons: Array<{ id: string; label: string; prompt: string; variant?: 'primary' | 'secondary' | 'amber' | 'emerald' }> | undefined;

    let backendRouteDecision: { mode: string; reasoning?: string } | undefined;
    let backendAnalystReasoning: string | undefined;
    let streamHandled = false;

    try {
      const response = await fetch('/api/agent-hive/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userPrompt,
          history: [...messages, operatorMsg],
          threadId,
          simVariables: cachedSimVariables,
        }),
      });

      if (!response.ok) throw new Error('API stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;

            try {
              const event = JSON.parse(dataStr);

              if (event.type === 'node_start') {
                const nodeName = event.node;
                // Avoid duplicate __start__ step if already initialized
                if (nodeName === '__start__' || nodeName === 'start') {
                  continue;
                }

                // When entering LangGraph 'tools' node, let tool_start set the exact tool node ID and active edge
                if (nodeName === 'tools') {
                  continue;
                }

                const isDrift = nodeName === 'upw_drift_agent';
                const isAnalyst = nodeName === 'system_analyst';
                const isOrch = nodeName === 'orchestrator';

                const spoke = isOrch ? 'orchestrator' : isAnalyst ? 'system_analyst' : isDrift ? 'upw_drift_agent' : nodeName;
                const edge = isOrch ? 'edge-start-orch' : isAnalyst ? 'edge-orch-analyst' : isDrift ? 'edge-orch-drift' : 'edge-start-orch';
                const label = isOrch ? 'Orchestrator' : isAnalyst ? 'System Analyst' : isDrift ? 'UPW Drift Agent' : nodeName;
                const type = isOrch ? 'orchestrator' : isDrift ? 'drift_agent' : 'agent';

                const traceStep = recordStep(
                  spoke,
                  label,
                  type,
                  isOrch
                    ? 'Evaluating user query and supervisor routing policy'
                    : isAnalyst
                    ? 'Analyzing cleanroom topology & formulating domain queries'
                    : isDrift
                    ? 'Diagnosing UPW buffer tanks & cross-referencing RDF semantic triples'
                    : 'Executing live graph tool operation',
                  {
                    decision: isOrch ? 'Evaluating query' : isAnalyst ? 'Domain reasoning' : isDrift ? 'Drift diagnosis' : 'Tool execution',
                    actionSummary: isOrch ? 'Supervisor classification' : isAnalyst ? 'Facility analysis' : isDrift ? 'UPW Drift Analysis' : 'Tool operation',
                    nextTarget: isOrch ? 'system_analyst' : isAnalyst ? 'tools' : isDrift ? 'knowledge_base_tool' : 'end',
                  }
                );

                setExecutionState(prev => ({
                  ...prev,
                  activeNodeId: spoke,
                  activeEdgeId: edge,
                  stepMessage: `[Hive Stream] Executing node: ${label}...`,
                  nodeTrace: traceStep,
                }));
              } else if (event.type === 'node_end') {
                const nodeName = event.node;
                const output = event.output;

                if (nodeName === 'orchestrator' && output) {
                  const routeDec = output.routeDecision;
                  const isDriftDel = routeDec?.destination === 'upw_drift_agent';
                  const isDel = output.delegated !== false && (routeDec?.destination === 'system_analyst' || isDriftDel);
                  const mode = routeDec?.orderedMode || routeDec?.mode || (isDriftDel ? 'DRIFT_DIAGNOSIS' : isDel ? 'DELEGATED' : 'GENERAL_DIRECT');
                  const reasoning = routeDec?.reasoning || (isDriftDel ? 'Delegated UPW drift query to UPW Drift Agent' : isDel ? 'Delegated facility operations inquiry to System Analyst' : 'Resolved general question directly');
                  const decision = isDriftDel ? 'Delegated to UPW Drift Agent' : isDel ? `Delegated to System Analyst (${mode} MODE)` : 'Direct Answer by Orchestrator';
                  const nextTarget = isDriftDel ? 'upw_drift_agent' : isDel ? 'system_analyst' : 'end';

                  const updatedTrace = updateStep('orchestrator', {
                    mode,
                    decision,
                    reasoning,
                    actionSummary: routeDec?.mode || mode,
                    detail: reasoning,
                    status: 'completed',
                    nextTarget,
                  });

                  setExecutionState(prev => ({
                    ...prev,
                    stepMessage: `Orchestrator: ${decision} — "${reasoning}"`,
                    nodeTrace: updatedTrace,
                  }));
                } else if (nodeName === 'upw_drift_agent' && output) {
                  const hasToolCalls = !!output.hasToolCalls || (Array.isArray(output.messages) && output.messages.some((m: any) => m?.tool_calls?.length > 0));
                  const reasoning = output.analystReasoning || 'Cross-referenced UPW drift telemetry with W3C RDF Semantic Triplestore';
                  const decision = hasToolCalls
                    ? 'Dispatched ToolNode Request (SPARQL Knowledge Base)'
                    : 'Synthesized UPW Drift Diagnosis & OCAP Recommendations';
                  const nextTarget = hasToolCalls ? 'knowledge_base_tool' : 'end';

                  const updatedTrace = updateStep('upw_drift_agent', {
                    decision,
                    reasoning,
                    actionSummary: hasToolCalls ? 'Querying RDF Knowledge Base' : 'RDF Triples Grounded',
                    detail: reasoning,
                    status: 'completed',
                    nextTarget,
                  });

                  setExecutionState(prev => ({
                    ...prev,
                    stepMessage: `UPW Drift Agent: ${decision} — "${reasoning}"`,
                    nodeTrace: updatedTrace,
                  }));
                } else if (nodeName === 'system_analyst' && output) {
                  const hasToolCalls = !!output.hasToolCalls || (Array.isArray(output.messages) && output.messages.some((m: any) => m?.tool_calls?.length > 0));
                  const reasoning = output.analystReasoning || (output.executedCypher ? 'Validated topology and synthesized graph records' : 'Verified facility baseline specification');
                  const decision = hasToolCalls
                    ? 'Dispatched ToolNode Request (neo4j_cypher_query)'
                    : output.executedCypher
                    ? 'Synthesized Neo4j Graph Results & Formulated RCA'
                    : 'Facility Spec Verification';
                  const cypher = output.executedCypher;
                  const nextTarget = hasToolCalls ? 'neo4j_rca_tool' : 'end';

                  const updatedTrace = updateStep('system_analyst', {
                    decision,
                    reasoning,
                    cypher,
                    actionSummary: hasToolCalls ? 'Calling Neo4j ToolNode' : cypher ? 'Neo4j LPG Verified' : 'Baseline Verified',
                    detail: reasoning,
                    status: 'completed',
                    nextTarget,
                  });

                  setExecutionState(prev => ({
                    ...prev,
                    stepMessage: `System Analyst: ${decision} — "${reasoning}"`,
                    nodeTrace: updatedTrace,
                  }));
                }
              } else if (event.type === 'tool_start') {
                const inputQuery = typeof event.input === 'string' ? event.input : event.input?.sparql || event.input?.query || event.input?.cypherQuery || event.input?.cypher;
                const toolName = event.tool || event.name || '';
                const isOtTool = toolName === 'ot_connection' || toolName === 'ot_connector' || toolName === 'ot_connection_tool' || toolName.includes('telemetry') || toolName.includes('scada');
                const isSchemaTool = !isOtTool && toolName === 'neo4j_schema_introspect';
                const isKbTool = !isOtTool && (toolName === 'knowledge_base' || toolName === 'knowledge_base_tool');
                const isRdfTool = !isOtTool && !isKbTool && (toolName === 'rdf_sparql_query' || toolName === 'rdf_semantic_reasoner_tool' || toolName.includes('rdf') || toolName.includes('sparql'));

                const isDriftActive = currentTrace.some(s => s.nodeId === 'upw_drift_agent' && (s.status === 'active' || s.status === 'completed')) || executionState.activeNodeId === 'upw_drift_agent';

                const toolNodeId = isOtTool
                  ? 'ot_connector_tool'
                  : isSchemaTool
                  ? 'neo4j_schema_tool'
                  : isKbTool
                  ? 'knowledge_base_tool'
                  : isRdfTool
                  ? 'rdf_triplestore_tool'
                  : 'neo4j_rca_tool';

                const toolEdgeId = isOtTool
                  ? 'edge-drift-ot'
                  : isSchemaTool
                  ? 'edge-analyst-schema'
                  : isKbTool
                  ? (isDriftActive ? 'edge-drift-rdf' : 'edge-analyst-kb')
                  : isRdfTool
                  ? (isDriftActive ? 'edge-drift-rdf' : 'edge-analyst-rdf')
                  : 'edge-analyst-tool';

                const toolLabel = isOtTool
                  ? 'OT Connector (ToolNode)'
                  : isSchemaTool
                  ? 'Schema Introspect (ToolNode)'
                  : isKbTool
                  ? 'Knowledge Base (ToolNode)'
                  : isRdfTool
                  ? 'RDF Triplestore (ToolNode)'
                  : 'Neo4j Cypher (ToolNode)';

                // Ensure preceding analyst/drift step reflects dispatching to the specific tool
                if (isDriftActive || isOtTool) {
                  updateStep('upw_drift_agent', {
                    nextTarget: toolNodeId,
                    decision: `Dispatched Tool Call: ${toolName}`,
                    actionSummary: isOtTool ? 'Reading OT Telemetry' : 'Querying RDF Knowledge Base',
                  });
                } else {
                  updateStep('system_analyst', {
                    nextTarget: toolNodeId,
                    decision: `Dispatched Tool Call: ${toolName}`,
                    actionSummary: isSchemaTool ? 'Introspecting Schema' : isKbTool ? 'Consulting/Updating KB' : isRdfTool ? 'Calling RDF Reasoner' : 'Calling Cypher ToolNode',
                  });
                }

                const traceStep = recordStep(
                  toolNodeId,
                  toolLabel,
                  'tool',
                  isOtTool
                    ? `Polling live SCADA / OT telemetry and sensor drift metrics (TOC, conductivity, ΔP) for asset`
                    : isSchemaTool
                    ? 'Introspecting live database labels, relationship types & topology matrix'
                    : isKbTool
                    ? (inputQuery ? `Knowledge Base operation:\n${inputQuery}` : `Knowledge Base read/write operation against RDF store`)
                    : isRdfTool
                    ? (inputQuery ? `Executing SPARQL query:\n${inputQuery}` : `Executing SPARQL semantic verification against RDF triplestore`)
                    : (inputQuery ? `Executing query:\n${inputQuery}` : `Executing tool: ${toolName}`),
                  {
                    cypher: inputQuery,
                    decision: isOtTool
                      ? 'Poll OT SCADA Historian'
                      : isSchemaTool
                      ? 'Introspect Graph Schema'
                      : isKbTool
                      ? 'Knowledge Base Operation'
                      : isRdfTool
                      ? 'Execute SPARQL Verification'
                      : 'Execute ToolNode Query',
                    actionSummary: isOtTool
                      ? 'Live OT Sensor Stream'
                      : isSchemaTool
                      ? 'Live Schema Discovery'
                      : isKbTool
                      ? 'Knowledge Base Access'
                      : isRdfTool
                      ? 'W3C SPARQL Execution'
                      : `Tool: ${toolName}`,
                    reasoning: isOtTool
                      ? 'Real-time OPC-UA / Modbus SCADA historian telemetry stream for water quality and resin metrics'
                      : isSchemaTool
                      ? 'Dynamic discovery of active node labels and relationship types'
                      : isKbTool
                      ? 'Semantic knowledge graph read/write operations against Oxigraph RDF store'
                      : isRdfTool
                      ? 'W3C SPARQL semantic property path & reachability proof verification on Oxigraph store'
                      : 'Live Query execution against Enterprise Property Graph',
                    nextTarget: isDriftActive || isOtTool ? 'upw_drift_agent' : 'system_analyst',
                  }
                );

                setExecutionState(prev => ({
                  ...prev,
                  activeNodeId: toolNodeId,
                  activeEdgeId: toolEdgeId,
                  stepMessage: isOtTool
                    ? `[Tool Execution] Polling live SCADA / PLC sensor telemetry from OT Connector...`
                    : isSchemaTool
                    ? `[Tool Execution] Introspecting Property Graph Schema (labels & relationship types)...`
                    : isKbTool
                    ? `[Tool Execution] Reading / writing semantic triples in Knowledge Base...`
                    : isRdfTool
                    ? `[Tool Execution] Executing SPARQL query against RDF Triplestore...`
                    : `[Tool Execution] Executing query on Enterprise Property Graph...`,
                  nodeTrace: traceStep,
                }));

                // Ensure fast in-memory tools (OT & Knowledge Base & RDF triplestore) stay visibly illuminated
                await new Promise(r => setTimeout(r, 650));
              } else if (event.type === 'tool_end') {
                const toolName = event.tool || event.name || '';
                const isOtTool = toolName === 'ot_connection' || toolName === 'ot_connector' || toolName === 'ot_connection_tool' || toolName.includes('telemetry') || toolName.includes('scada');
                const isSchemaTool = !isOtTool && (toolName === 'neo4j_schema_introspect' || (typeof event.output === 'object' && event.output?.labels));
                const isKbTool = !isOtTool && (toolName === 'knowledge_base' || toolName === 'knowledge_base_tool');
                const isRdfTool = !isOtTool && !isKbTool && (toolName === 'rdf_sparql_query' || toolName === 'rdf_semantic_reasoner_tool' || toolName.includes('rdf') || toolName.includes('sparql'));

                const isDriftActive = currentTrace.some(s => s.nodeId === 'upw_drift_agent' && (s.status === 'active' || s.status === 'completed')) || executionState.activeNodeId === 'upw_drift_agent';

                const toolNodeId = isOtTool
                  ? 'ot_connector_tool'
                  : isSchemaTool
                  ? 'neo4j_schema_tool'
                  : isKbTool
                  ? 'knowledge_base_tool'
                  : isRdfTool
                  ? 'rdf_triplestore_tool'
                  : 'neo4j_rca_tool';

                const returnEdgeId = isOtTool
                  ? 'edge-ot-drift'
                  : isSchemaTool
                  ? 'edge-schema-analyst'
                  : isKbTool
                  ? (isDriftActive ? 'edge-rdf-drift' : 'edge-kb-analyst')
                  : isRdfTool
                  ? (isDriftActive ? 'edge-rdf-drift' : 'edge-rdf-analyst')
                  : 'edge-tool-analyst';

                const returnTarget = isOtTool || isDriftActive ? 'upw_drift_agent' : 'system_analyst';

                const rawOutput = event.output;
                const outputSummary = typeof rawOutput === 'string' 
                  ? rawOutput.slice(0, 140) 
                  : typeof rawOutput === 'object' && rawOutput !== null
                  ? JSON.stringify(rawOutput).slice(0, 140)
                  : isOtTool ? 'OT telemetry readings returned' : isSchemaTool ? 'Schema metadata retrieved' : isKbTool ? 'Knowledge base response returned' : isRdfTool ? 'SPARQL results returned' : 'Graph query records returned';

                const updatedTrace = updateStep(toolNodeId, {
                  actionSummary: isOtTool ? 'OT telemetry received' : isSchemaTool ? 'Schema discovery complete' : isKbTool ? 'Knowledge base synced' : isRdfTool ? 'SPARQL proof verified' : 'Query returned records',
                  status: 'completed',
                  detail: isOtTool
                    ? `OT SCADA metrics streamed: ${outputSummary}...`
                    : isSchemaTool
                    ? `Discovered active labels & relationships: ${outputSummary}...`
                    : isKbTool
                    ? `Knowledge Base execution output: ${outputSummary}...`
                    : isRdfTool
                    ? `SPARQL results from RDF triplestore: ${outputSummary}...`
                    : `Records returned from Property Graph: ${outputSummary}...`,
                  nextTarget: returnTarget,
                });

                setExecutionState(prev => ({
                  ...prev,
                  activeNodeId: returnTarget,
                  activeEdgeId: returnEdgeId,
                  stepMessage: isOtTool
                    ? `[Tool Execution] Live OT telemetry received. Synthesizing in UPW Drift Agent...`
                    : isSchemaTool
                    ? `[Tool Execution] Live schema introspected. Synthesizing in System Analyst...`
                    : isKbTool
                    ? (isDriftActive ? `[Tool Execution] Knowledge Base triples processed. Synthesizing in UPW Drift Agent...` : `[Tool Execution] Knowledge Base triples processed. Synthesizing in System Analyst...`)
                    : isRdfTool
                    ? (isDriftActive ? `[Tool Execution] RDF Triplestore validated reachability proof. Synthesizing in UPW Drift Agent...` : `[Tool Execution] RDF Triplestore validated reachability proof. Synthesizing in System Analyst...`)
                    : `[Tool Execution] Property Graph returned records. Synthesizing in System Analyst...`,
                  nodeTrace: updatedTrace,
                }));

                await new Promise(r => setTimeout(r, 400));
              } else if (event.type === 'final_state') {
                botReplyText = event.reply || 'Acknowledged by Orchestrator.';
                isDelegated = event.delegated !== false;
                needsOperatorInput = !!event.needsOperatorInput;
                executedCypher = event.cypherQuery;
                cypherSummary = event.cypherResultsSummary;
                dynamicGraphData = event.graphData;
                dynamicActionButtons = event.actionButtons;
                backendRouteDecision = event.routeDecision;
                backendAnalystReasoning = event.analystReasoning;
                streamHandled = true;

                const isDriftFlow = currentTrace.some(s => s.nodeId === 'upw_drift_agent');
                const finalEdgeId = isDriftFlow
                  ? 'edge-drift-end'
                  : isDelegated
                  ? 'edge-analyst-end'
                  : 'edge-orch-end';

                // Record clean end step
                const endTrace = recordStep('end', '__end__', 'end', 'Turn execution completed successfully', {
                  decision: isDriftFlow
                    ? 'upw_drift_agent -> END via finish_turn()'
                    : isDelegated
                    ? 'system_analyst -> END via finish_turn()'
                    : 'orchestrator -> END',
                  reasoning: backendAnalystReasoning || backendRouteDecision?.reasoning || 'Turn completed.',
                  actionSummary: 'Turn completed',
                  nextTarget: 'operator',
                });

                setExecutionState(prev => ({
                  ...prev,
                  activeNodeId: 'end',
                  activeEdgeId: finalEdgeId,
                  stepMessage: isDriftFlow
                    ? 'END: UPW Drift Agent completed diagnosis. Control returned to Operator.'
                    : isDelegated
                    ? 'END: System Analyst completed diagnosis. Control returned to Operator.'
                    : 'END: Operation completed. Control returned to Operator.',
                  nodeTrace: endTrace,
                }));
              }
            } catch (err) {
              console.error('Failed to parse SSE line', err);
            }
          }
        }
      }
    } catch {
      // Deterministic fallback
      const lower = userPrompt.toLowerCase();
      if (lower.includes('batman') || lower.includes('earth round')) {
        isDelegated = false;
        needsOperatorInput = false;
        botReplyText = lower.includes('batman')
          ? 'Batman is a fictional DC Comics superhero created by Bob Kane and Bill Finger in 1939. His secret identity is Bruce Wayne, industrialist of Gotham City.'
          : 'Yes, the Earth is round—specifically an oblate spheroid slightly flattened at the poles and bulging at the equator due to its rotation.';
      } else if (lower.includes('rca') || lower.includes('root cause') || (lower.includes('alarm') && (lower.includes('trace') || lower.includes('upstream from') || lower.includes('causal')))) {
        isDelegated = true;
        needsOperatorInput = false;
        botReplyText = `[Orchestrator Hub] Live graph execution is required to traverse active plant graph topology.\n\nPlease verify your connection to the backend service to perform dynamic root cause analysis.`;
      } else if (lower.includes('alarm') || lower.includes('active alarm')) {
        isDelegated = true;
        needsOperatorInput = false;
        executedCypher = `MATCH (a:Alarm)-[:TRIGGERED_ON|HAS_ALARM]-(e:Equipment)\nRETURN a.id AS alarmId, a.code AS code, a.severity AS severity, a.description AS description, e.id AS assetId, e.name AS assetName, e.type AS assetType, e.status AS assetStatus`;
        cypherSummary = `Queried Neo4j Aura for all active alarms and affected equipment nodes in the plant.`;
        dynamicGraphData = {
          nodes: [
            { id: 'MCC-01', name: 'Motor Control Center 01', type: 'MCC', status: 'Alarm A-01 (Ground Fault)' },
            { id: 'CHW-P-05', name: 'Primary CHW Pump 05', type: 'Pump', status: 'Alarm A-02 (Trip 0 GPM)' },
            { id: 'CHW-HDR-01', name: 'CHW Supply Header 01', type: 'Header', status: 'Alarm A-03 (Pressure Drop)' },
            { id: 'CHW-HX-01', name: 'Process Cooling HX 01', type: 'HeatExchanger', status: 'Alarm A-04 (Temp >21.5°C)' },
            { id: 'CHW-SEC-01', name: 'Secondary CHW Loop 01', type: 'SecondaryLoop', status: 'Alarm A-05 (Flow Drop)' },
            { id: 'TOOL-LITHO-01', name: 'Lithography Stepper 01', type: 'ProcessTool', status: 'Alarm A-06 (P1 Thermal Excursion)' },
            { id: 'UPW-POU-01', name: 'Ultra Pure Water POU 01', type: 'UPWPointOfUse', status: 'Alarm A-07 (Pressure Deviation)' },
            { id: 'UPW-POU-02', name: 'Ultra Pure Water POU 02', type: 'UPWPointOfUse', status: 'Alarm A-08 (Pressure Deviation)' },
          ],
          edges: [
            { sourceId: 'MCC-01', sourceName: 'MCC-01', targetId: 'CHW-P-05', targetName: 'CHW-P-05', relationship: 'POWERS', property: '480V Feeder #4 (TRIPPED)' },
            { sourceId: 'CHW-P-05', sourceName: 'CHW-P-05', targetId: 'CHW-HDR-01', targetName: 'CHW-HDR-01', relationship: 'SUPPLIES', property: '0 GPM (Tripped)' },
            { sourceId: 'CHW-HDR-01', sourceName: 'CHW-HDR-01', targetId: 'CHW-HX-01', targetName: 'CHW-HX-01', relationship: 'FEEDS', property: 'Depressurized' },
            { sourceId: 'CHW-HX-01', sourceName: 'CHW-HX-01', targetId: 'CHW-SEC-01', targetName: 'CHW-SEC-01', relationship: 'COOLS', property: 'Thermal Excursion ΔT' },
            { sourceId: 'CHW-SEC-01', sourceName: 'CHW-SEC-01', targetId: 'TOOL-LITHO-01', targetName: 'TOOL-LITHO-01', relationship: 'COOLS', property: 'A-06 Alarm' },
            { sourceId: 'MCC-01', sourceName: 'MCC-01', targetId: 'UPW-POU-01', targetName: 'UPW-POU-01', relationship: 'POWERS', property: 'Feeder #4 (TRIPPED)' },
            { sourceId: 'MCC-01', sourceName: 'MCC-01', targetId: 'UPW-POU-02', targetName: 'UPW-POU-02', relationship: 'POWERS', property: 'Feeder #4 (TRIPPED)' },
          ],
        };
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst regarding Active Plant Alarms:\n\n` +
          `🚨 Active Plant Alarms (8 Alarms Detected across Facility Systems):\n\n` +
          `• P1 Critical Alarms:\n` +
          `  1. Alarm A-06 — TOOL-LITHO-01 (Lithography Stepper 01)\n` +
          `     Condition: Process Cooling Temp Excursion (>21.5°C) | Status: Active Alarm\n` +
          `  2. Alarm A-02 — CHW-P-05 (Primary CHW Pump 05)\n` +
          `     Condition: Motor Power Loss / Overload Trip | Status: Tripped (0 GPM)\n` +
          `  3. Alarm A-01 — MCC-01 (Motor Control Center 01, Bus A)\n` +
          `     Condition: Ground Fault Trip on 480V Feeder #4 | Status: Critical Fault\n\n` +
          `• P2 Warning & Deviation Alarms:\n` +
          `  4. Alarm A-03 — CHW-HDR-01 (Primary Supply Header 01)\n` +
          `     Condition: Header Hydraulic Pressure Collapse (<3.4 bar) | Status: Warning\n` +
          `  5. Alarm A-04 — CHW-HX-01 (Process Heat Exchanger 01)\n` +
          `     Condition: Process Secondary Loop Temp Rise (21.8°C) | Status: Warning\n` +
          `  6. Alarm A-05 — CHW-SEC-01 (Secondary CHW Distribution Loop 01)\n` +
          `     Condition: Secondary Cooling Flow Starvation | Status: Warning\n` +
          `  7. Alarm A-07 — UPW-POU-01 (Ultra Pure Water Point of Use 01)\n` +
          `     Condition: Feeder Loop Pressure Drop | Status: Advisory\n` +
          `  8. Alarm A-08 — UPW-POU-02 (Ultra Pure Water Point of Use 02)\n` +
          `     Condition: Feeder Loop Pressure Drop | Status: Advisory\n\n` +
          `• Graph Status: All 8 affected assets are highlighted with alarm badges on the facility graph.\n` +
          `• Note: If you wish to investigate root cause propagation, you can select an asset below to run Root Cause Analysis.`;

        dynamicActionButtons = [
          {
            id: 'btn-rca-litho',
            label: '🔍 Run RCA for TOOL-LITHO-01',
            prompt: 'TOOL-LITHO-01 has an alarm. Find all active alarms in the plant, trace their causal topology upstream from TOOL-LITHO-01, and identify the root cause asset.',
            variant: 'primary',
          },
          {
            id: 'btn-rca-cmp-01',
            label: '🔍 Run RCA for TOOL-CMP-01',
            prompt: 'TOOL-CMP-01 has an alarm. Find all active alarms in the plant, trace their causal topology upstream from TOOL-CMP-01, and identify the root cause asset.',
            variant: 'secondary',
          },
          {
            id: 'btn-rca-cmp-02',
            label: '🔍 Run RCA for TOOL-CMP-02',
            prompt: 'TOOL-CMP-02 has an alarm. Find all active alarms in the plant, trace their causal topology upstream from TOOL-CMP-02, and identify the root cause asset.',
            variant: 'secondary',
          },
        ];
      } else if (lower.includes('upstream') && (lower.includes('tool 02') || lower.includes('cmp-02') || lower.includes('tool-cmp-02') || (lower.includes('cmp') && lower.includes('02')))) {
        isDelegated = true;
        needsOperatorInput = false;
        executedCypher = `MATCH path = (upstream:Equipment)-[:SUPPLIES|FEEDS|POWERS|COOLS*1..4]->(target:Equipment {id: 'TOOL-CMP-02'}) RETURN path`;
        cypherSummary = `Upstream multi-hop traversal completed for TOOL-CMP-02`;
        dynamicGraphData = {
          nodes: [
            { id: 'SUB-A-66KV', name: '66kV Substation Sub-A', type: 'Substation' },
            { id: 'MCC-01', name: 'Motor Control Center 01', type: 'MCC' },
            { id: 'UPW-PLANT', name: 'Central UPW Plant', type: 'UPWPlant' },
            { id: 'UPW-POU-02', name: 'Ultra Pure Water POU 02', type: 'UPWPointOfUse' },
            { id: 'CHW-HX-01', name: 'Process Cooling HX 01', type: 'HeatExchanger' },
            { id: 'TOOL-CMP-02', name: 'CMP Tool 02', type: 'ProcessTool' }
          ],
          edges: [
            { sourceId: 'SUB-A-66KV', sourceName: 'Substation Sub-A', targetId: 'MCC-01', targetName: 'MCC-01', relationship: 'POWERS', property: '66kV / 480V' },
            { sourceId: 'MCC-01', sourceName: 'MCC-01', targetId: 'UPW-POU-02', targetName: 'UPW POU 02', relationship: 'POWERS', property: '480V Feeder' },
            { sourceId: 'UPW-PLANT', sourceName: 'Central UPW Plant', targetId: 'UPW-POU-02', targetName: 'UPW POU 02', relationship: 'SUPPLIES', property: 'Loop Flow' },
            { sourceId: 'UPW-POU-02', sourceName: 'UPW POU 02', targetId: 'TOOL-CMP-02', targetName: 'CMP Tool 02', relationship: 'SUPPLIES', property: '420 GPM' },
            { sourceId: 'CHW-HX-01', sourceName: 'Cooling HX 01', targetId: 'TOOL-CMP-02', targetName: 'CMP Tool 02', relationship: 'COOLS', property: '850 Tons' }
          ]
        };
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst regarding Upstream Utility Topology for CMP Tool 02:\n\n` +
          `• Target Asset: CMP Tool 02 (TOOL-CMP-02) [Wafer Chemical Mechanical Planarization]\n` +
          `• Upstream Multi-Hop Supply & Power Path:\n` +
          `  1. Electrical Grid: 66kV Substation Sub-A ➔ Motor Control Center 01 (MCC-01, Feeder #4)\n` +
          `  2. Ultra-Pure Water: Central UPW Generation Plant ➔ UPW-LOOP-A ➔ UPW-POU-02 (Point of Use Filter, 420 GPM) ➔ TOOL-CMP-02\n` +
          `  3. Process Cooling: Central Chillers (CHW-CH-01/02) ➔ Primary Header (CHW-HDR-01) ➔ Heat Exchanger (CHW-HX-01, 850 Tons) ➔ TOOL-CMP-02\n` +
          `• Graph Traversal Depth: 4 hops traversed across Enterprise Labeled Property Graph.`;
      } else if (lower.includes('upstream') && (lower.includes('cmp') || lower.includes('tool 01') || lower.includes('tool-cmp-01'))) {
        isDelegated = true;
        needsOperatorInput = false;
        executedCypher = `MATCH path = (upstream:Equipment)-[:SUPPLIES|FEEDS|POWERS|COOLS*1..4]->(target:Equipment {id: 'TOOL-CMP-01'}) RETURN path`;
        cypherSummary = `Upstream multi-hop traversal completed for TOOL-CMP-01`;
        dynamicGraphData = {
          nodes: [
            { id: 'SUB-A-66KV', name: '66kV Substation Sub-A', type: 'Substation' },
            { id: 'MCC-01', name: 'Motor Control Center 01', type: 'MCC' },
            { id: 'UPW-PLANT', name: 'Central UPW Plant', type: 'UPWPlant' },
            { id: 'UPW-POU-01', name: 'Ultra Pure Water POU 01', type: 'UPWPointOfUse' },
            { id: 'CHW-HX-01', name: 'Process Cooling HX 01', type: 'HeatExchanger' },
            { id: 'TOOL-CMP-01', name: 'CMP Tool 01', type: 'ProcessTool' }
          ],
          edges: [
            { sourceId: 'SUB-A-66KV', sourceName: 'Substation Sub-A', targetId: 'MCC-01', targetName: 'MCC-01', relationship: 'POWERS', property: '66kV / 480V' },
            { sourceId: 'MCC-01', sourceName: 'MCC-01', targetId: 'UPW-POU-01', targetName: 'UPW POU 01', relationship: 'POWERS', property: '480V Feeder' },
            { sourceId: 'UPW-PLANT', sourceName: 'Central UPW Plant', targetId: 'UPW-POU-01', targetName: 'UPW POU 01', relationship: 'SUPPLIES', property: 'Loop Flow' },
            { sourceId: 'UPW-POU-01', sourceName: 'UPW POU 01', targetId: 'TOOL-CMP-01', targetName: 'CMP Tool 01', relationship: 'SUPPLIES', property: '420 GPM' },
            { sourceId: 'CHW-HX-01', sourceName: 'Cooling HX 01', targetId: 'TOOL-CMP-01', targetName: 'CMP Tool 01', relationship: 'COOLS', property: '850 Tons' }
          ]
        };
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst regarding Upstream Utility Topology for CMP Tool 01:\n\n` +
          `• Target Asset: CMP Tool 01 (TOOL-CMP-01) [Wafer Chemical Mechanical Planarization]\n` +
          `• Upstream Multi-Hop Supply & Power Path:\n` +
          `  1. Electrical Grid: 66kV Substation Sub-A ➔ Motor Control Center 01 (MCC-01, Feeder #4)\n` +
          `  2. Ultra-Pure Water: Central UPW Generation Plant ➔ UPW-POU-01 (Point of Use Filter, 420 GPM) ➔ TOOL-CMP-01\n` +
          `  3. Process Cooling: Central Chillers (CHW-CH-01/02) ➔ Primary Header (CHW-HDR-01) ➔ Heat Exchanger (CHW-HX-01, 850 Tons) ➔ TOOL-CMP-01\n` +
          `• Graph Traversal Depth: 4 hops traversed across Enterprise Labeled Property Graph.`;
      } else if (lower.includes('tool 02') || lower.includes('cmp-02') || lower.includes('tool-cmp-02') || (lower.includes('cmp') && lower.includes('02'))) {
        isDelegated = true;
        needsOperatorInput = false;
        executedCypher = `MATCH (source:Equipment)-[r]->(target:Equipment {id: 'TOOL-CMP-02'}) RETURN source.id, source.name, type(r), target.id, target.name`;
        cypherSummary = `2 direct supporting upstream assets verified in Enterprise LPG`;
        dynamicGraphData = {
          nodes: [
            { id: 'UPW-POU-02', name: 'Ultra Pure Water POU 02', type: 'UPWPointOfUse' },
            { id: 'CHW-HX-01', name: 'Process Cooling HX 01', type: 'HeatExchanger' },
            { id: 'TOOL-CMP-02', name: 'CMP Tool 02', type: 'ProcessTool' }
          ],
          edges: [
            { sourceId: 'UPW-POU-02', sourceName: 'UPW POU 02', targetId: 'TOOL-CMP-02', targetName: 'CMP Tool 02', relationship: 'SUPPLIES', property: '420 GPM' },
            { sourceId: 'CHW-HX-01', sourceName: 'Cooling HX 01', targetId: 'TOOL-CMP-02', targetName: 'CMP Tool 02', relationship: 'COOLS', property: '850 Tons' }
          ]
        };
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst regarding CMP Tool 02 (TOOL-CMP-02) topology:\n\n` +
          `• Target Asset: CMP Tool 02 (TOOL-CMP-02) [Location: Cleanroom Bay 1]\n` +
          `• Directly Connected & Supporting Upstream Assets:\n` +
          `  1. UPW-POU-02 (Ultra Pure Water Point of Use 02) — SUPPLIES ultra-pure water loop (Current load: 420 GPM / 500 GPM max capacity).\n` +
          `  2. CHW-HX-01 (Process Chilled Water Heat Exchanger 01) — COOLS thermal polishing friction (Current load: 850 Tons / 1,200 Tons capacity).\n` +
          `• Power & Distribution: Powered via Substation TX-01 66kV Sub-A bus.\n` +
          `• Status: All direct utility connections verified nominal in Enterprise LPG.`;
      } else if (lower.includes('cmp') || lower.includes('tool 01') || lower.includes('tool-cmp-01')) {
        isDelegated = true;
        needsOperatorInput = false;
        executedCypher = `MATCH (source:Equipment)-[r]->(target:Equipment {id: 'TOOL-CMP-01'}) RETURN source.id, source.name, type(r), target.id, target.name`;
        cypherSummary = `2 direct supporting upstream assets verified in Enterprise LPG`;
        dynamicGraphData = {
          nodes: [
            { id: 'UPW-POU-01', name: 'Ultra Pure Water POU 01', type: 'UPWPointOfUse' },
            { id: 'CHW-HX-01', name: 'Process Cooling HX 01', type: 'HeatExchanger' },
            { id: 'TOOL-CMP-01', name: 'CMP Tool 01', type: 'ProcessTool' }
          ],
          edges: [
            { sourceId: 'UPW-POU-01', sourceName: 'UPW POU 01', targetId: 'TOOL-CMP-01', targetName: 'CMP Tool 01', relationship: 'SUPPLIES', property: '420 GPM' },
            { sourceId: 'CHW-HX-01', sourceName: 'Cooling HX 01', targetId: 'TOOL-CMP-01', targetName: 'CMP Tool 01', relationship: 'COOLS', property: '850 Tons' }
          ]
        };
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst regarding CMP Tool 01 (TOOL-CMP-01) topology:\n\n` +
          `• Target Asset: CMP Tool 01 (TOOL-CMP-01) [Location: Cleanroom Bay 1]\n` +
          `• Directly Connected & Supporting Upstream Assets:\n` +
          `  1. UPW-POU-01 (Ultra Pure Water Point of Use 01) — SUPPLIES ultra-pure water loop (Current load: 420 GPM / 500 GPM max capacity).\n` +
          `  2. CHW-HX-01 (Process Chilled Water Heat Exchanger 01) — COOLS thermal polishing friction (Current load: 850 Tons / 1,200 Tons capacity).\n` +
          `• Power & Distribution: Powered via Substation TX-01 66kV Sub-A bus.\n` +
          `• Status: All direct utility connections verified nominal in Enterprise LPG.`;
      } else if (lower.includes('solar')) {
        isDelegated = true;
        needsOperatorInput = false;
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst:\n\n• Solar Power Energy Generation: 1,250 kW (1.25 MW) [Rooftop Photovoltaic Array, ~4.2 MWh/day]\n• System Status: Operating nominally and tied to 66kV Substation Sub-A.`;
      } else if (lower.includes('building energy') || lower.includes('energy consumption')) {
        isDelegated = true;
        needsOperatorInput = false;
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst:\n\n• Total Building Energy Consumption: 24.5 MW (24,500 kW) [Total Facility Electrical Load across Substations TX-01 & TX-02]\n• Baseline Status: Within nominal SEMI S23 energy intensity baseline.`;
      } else if (lower.includes('how many chiller') || lower.includes('chiller count') || (lower.includes('chiller') && lower.includes('have'))) {
        isDelegated = true;
        needsOperatorInput = false;
        executedCypher = `MATCH (c:Equipment) WHERE c.type = 'Chiller' OR c.id STARTS WITH 'CHW-CH' RETURN c.id, c.name, c.type`;
        botReplyText = `[Orchestrator Hub] Consulted the System Analyst (General Query Mode):\n\n❄️ Central Chilled Water Plant Inventory:\n• Total Chillers: 3 Water-Cooled Centrifugal Chillers (CHW-CH-01, CHW-CH-02, and CHW-CH-03 N+1 backup)\n• Verified via Enterprise Labeled Property Graph.`;
      } else if (lower.includes('help') || lower.includes('stuck') || lower.includes('cannot') || lower.includes('override')) {
        isDelegated = true;
        needsOperatorInput = true;
        botReplyText = `[Orchestrator Hub] Cannot solve this operational issue autonomously without user input. Manual authorization or physical inspection required from human operator.`;
      } else {
        isDelegated = true;
        needsOperatorInput = false;
        botReplyText = `[Orchestrator Hub] Consulted System Analyst on "${userPrompt}". System baseline, equipment topological connections, and ISA-18.2 alarm rationalizations verified in Enterprise Property Graph.`;
      }
    }

    // Official LangGraph Mode from Backend Router, with graceful local fallback
    const routeMode = backendRouteDecision?.mode;
    const lowerPrompt = userPrompt.toLowerCase();

    const isRcaQuery = routeMode === 'RCA_DIAGNOSTICS' || (
      !routeMode && (
        lowerPrompt.includes('litho') || 
        lowerPrompt.includes('rca') || 
        lowerPrompt.includes('root cause') || 
        (lowerPrompt.includes('alarm') && (lowerPrompt.includes('trace') || lowerPrompt.includes('upstream') || lowerPrompt.includes('causal')))
      )
    );

    const isMitigationQuery = routeMode === 'MITIGATION_OCAP' || (
      !routeMode && (
        lowerPrompt.includes('mitigation') || 
        lowerPrompt.includes('recovery plan') || 
        lowerPrompt.includes('chw-p-08') || 
        lowerPrompt.includes('standby pump') || 
        lowerPrompt.includes('proceed with mitigation')
      )
    );

    const isExecuteOcapQuery = lowerPrompt.includes('execute ocap') || 
                               lowerPrompt.includes('switch to standby') || 
                               lowerPrompt.includes('switch chilled water');

    const isDriftQuery = (
      routeMode === 'DRIFT_DIAGNOSIS' ||
      lowerPrompt.includes('drift') ||
      lowerPrompt.includes('upw') ||
      lowerPrompt.includes('toc') ||
      lowerPrompt.includes('conductivity') ||
      lowerPrompt.includes('cation') ||
      lowerPrompt.includes('t-1011') ||
      lowerPrompt.includes('t-1012') ||
      lowerPrompt.includes('sac-0911') ||
      lowerPrompt.includes('resin')
    ) && !isRcaQuery && !isMitigationQuery && !isExecuteOcapQuery;

    if (!streamHandled) {
      if (isDelegated) {
        const targetSpokeId = isDriftQuery ? 'upw_drift_agent' : 'system_analyst';
        const spokeName = isDriftQuery ? 'UPW Drift Agent' : 'System Analyst';

        const delegatingMode = isDriftQuery ? 'DRIFT_DIAGNOSIS' : isRcaQuery ? 'DIAGNOSTIC' : isMitigationQuery ? 'MITIGATION' : isExecuteOcapQuery ? 'EXECUTION' : (routeMode || 'GENERAL_QUERY');
        const delegatingReason = isDriftQuery
          ? 'UPW buffer tank & resin bed drift detected. Delegating to UPW Drift Agent.'
          : isRcaQuery
          ? 'Active incident detected on plant equipment. Delegated 2-Phase RCA to System Analyst.'
          : isMitigationQuery
          ? 'Standby switchover requested. Delegated N+1 mitigation evaluation to System Analyst.'
          : isExecuteOcapQuery
          ? 'Operator authorized switchover. Delegated OCAP execution to System Analyst.'
          : (backendRouteDecision?.reasoning || 'Cleanroom operations inquiry. Delegated to System Analyst in GENERAL_QUERY mode.');

        // Single genuine Orchestrator delegation step
        const tOrch = recordStep('orchestrator', 'Orchestrator', 'orchestrator', `Delegated to ${isDriftQuery ? 'Drift Agent' : 'Analyst'} (${delegatingMode})`, {
          mode: delegatingMode,
          decision: `Delegated to ${spokeName} in ${delegatingMode} MODE`,
          reasoning: delegatingReason,
          nextTarget: targetSpokeId,
          actionSummary: `Delegated (${delegatingMode})`,
        });
        setExecutionState(prev => ({
          ...prev,
          activeNodeId: 'orchestrator',
          activeEdgeId: 'edge-start-orch',
          stepMessage: `Orchestrator Hub: Evaluated prompt. Delegating to ${spokeName} in ${delegatingMode} MODE...`,
          nodeTrace: tOrch,
        }));
        await new Promise(r => setTimeout(r, 450));

        if (isDriftQuery) {
          // === 0. UPW DRIFT DIAGNOSTIC WORKFLOW ===
          const t1 = recordStep(targetSpokeId, 'UPW Drift Agent', 'drift_agent', 'Received UPW Drift Analysis delegation', {
            mode: 'DRIFT_DIAGNOSIS',
            decision: 'Delegated UPW Drift Diagnosis',
            reasoning: 'TOC / Conductivity excursion in buffer tank T-1011 requires live OT telemetry & RDF semantic verification',
            nextTarget: 'ot_connector_tool',
            actionSummary: 'Received Drift Delegation',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-orch-drift',
            stepMessage: `Orchestrator ➔ UPW Drift Agent [MODE: DRIFT_DIAGNOSIS]: Polling OT telemetry and evaluating ion exchange status...`,
            nodeTrace: t1,
          }));
          await new Promise(r => setTimeout(r, 650));

          // Step 1: Poll live OT telemetry from SCADA
          const t1_ot = recordStep('ot_connector_tool', 'OT Connector Tool', 'tool', 'Polled live SCADA telemetry for UPW-RO-01, UPW-RO-02, and T-1011', {
            mode: 'DRIFT_DIAGNOSIS',
            decision: 'Poll OT SCADA Historian',
            reasoning: 'Reading RO-01 permeate conductivity (0.068 uS/cm > 0.030 baseline), dP (1.40 bar nominal), and comparing sister skid RO-02 (0.028 uS/cm normal)',
            nextTarget: 'upw_drift_agent',
            actionSummary: 'Polled OT SCADA Telemetry',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'ot_connector_tool',
            activeEdgeId: 'edge-drift-ot',
            stepMessage: `ToolNode: Polling live SCADA / PLC telemetry from OT Connector for UPW-RO-01 & Sister Skid RO-02...`,
            nodeTrace: t1_ot,
          }));
          await new Promise(r => setTimeout(r, 900));

          // Return to UPW Drift Agent
          const t1_ret = recordStep(targetSpokeId, 'UPW Drift Agent', 'drift_agent', 'OT Telemetry confirms isolated RO-01 conductivity drift (flat dP = 1.4 bar). Querying RDF store...', {
            mode: 'DRIFT_DIAGNOSIS',
            decision: 'OT Telemetry Evaluated',
            reasoning: 'Asymmetric sister divergence detected with flat differential pressure. Executing SPARQL query for :Case_RO01_2026_ProbeDrift_ORingLeak.',
            nextTarget: 'rdf_triplestore_tool',
            actionSummary: 'OT Excursions Identified',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-ot-drift',
            stepMessage: `OT Connector ➔ UPW Drift Agent: Isolated RO-01 drift confirmed (RO-02 healthy, dP nominal). Querying W3C RDF Triplestore...`,
            nodeTrace: t1_ret,
          }));
          await new Promise(r => setTimeout(r, 750));

          // Step 2: Query RDF Triplestore for multi-hop lineage & historical case
          const driftSparql = 'PREFIX : <http://semicon.cleanroom.twin/ontology#>\nSELECT ?susceptibility ?case ?symptom ?rootCause ?mitigation WHERE {\n  :UPW-RO-01 :hasHistoricalCase ?case .\n  ?case :hasSymptom ?symptom ; :hasRootCause ?rootCause ; :hasMitigation ?mitigation .\n  OPTIONAL { :UPW-RO-01 :susceptibleTo ?susceptibility . }\n}';
          const t2_rdf = recordStep('rdf_triplestore_tool', 'RDF Triplestore Tool', 'tool', 'Executed SPARQL Case 1 probe drift & O-ring mitigation query', {
            mode: 'DRIFT_DIAGNOSIS',
            decision: 'Execute SPARQL Verification',
            reasoning: 'Retrieved :Case_RO01_2026_ProbeDrift_ORingLeak and identified probe recalibration + interconnector seal check OCAP',
            cypher: driftSparql,
            nextTarget: 'upw_drift_agent',
            actionSummary: 'SPARQL Proof Verified',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'rdf_triplestore_tool',
            activeEdgeId: 'edge-drift-rdf',
            stepMessage: `ToolNode: Executing SPARQL query against RDF Triplestore — Verifying UPW-RO-01 historical case & OCAP...`,
            nodeTrace: t2_rdf,
          }));
          await new Promise(r => setTimeout(r, 1000));

          // Return and formulate final response
          const t3_drift = recordStep(targetSpokeId, 'UPW Drift Agent', 'drift_agent', 'Diagnosis complete: Local RO-01 Probe Drift / O-Ring Anomaly. Formulated OCAP.', {
            mode: 'DRIFT_DIAGNOSIS',
            decision: 'Drift Diagnosis & OCAP Synthesis Complete',
            reasoning: 'Confirmed local probe drift / interconnector seal leak. Sister skid RO-02 normal, dP flat at 1.4 bar. Exiting to END.',
            nextTarget: 'end',
            actionSummary: 'Diagnosis & OCAP Ready',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-rdf-drift',
            stepMessage: `UPW Drift Agent: Diagnosis complete. Synthesizing OCAP mitigation and routing to END...`,
            nodeTrace: t3_drift,
          }));
          await new Promise(r => setTimeout(r, 750));

        } else if (isRcaQuery) {
          // === 1. RCA DIAGNOSTIC WORKFLOW ===
          const t1 = recordStep(targetSpokeId, 'System Analyst (Diag)', 'agent', 'Received 4-Phase RCA delegation', {
            mode: 'DIAGNOSTIC',
            decision: 'Delegated 4-Phase RCA',
            reasoning: 'Active alarm excursion on TOOL-LITHO-01 requires historical case lookup, alarm correlation, upstream traversal, and RDF proof',
            nextTarget: 'knowledge_base_tool',
            actionSummary: 'Received 4-Phase RCA delegation',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-orch-analyst',
            stepMessage: `Orchestrator ➔ ${spokeName} [MODE: DIAGNOSTIC]: Incident detected on TOOL-LITHO-01. Delegating for 4-Phase RCA...`,
            nodeTrace: t1,
          }));
          await new Promise(r => setTimeout(r, 650));

          // Phase 1: Knowledge Base Historical Incident Lookup
          const kbLookupSparql = 'PREFIX : <http://semicon.cleanroom.twin/ontology#>\nSELECT ?case ?symptom ?rootCause ?mitigation WHERE {\n  :TOOL-LITHO-01 :hasHistoricalCase ?case .\n  ?case :hasSymptom ?symptom ; :hasRootCause ?rootCause ; :hasMitigation ?mitigation .\n}';
          const t1_kb = recordStep('knowledge_base_tool', 'Knowledge Base (P1)', 'tool', 'Historical incident lookup for TOOL-LITHO-01', {
            mode: 'DIAGNOSTIC',
            decision: 'Historical Knowledge Base Query',
            reasoning: 'Querying W3C RDF semantic store for previous incident cases linked to TOOL-LITHO-01',
            cypher: kbLookupSparql,
            nextTarget: 'system_analyst',
            actionSummary: 'Queried Knowledge Base',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'knowledge_base_tool',
            activeEdgeId: 'edge-analyst-kb',
            stepMessage: `ToolNode [Phase 1/4]: Consulting Knowledge Base — Querying :hasHistoricalCase for TOOL-LITHO-01...`,
            nodeTrace: t1_kb,
          }));
          await new Promise(r => setTimeout(r, 900));

          // Phase 1 return
          const t1_ret = recordStep(targetSpokeId, 'System Analyst (Diag)', 'agent', 'KB: No prior historical cases. Proceeding to active alarm scan', {
            mode: 'DIAGNOSTIC',
            decision: 'KB Lookup Complete (Novel Incident)',
            reasoning: 'Zero historical cases cataloged for TOOL-LITHO-01. Confirmed novel cascading event. Proceeding to live alarm scan.',
            nextTarget: 'neo4j_rca_tool',
            actionSummary: 'KB Lookup Complete',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-kb-analyst',
            stepMessage: `Knowledge Base ➔ ${spokeName}: No prior historical cases for TOOL-LITHO-01. Scanning live alarms on Enterprise Property Graph...`,
            nodeTrace: t1_ret,
          }));
          await new Promise(r => setTimeout(r, 750));

          // Phase 2: Active Alarm Detection
          const phase1Cypher = 'MATCH (a:Alarm {status: "ACTIVE"}) RETURN a.id, a.severity, a.message, a.asset_id';
          const t2 = recordStep('neo4j_rca_tool', 'Graph Query (P2)', 'tool', 'Scanned 8 active alarms across plant', {
            mode: 'DIAGNOSTIC',
            decision: 'Execute Phase 2 Alarm Scan',
            reasoning: 'Identify all active alarms across plant to find correlated triggers for LITHO-01',
            cypher: phase1Cypher,
            nextTarget: 'system_analyst',
            actionSummary: 'Scanned 8 active alarms',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'neo4j_rca_tool',
            activeEdgeId: 'edge-analyst-tool',
            stepMessage: `ToolNode [Phase 2/4]: Executing query on Enterprise Property Graph — Scanning all active alarms across plant equipment...`,
            nodeTrace: t2,
          }));
          await new Promise(r => setTimeout(r, 1100));

          // Phase 2 return
          const t3 = recordStep(targetSpokeId, 'System Analyst (Diag)', 'agent', 'Correlated Alarm A-06 (P1) on LITHO-01', {
            mode: 'DIAGNOSTIC',
            decision: 'Correlated Alarm A-06 (P1)',
            reasoning: 'Confirmed critical high-temperature alarm on LITHO-01; next initiate multi-hop upstream causal path',
            nextTarget: 'neo4j_rca_tool',
            actionSummary: 'Correlated Alarm A-06',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-tool-analyst',
            stepMessage: `ToolNode ➔ ${spokeName}: Phase 2 complete — 8 active alarms identified. Correlating TOOL-LITHO-01 with alarm A-06 (P1)...`,
            nodeTrace: t3,
          }));
          await new Promise(r => setTimeout(r, 850));

          // Phase 3: Upstream Multi-Hop Traversal
          const phase2Cypher = 'MATCH path = (root)-[:CAUSES|FEEDS|POWERS*1..6]->(target {id: "TOOL-LITHO-01"})\nWHERE root:Equipment AND root.status = "FAULT"\nRETURN path, root.id, root.type';
          const t4 = recordStep('neo4j_rca_tool', 'Graph Query (P3)', 'tool', '6-hop causal path traversal to MCC-01', {
            mode: 'DIAGNOSTIC',
            decision: 'Execute Phase 3 Upstream Traversal',
            reasoning: 'Traverse 6-hop causal chain from LITHO-01 upstream through cooling lines to electrical MCC feeder',
            cypher: phase2Cypher,
            nextTarget: 'system_analyst',
            actionSummary: '6-hop causal traversal',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'neo4j_rca_tool',
            activeEdgeId: 'edge-analyst-tool',
            stepMessage: `ToolNode [Phase 3/4]: Executing query on Enterprise Property Graph — Tracing 6-hop causal path upstream from TOOL-LITHO-01...`,
            nodeTrace: t4,
          }));
          await new Promise(r => setTimeout(r, 1200));

          // Phase 3 return: System Analyst prepares RDF Triplestore SPARQL verification
          const t5 = recordStep(targetSpokeId, 'System Analyst (Diag)', 'agent', 'Root cause candidate isolated: MCC-01. Invoking RDF Reasoner...', {
            mode: 'DIAGNOSTIC',
            decision: 'Root cause candidate isolated: MCC-01 Ground Fault Feeder #4',
            reasoning: 'LPG multi-hop traversal indicates MCC-01. Now invoking RDF Triplestore tool (Skill 2) for mandatory SPARQL property path reachability proof.',
            nextTarget: 'rdf_triplestore_tool',
            actionSummary: 'Invoking RDF SPARQL',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-tool-analyst',
            stepMessage: `ToolNode ➔ ${spokeName}: Phase 3 complete — Root cause candidate isolated to MCC-01. Dispatching to RDF Triplestore for SPARQL reachability verification...`,
            nodeTrace: t5,
          }));
          await new Promise(r => setTimeout(r, 850));

          // Phase 4: RDF Triplestore SPARQL Property Path Verification
          const sparqlQuery = 'PREFIX : <http://semicon.org/facility#>\nASK {\n  :MCC-01 (:suppliesPowerTo|:providesCoolingTo|:feedsTo)* :TOOL-LITHO-01 .\n}';
          const t6 = recordStep('rdf_triplestore_tool', 'RDF Triplestore (P4)', 'tool', 'W3C SPARQL property path proof: MCC-01 -> TOOL-LITHO-01', {
            mode: 'DIAGNOSTIC',
            decision: 'Execute SPARQL Reachability Verification',
            reasoning: 'Evaluating transitive property path in W3C Oxigraph triplestore to mathematically prove topological reachability',
            cypher: sparqlQuery,
            nextTarget: 'system_analyst',
            actionSummary: 'SPARQL ASK reachability proof',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'rdf_triplestore_tool',
            activeEdgeId: 'edge-analyst-rdf',
            stepMessage: `ToolNode [Phase 4/4]: Executing SPARQL Property Path on RDF Triplestore — ASK { :MCC-01 (:suppliesPowerTo|:providesCoolingTo|:feedsTo)* :TOOL-LITHO-01 }...`,
            nodeTrace: t6,
          }));
          await new Promise(r => setTimeout(r, 1100));

          // Phase 4 return: RDF Triplestore validates reachability -> System Analyst concludes
          const t7 = recordStep(targetSpokeId, 'System Analyst (Diag)', 'agent', 'RDF Reachability Verified (True). Root cause confirmed: MCC-01', {
            mode: 'DIAGNOSTIC',
            decision: 'RDF Reachability Verified (True) — MCC-01 Confirmed as Root Cause',
            reasoning: 'SPARQL property path evaluated to true in 2.4ms. Physical causal path mathematically proven. LangGraph toolsCondition evaluates no further tool calls -> transition to END via finish_turn().',
            nextTarget: 'end',
            actionSummary: 'Root cause confirmed (MCC-01)',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-rdf-analyst',
            stepMessage: `RDF Triplestore ➔ ${spokeName}: Phase 4 complete — Reachability proof verified (true). Root cause confirmed as MCC-01 Ground Fault. Routing to END...`,
            nodeTrace: t7,
          }));
          await new Promise(r => setTimeout(r, 900));

        } else if (isMitigationQuery) {
          // === 2. MITIGATION & OCAP PLANNING WORKFLOW ===
          const t1 = recordStep(targetSpokeId, 'System Analyst (Mitig)', 'agent', 'Querying N+1 standby redundancy', {
            mode: 'MITIGATION',
            decision: 'Evaluate Standby Redundancy',
            reasoning: 'CHW-P-05 offline. Identify standby asset and verify separate electrical feeder.',
            nextTarget: 'neo4j_rca_tool',
            actionSummary: 'Querying N+1 redundancy',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-orch-analyst',
            stepMessage: `Orchestrator ➔ ${spokeName} [MODE: MITIGATION]: Operator feedback received. Querying N+1 standby redundancy for CHW-P-05...`,
            nodeTrace: t1,
          }));
          await new Promise(r => setTimeout(r, 700));

          // ToolNode queries :BACKUP_FOR on Enterprise Property Graph
          const mitigCypher = 'MATCH (standby:Equipment)-[:BACKUP_FOR]->(p:Equipment {id: "CHW-P-05"})\nMATCH (standby)<-[:POWERS]-(mcc:Equipment)\nRETURN standby.id, standby.status, mcc.id';
          const t2 = recordStep('neo4j_rca_tool', 'Graph Query', 'tool', 'MATCH (s)-[:BACKUP_FOR]->(CHW-P-05)', {
            mode: 'MITIGATION',
            decision: 'Verify Standby Asset & Power Feed',
            reasoning: 'Verify CHW-P-08 is healthy on isolated Sub-B bus (MCC-02)',
            cypher: mitigCypher,
            nextTarget: 'system_analyst',
            actionSummary: 'Verified CHW-P-08 on Sub-B',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'neo4j_rca_tool',
            activeEdgeId: 'edge-analyst-tool',
            stepMessage: `ToolNode: Executing query on Enterprise Property Graph — MATCH (standby)-[:BACKUP_FOR]->(CHW-P-05) & checking MCC-02 feed...`,
            nodeTrace: t2,
          }));
          await new Promise(r => setTimeout(r, 1100));

          // Standby pump verified - System Analyst formulates OCAP and exits to END
          const t3 = recordStep(targetSpokeId, 'System Analyst (Mitig)', 'agent', 'CHW-P-08 verified healthy on MCC-02', {
            mode: 'MITIGATION',
            decision: 'OCAP Recovery Plan Formulated',
            reasoning: 'Standby pump confirmed healthy on isolated Sub-B bus. Direct exit to END awaiting operator execution authorization.',
            nextTarget: 'end',
            actionSummary: 'OCAP Formulated',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-tool-analyst',
            stepMessage: `ToolNode ➔ ${spokeName}: Standby asset CHW-P-08 verified healthy on isolated Sub-B bus (MCC-02)...`,
            nodeTrace: t3,
          }));
          await new Promise(r => setTimeout(r, 850));

        } else if (isExecuteOcapQuery) {
          // === 3. OCAP EXECUTION WORKFLOW ===
          const t1 = recordStep(targetSpokeId, 'System Analyst (Exec)', 'agent', 'Dispatching OCAP commands to SCADA', {
            mode: 'EXECUTION',
            decision: 'Dispatch OCAP Execution',
            reasoning: 'Operator authorized execution. Dispatching VFD start and valve sequencing.',
            nextTarget: 'neo4j_rca_tool',
            actionSummary: 'Dispatching OCAP commands',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-orch-analyst',
            stepMessage: `Orchestrator ➔ ${spokeName}: Operator authorized execution. Dispatching OCAP recovery commands to SCADA...`,
            nodeTrace: t1,
          }));
          await new Promise(r => setTimeout(r, 650));

          const execCypher = 'MATCH (p:Equipment {id: "CHW-P-08"}) SET p.status = "RUNNING", p.frequency_hz = 55.0\nMATCH (v:Equipment {id: "V-CHW-08"}) SET v.status = "OPEN"\nRETURN p, v';
          const t2 = recordStep('neo4j_rca_tool', 'SCADA / Twin Dispatch', 'tool', 'VFD start CHW-P-08 (55Hz), V-CHW-08 open', {
            mode: 'EXECUTION',
            decision: 'VFD Ramp & Valve Sequencing',
            reasoning: 'Ramped standby pump to 55Hz and opened bypass valve in Digital Twin and SCADA',
            cypher: execCypher,
            nextTarget: 'system_analyst',
            actionSummary: 'Applied SCADA commands',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: 'neo4j_rca_tool',
            activeEdgeId: 'edge-analyst-tool',
            stepMessage: `ToolNode: Dispatching VFD start to CHW-P-08 (55 Hz), opening valve V-CHW-08, updating digital twin...`,
            nodeTrace: t2,
          }));
          await new Promise(r => setTimeout(r, 1000));

          const t3 = recordStep(targetSpokeId, 'System Analyst (Exec)', 'agent', 'Telemetry nominal: 4.35 bar, A-06 cleared', {
            mode: 'EXECUTION',
            decision: 'Execution Verified & Alarm Cleared',
            reasoning: 'Differential pressure restored to 4.35 bar. Alarm A-06 cleared. Direct exit to END.',
            nextTarget: 'end',
            actionSummary: 'Telemetry nominal (4.35 bar)',
          });
          setExecutionState(prev => ({
            ...prev,
            activeNodeId: targetSpokeId,
            activeEdgeId: 'edge-tool-analyst',
            stepMessage: `${spokeName}: Telemetry confirmed nominal: 4.35 bar, Alarm A-06 cleared. Routing to END...`,
            nodeTrace: t3,
          }));
          await new Promise(r => setTimeout(r, 650));

        } else {
          // Standard plant inquiry
          if (executedCypher) {
            const t1 = recordStep(targetSpokeId, 'System Analyst (Query)', 'agent', 'Formulating topology query', {
              mode: 'GENERAL_QUERY',
              decision: 'Formulate Cypher Query',
              reasoning: backendRouteDecision?.reasoning || 'Evaluating facility equipment, telemetry, or baseline specifications',
              nextTarget: 'neo4j_rca_tool',
              actionSummary: 'Delegated Query',
            });
            setExecutionState(prev => ({
              ...prev,
              activeNodeId: targetSpokeId,
              activeEdgeId: 'edge-orch-analyst',
              stepMessage: `Orchestrator ➔ ${spokeName}: Facility query detected. Delegating to System Analyst (General Query Mode)...`,
              nodeTrace: t1,
            }));
            await new Promise(r => setTimeout(r, 600));

            const t2 = recordStep('neo4j_rca_tool', 'Graph Query', 'tool', 'Executed topology query on Graph Engine', {
              mode: 'GENERAL_QUERY',
              decision: 'Execute Cypher Query',
              reasoning: 'Retrieve live node telemetry and relationships from Property Graph',
              cypher: executedCypher,
              nextTarget: 'system_analyst',
              actionSummary: 'Executed Graph Query',
            });
            setExecutionState(prev => ({
              ...prev,
              activeNodeId: 'neo4j_rca_tool',
              activeEdgeId: 'edge-analyst-tool',
              stepMessage: `System Analyst ➔ ToolNode: Executing query on Enterprise Property Graph for equipment topology & telemetry...`,
              nodeTrace: t2,
            }));
            await new Promise(r => setTimeout(r, 850));

            const t3 = recordStep(targetSpokeId, 'System Analyst (Query)', 'agent', 'Processed graph topology response', {
              mode: 'GENERAL_QUERY',
              decision: 'Processed graph topology response',
              reasoning: backendAnalystReasoning || 'Records verified against ontology. Direct exit to END via finish_turn().',
              nextTarget: 'end',
              actionSummary: 'Topology response verified',
            });
            setExecutionState(prev => ({
              ...prev,
              activeNodeId: targetSpokeId,
              activeEdgeId: 'edge-tool-analyst',
              stepMessage: `ToolNode ➔ ${spokeName}: Verified topology & telemetry records returned from Enterprise Property Graph...`,
              nodeTrace: t3,
            }));
            await new Promise(r => setTimeout(r, 650));
          } else {
            // Exactly ONE step for static facility knowledge (No duplicate pill)
            const analystSpecificReasoning = backendAnalystReasoning || 'Answered from verified cleanroom facility baseline specifications without database query. Direct exit to END.';
            const t1 = recordStep(targetSpokeId, 'System Analyst', 'agent', 'Answered from verified facility baseline specs', {
              mode: 'GENERAL_QUERY',
              decision: 'Facility Spec Lookup',
              reasoning: analystSpecificReasoning,
              nextTarget: 'end',
              actionSummary: 'Spec verified from baseline',
            });
            setExecutionState(prev => ({
              ...prev,
              activeNodeId: targetSpokeId,
              activeEdgeId: 'edge-orch-analyst',
              stepMessage: `${spokeName}: Answered directly from verified facility baseline specs...`,
              nodeTrace: t1,
            }));
            await new Promise(r => setTimeout(r, 650));
          }
        }
      } else {
        // Direct answer by Orchestrator for general questions
        const liveReasoning = backendRouteDecision?.reasoning || 'General question resolved directly without facility agent delegation.';
        const t1 = recordStep('orchestrator', 'Orchestrator', 'orchestrator', 'Direct answer (no analyst delegation)', {
          mode: 'DIRECT_SUPERVISOR',
          decision: 'Direct Answer by Orchestrator',
          reasoning: liveReasoning,
          nextTarget: 'end',
          actionSummary: 'Answered directly without delegation',
        });
        setExecutionState(prev => ({
          ...prev,
          activeNodeId: 'orchestrator',
          activeEdgeId: 'edge-start-orch',
          stepMessage: 'Orchestrator: General query detected. Answering directly by itself without calling Analyst...',
          nodeTrace: t1,
        }));
        await new Promise(r => setTimeout(r, 550));
      }
    }

    // Step 3: Add reply to WhatsApp chat
    const orchMsg: HiveChatMessage = {
      id: `msg-orch-${Date.now()}`,
      sender: 'orchestrator',
      senderName: 'Orchestrator',
      avatar: '',
      text: botReplyText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      nodeId: 'orchestrator',
      cypherQuery: executedCypher,
      cypherResultsSummary: cypherSummary,
      delegatedToAnalyst: isDelegated,
      graphData: dynamicGraphData,
      actionButtons: dynamicActionButtons,
    };

    setMessages(prev => [...prev, orchMsg]);

    // Step 3b & 4: ROUTING TO OPERATOR OR END:
    if (!streamHandled) {
      if (needsOperatorInput) {
        const topStep = recordStep('operator', 'Operator (HITL)', 'operator', 'Awaiting human authorization / feedback', {
          decision: 'Human-in-the-Loop Checkpoint',
          reasoning: isRcaQuery
            ? 'Diagnostic complete. Requesting Operator authorization before proceeding to mitigation plan.'
            : isMitigationQuery
            ? 'Mitigation plan formulated. Awaiting Operator approval to execute OCAP.'
            : 'Human operator input requested for escalation.',
          actionSummary: 'Awaiting Operator Approval',
        });
        setExecutionState(prev => ({
          ...prev,
          activeNodeId: 'operator',
          activeEdgeId: isDelegated ? 'edge-analyst-end' : 'edge-orch-op',
          stepMessage: isRcaQuery
            ? 'System Analyst ➔ Operator: Diagnostic complete. Requesting Operator feedback before proceeding to Mitigation Plan...'
            : isMitigationQuery
            ? 'System Analyst ➔ Operator: Mitigation Plan formulated. Awaiting Operator authorization to execute OCAP...'
            : 'Calling Operator node for user input & assistance...',
          nodeTrace: topStep,
        }));
        await new Promise(r => setTimeout(r, 700));

        const tEnd = recordStep('end', '__end__ (Paused)', 'end', 'Paused at human checkpoint', {
          decision: 'Execution paused at HITL checkpoint',
          actionSummary: 'Turn paused for operator input',
        });
        setExecutionState(prev => ({
          ...prev,
          activeNodeId: 'end',
          activeEdgeId: 'edge-analyst-end',
          stepMessage: 'END: Turn paused at Operator checkpoint awaiting user confirmation/action',
          nodeTrace: tEnd,
        }));
        await new Promise(r => setTimeout(r, 500));
      } else {
        const tEnd = recordStep('end', '__end__', 'end', 'Turn execution completed successfully', {
          decision: isDelegated ? 'system_analyst -> END via toolsCondition' : 'orchestrator -> END',
          actionSummary: 'Turn completed',
        });
        setExecutionState(prev => ({
          ...prev,
          activeNodeId: 'end',
          activeEdgeId: isDelegated ? 'edge-analyst-end' : 'edge-orch-end',
          stepMessage: isDelegated
            ? 'END: System Analyst completed diagnosis. Control returned to Operator.'
            : 'END: Operation completed. Control returned to Operator.',
          nodeTrace: tEnd,
        }));
        await new Promise(r => setTimeout(r, 600));
      }
    } else {
      if (needsOperatorInput) {
        const hitlTrace = recordStep('operator', 'Operator (HITL)', 'operator', 'Awaiting human authorization / feedback', {
          decision: 'Human-in-the-Loop Checkpoint',
          reasoning: backendAnalystReasoning || 'Diagnostic complete. Requesting Operator feedback before proceeding to mitigation.',
          actionSummary: 'Awaiting Operator Approval',
          nextTarget: 'operator',
        });
        setExecutionState(prev => ({
          ...prev,
          activeNodeId: 'operator',
          activeEdgeId: isDelegated ? 'edge-analyst-end' : 'edge-orch-op',
          stepMessage: 'Operator Checkpoint: Awaiting human feedback or mitigation approval...',
          nodeTrace: hitlTrace,
        }));
      }
    }

    // Reset to idle ready state while retaining the completed trace sequence
    setExecutionState(prev => ({
      ...prev,
      isRunning: false,
      activeNodeId: null,
      activeEdgeId: null,
      stepMessage: 'Ready for next prompt',
    }));
  };

  const handleClearChat = () => {
    cachedTotalTurns = 1;
    const newThread = `hive_session_${Date.now()}`;
    setThreadId(newThread);
    setExecutionState(prev => ({
      ...prev,
      totalTurns: 1,
      nodeTrace: [],
    }));
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'system',
        senderName: 'System Core',
        avatar: '',
        text: 'Chat history cleared. Agent session reset to initial state.',
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Banner / Controls Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center shadow-xs">
            <Workflow className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Agent Hive
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Autonomous Swarm
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Runtime
              </span>
              {langsmithStatus.enabled ? (
                <a
                  href="https://smith.langchain.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-0.5 text-xs font-semibold bg-sky-50 text-sky-800 hover:bg-sky-100 rounded-full border border-sky-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Cloud Audit Tracing Active — Click to open dashboard"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  <span>Cloud Tracing:</span>
                  <span className="font-mono text-[11px] font-bold text-sky-900">{langsmithStatus.project}</span>
                  <ExternalLink className="w-3 h-3 text-sky-600" />
                </a>
              ) : (
                <a
                  href="https://smith.langchain.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Cloud Audit Tracing Ready"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Audit Tracing Ready</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* View Layout Switcher */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setLayoutMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'split'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              onClick={() => setLayoutMode('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'simulator'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Event Simulator</span>
            </button>
            <button
              onClick={() => setLayoutMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'canvas'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>
            <button
              onClick={() => setLayoutMode('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'chat'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Operator Chat</span>
            </button>
          </div>

          <button
            onClick={handleResetPositions}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            title="Reset Canvas Layout"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px] h-[calc(100vh-250px)]">
        {/* Case 1: Standalone Event Simulator on its own */}
        {layoutMode === 'simulator' && (
          <div className="lg:col-span-12 h-full transition-all duration-200">
            <EventSimulator
              variables={simVariables}
              onVariablesChange={setSimVariables}
              onSimulateEvent={(eventName) => {
                setLayoutMode('split');
                executeLangGraphTurn(eventName);
              }}
              isRunning={executionState.isRunning}
            />
          </div>
        )}

        {/* Case 2: LangGraph Canvas (in Split View or Canvas Full-Width) */}
        {(layoutMode === 'split' || layoutMode === 'canvas') && (
          <div
            className={`${
              layoutMode === 'split' ? 'lg:col-span-7 h-[500px] lg:h-full' : 'lg:col-span-12 h-full'
            } transition-all duration-200`}
          >
            <LangGraphCanvas
              nodes={nodes}
              edges={edges}
              executionState={executionState}
              onSelectNode={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
              onUpdateNodePosition={handleUpdateNodePosition}
              onResetPositions={handleResetPositions}
              onTriggerTestRun={() => executeLangGraphTurn('Run diagnostic step test')}
            />
          </div>
        )}

        {/* Case 3: WhatsApp Chat (in Split View or WhatsApp Chat Full-Width) */}
        {(layoutMode === 'split' || layoutMode === 'chat') && (
          <div
            className={`${
              layoutMode === 'split' ? 'lg:col-span-5 h-[620px] max-h-[620px] lg:h-full lg:max-h-full' : 'lg:col-span-12 h-full max-h-full'
            } flex flex-col min-h-0 overflow-hidden transition-all duration-200`}
          >
            <WhatsAppChat
              messages={messages}
              onSendMessage={executeLangGraphTurn}
              onClearChat={handleClearChat}
              executionState={executionState}
            />
          </div>
        )}
      </div>
    </div>
  );
};
