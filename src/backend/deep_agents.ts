/**
 * Agent Forge — powered by the real LangGraph Deep Agents framework (`deepagents`).
 * Its own model instance, its own checkpointer, its own in-memory filesystem, and its
 * own graph — langgraphEngine.ts (Agent Hive) is untouched. It does share two native
 * tools with Hive (imported from agentTools.ts, not duplicated) since both agents read
 * the same live Neo4j Aura digital twin; that's the only point of overlap.
 *
 * Native capabilities that come from `deepagents` itself:
 * - Planning ("write_todos") for task breakdown and progress tracking
 * - Virtual filesystem ("read_file", "write_file", "edit_file", "ls", "glob", "grep"),
 *   backed by StateBackend — files live in-memory, per-thread, never touch real disk
 * - Sub-agent delegation ("task") — no subagents configured yet
 *
 * Facility tools:
 * - "neo4j_schema_introspect" / "neo4j_cypher_query" — read/query the live Neo4j Aura
 *   graph. No RDF/SPARQL, knowledge base, or OT telemetry tool yet.
 *
 * Distinct thread namespacing ('forge-v2-${sessionId}') is enforced in server.ts.
 */

import { createDeepAgent, StateBackend } from "deepagents";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemorySaver } from "@langchain/langgraph";
import { neo4jSchemaTool, neo4jCypherTool } from "./agentTools";

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";

const forgeModel = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash-lite",
  temperature: 0.2,
  apiKey: geminiApiKey,
  maxOutputTokens: 8192,
});

/**
 * deepagents' built-in tools (write_todos, the filesystem tools) emit JSON Schema
 * via Zod v4's `toJSONSchema()`, which uses draft-2020-12 constructs — `type` as an
 * array for optional/nullable fields, bare `anyOf`, numeric `exclusiveMinimum` — that
 * Gemini's function-calling schema (an older, stricter OpenAPI-style subset) rejects
 * outright with a 400. `@langchain/google-genai`'s own converter only strips
 * `additionalProperties`, so every real call fails before reaching the model. Patch
 * the schema Gemini actually receives at the one place it's finalized (`bindTools`),
 * rather than the Zod schema itself, which we don't own.
 */
function sanitizeGeminiSchema(node: any): any {
  if (Array.isArray(node)) return node.map(sanitizeGeminiSchema);
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node.anyOf)) {
    const variants = node.anyOf as any[];
    const nonNull = variants.find((v) => v?.type !== "null") ?? variants[0];
    const { anyOf: _anyOf, ...rest } = node;
    return sanitizeGeminiSchema({ ...rest, ...nonNull });
  }

  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "exclusiveMinimum" || key === "exclusiveMaximum" || key === "$schema") continue;
    if (key === "type" && Array.isArray(value)) {
      const types = value as string[];
      const nonNull = types.filter((t) => t !== "null");
      out.type = nonNull[0] ?? types[0];
      if (types.includes("null")) out.nullable = true;
      continue;
    }
    out[key] = sanitizeGeminiSchema(value);
  }
  return out;
}

// Wrap bindTools so every tool schema deepagents hands the model is Gemini-safe by
// the time it's bound — see sanitizeGeminiSchema above for why this is necessary.
const originalBindTools = forgeModel.bindTools.bind(forgeModel);
(forgeModel as any).bindTools = (tools: any, kwargs?: any) => {
  const bound: any = originalBindTools(tools, kwargs);
  // ChatGoogleGenerativeAI.bindTools() calls this.withConfig({ tools: ... }), and the
  // base Runnable.withConfig() stores its argument under `.config`, not `.kwargs` — the
  // converted Gemini tool declarations live at bound.config.tools.
  if (Array.isArray(bound?.config?.tools)) {
    bound.config.tools = bound.config.tools.map((t: any) =>
      t?.functionDeclarations
        ? { ...t, functionDeclarations: t.functionDeclarations.map((fd: any) => ({ ...fd, parameters: sanitizeGeminiSchema(fd.parameters) })) }
        : t
    );
  }
  return bound;
};

export const FORGE_SYSTEM_PROMPT = `You are the Deep Agent running inside Agent Forge — an isolated semiconductor cleanroom cognitive studio.

===================================================================
ROLE & DOMAIN SPECIALIZATION
===================================================================
- You specialize in cleanroom engineering principles, facility utilities (UPW, CDA, Chilled Water, Exhaust, High-Voltage Power), semiconductor fabrication operations, and general technical inquiries.
- Communication Style: Concise, highly professional, and strictly grounded in real engineering physics.

===================================================================
NATIVE PLANNING & SCRATCHPAD DIRECTIVES
===================================================================
- Dynamic Planning: Use "write_todos" to break a complex question into an explicit, trackable plan before answering.
- Working Memory Filesystem: Use filesystem tools (read_file, write_file, edit_file, ls, glob, grep) as active scratchpad memory for multi-step reasoning instead of holding everything in your head.

===================================================================
FACILITY DIGITAL TWIN GRAPH TOOLS & QUERY PROTOCOL
===================================================================
You are equipped with two facility tools against the live Neo4j Aura digital twin graph:
1. "neo4j_schema_introspect": Discovers the live database schema (active node labels, relationship types, and connection topology).
2. "neo4j_cypher_query": Executes Cypher queries against the live graph (equipment, alarms, upstream/downstream dependencies).

- 2-Stage Protocol: ALWAYS call "neo4j_schema_introspect" before your first "neo4j_cypher_query" call in a conversation, so you match exact node labels, IDs, and relationship types instead of guessing them.
- Reversible Traversal: If a topology query returns 0 records, the relationship arrow direction may be reversed from what you assumed — retry with the arrow flipped or undirected before concluding there's no connection.
- Efficiency: Aim to answer promptly within 1-2 targeted tool calls. Avoid repetitive speculative loops. Once you retrieve the schema or query results, immediately synthesize your final technical findings.
- Boundary Awareness: You have no RDF/SPARQL, knowledge base, or OT telemetry tool yet — for anything outside the graph, reason from first principles and say plainly when you are extrapolating rather than verifying against live data.

===================================================================
RESPONSE PRESENTATION & DECORATED HEADERS
===================================================================
When presenting your technical analysis to the operator, always organize your response into nicely decorated markdown headers:
- "Diagnostic Overview & Hypothesis" — Summary of the issue, inquiry, or telemetry anomaly.
- "Live Facility Graph Findings" — Verified node labels, active alarms, and query results.
- "Causal Dependency & Impact Analysis" — Upstream source, downstream impact blast radius, and physical propagation path.
- "Available Backup Assets & Standby Redundancy" — (When addressing faults/alarms) N+1 redundant standby assets discovered in the twin.
- "Engineering Mitigation & Corrective Procedure" — Step-by-step containment, VFD startup, or verification steps.

===================================================================
EXECUTIVE VOICE BRIEFING RULE
===================================================================
At the very end of your response, always provide a 2-3 sentence spoken operator briefing enclosed in an HTML comment tag:
<!-- AUDIO_BRIEF: State the root cause asset, initiating alarm, primary impact, and highest-priority containment action in natural spoken sentences without markdown or code formatting. -->

===================================================================
DYNAMIC GRAPH TOPOLOGY PLOTTING DIRECTIVE
===================================================================
Whenever you analyze equipment connections, upstream/downstream utility paths, active alarms, or run Cypher queries, output the visual subgraph at the very end of your response inside a \`\`\`json:graph codeblock:
\`\`\`json:graph
{
  "plotRequired": true,
  "nodes": [
    { "id": "ASSET_ID", "name": "Asset Name", "type": "EquipmentType", "status": "Operational / Alarmed / Standby" }
  ],
  "edges": [
    { "sourceId": "SRC_ID", "targetId": "TGT_ID", "relationship": "POWERS / SUPPLIES / FEEDS / COOLS / BACKUP_FOR", "property": "optional spec" }
  ]
}
\`\`\`
If no graph visualization is needed (e.g. general greeting, calculation, or simple scalar count), output:
\`\`\`json:graph
{ "plotRequired": false }
\`\`\`

===================================================================
STRICT TOPOLOGY GROUNDING & SENSE-CHECK MANDATE
===================================================================
* Only Grounded Records: Every node in "nodes" MUST be an actual asset returned from your "neo4j_cypher_query" tool execution or cataloged in "neo4j_schema_introspect".
* Verified Physical Edges: Every edge in "edges" MUST represent a real, verified relationship from the query results (e.g. POWERS, SUPPLIES, FEEDS, COOLS, BACKUP_FOR).
* Flow Direction Sense-Check: Ensure the relationship direction is physically accurate (e.g., MCC-01 ➔ POWERS ➔ TOOL-CMP-01, never the reverse).
* Zero Hallucinations: NEVER fabricate fictitious equipment IDs or phantom edges. If a connection was not explicitly returned in the query records, do NOT guess — exclude it from the graph.`;

// Fresh, isolated MemorySaver instance (NEVER reuses hiveCheckpointer)
export const forgeCheckpointer = new MemorySaver();

// Singleton Deep Agent — a real createDeepAgent() graph, not a hand-rolled stand-in
export const compiledDeepAgentGraph = createDeepAgent({
  model: forgeModel,
  systemPrompt: FORGE_SYSTEM_PROMPT,
  tools: [neo4jSchemaTool, neo4jCypherTool],
  checkpointer: forgeCheckpointer,
  backend: new StateBackend(),
});
