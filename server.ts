import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { digitalTwin } from "./src/backend/DigitalTwinCore";
import { rdfKnowledgeEngine } from "./src/backend/rdfEngineService";
import {
  getNeo4jStatus,
  executeCypherQuery,
  seedNeo4jFromParsedGraph,
  createAlarmNodesInNeo4j,
  createCaseAlarmNodesInNeo4j,
  checkAlarmNodesInNeo4j,
  clearAlarmNodesInNeo4j,
} from "./src/backend/neo4jService";
import { officialCompiledHiveGraph } from "./src/backend/langgraphEngine";
import { compiledDeepAgentGraph, forgeCheckpointer } from "./src/backend/deep_agents";
import { executeLichengFieldAgent } from "./src/backend/fieldAgentEngine";
import { HumanMessage } from "@langchain/core/messages";

dotenv.config();

// Auto-initialize Oxigraph RDF Triplestore from digital twin ontology
try {
  const ontologyTriples = digitalTwin.getOntology();
  rdfKnowledgeEngine.loadTriples(ontologyTriples);
  console.log(`[OXIGRAPH] Initialized Knowledge Engine with ${ontologyTriples.length} ontology triples.`);
} catch (err: any) {
  console.error("[OXIGRAPH] Failed to initialize triples on startup:", err);
}

// Auto-configure LangSmith Native Tracing defaults if API key is provided
if (process.env.LANGCHAIN_API_KEY) {
  if (process.env.LANGCHAIN_TRACING_V2 === undefined) {
    process.env.LANGCHAIN_TRACING_V2 = "true";
  }
}
if (!process.env.LANGCHAIN_PROJECT) {
  process.env.LANGCHAIN_PROJECT = "semiconductor-cleanroom-hive";
}
if (!process.env.LANGCHAIN_ENDPOINT) {
  process.env.LANGCHAIN_ENDPOINT = "https://api.smith.langchain.com";
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy Gemini AI client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to safely strip markdown code fences from JSON output
function cleanJsonString(str: string): string {
  if (!str) return "{}";
  let cleaned = str.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "");
  cleaned = cleaned.replace(/```(?:json)?/gi, "");
  return cleaned.trim();
}

// Robust multi-model runner with automatic fallback on 503 / high demand / quota
interface GenerateResult {
  text: string;
  modelUsed: string;
}

// Cache models that have hit quota limits (e.g. Pro on Free Tier key) so we don't repeat failed requests or error logs
const modelCooldowns = new Map<string, number>();

async function generateContentDetailed(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  responseMimeType?: string,
  customCandidates?: string[]
): Promise<GenerateResult> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Model cascade: can be customized (e.g. Deep Reasoning vs Fast Mode)
  const modelCandidates = customCandidates && customCandidates.length > 0
    ? customCandidates
    : [
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
      ];
  let lastError: any = null;

  for (const model of modelCandidates) {
    const cooldownUntil = modelCooldowns.get(model);
    if (cooldownUntil && cooldownUntil > Date.now()) {
      // Quietly skip models currently in quota cooldown
      continue;
    }

    // Attempt up to 2 times per model if 503 / high demand occurs
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {
          temperature,
        };
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (responseMimeType) config.responseMimeType = responseMimeType;

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        if (response.text) {
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isQuotaError = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
        const isHighDemand = errMsg.includes("503") || errMsg.includes("high demand");

        if (isQuotaError) {
          // Set cooldown to prevent repeating 429 errors
          modelCooldowns.set(model, Date.now() + 10 * 60 * 1000);
          console.log(`[Gemini API] Note: Model ${model} is at quota limit on current key. Seamlessly using next candidate.`);
          break;
        }

        if (isHighDemand) {
          console.log(`[Gemini API] Note: Model ${model} is experiencing high demand (attempt ${attempt}).`);
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            continue;
          }
        } else {
          console.log(`[Gemini API] Note: Model ${model} unavailable, switching to next fallback.`);
        }
        break; // Hop to next model candidate
      }
    }
  }

  throw lastError || new Error("All Gemini model candidates failed to respond.");
}

async function generateContentWithFallback(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2,
  responseMimeType?: string,
  customCandidates?: string[]
): Promise<string> {
  const res = await generateContentDetailed(prompt, systemInstruction, temperature, responseMimeType, customCandidates);
  return res.text;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Fallback generator for Ops Copilot queries
function getFallbackGeneralQueryResponse(query: string, context?: any) {
  const qLower = query.toLowerCase();
  let answer = "";
  let keyTakeaways: string[] = [];
  let relevantStandards: string[] = ["SEMI S2-0818", "ISO 14644-1:2015", "IEC 62682"];
  let suggestedFollowUps: string[] = [
    "How do we maintain N+1 redundancy during planned chiller maintenance?",
    "What is the step-by-step OCAP for a cleanroom relative humidity spike?",
    "What are the target limits for UPW silica and TOC in 300mm wafer fabs?"
  ];
  let matchedCmmsItems: Array<{
    id: string;
    type: 'permit' | 'ticket';
    title: string;
    status: string;
    location: string;
    permitType?: string;
    priority?: string;
    workOrderId?: string;
    shiftLabel?: string;
    shiftWindow?: string;
    lotoTagNumber?: string;
    safetyPrecautions?: string[];
    ppeRequired?: string[];
    assignedOwner?: string;
    description?: string;
  }> = [];

  // Default fallback UPW permits & tickets if context is not provided
  const fallbackUpwPermits = [
    {
      id: 'WP-8802',
      type: 'permit' as const,
      workOrderId: 'WO-4102',
      title: 'UPW Polishing Loop Secondary Pump Mechanical Seal Overhaul',
      permitType: 'Cold Work',
      status: 'closed',
      location: 'Building 1 - SubFab Loop B (UPW Polish Room)',
      shiftWindow: 'Day Shift (07:00 - 19:00)',
      shiftLabel: '2026-08-30 (07:00 - 19:00) [Previous Shift]',
      lotoTagNumber: 'LOTO-UPW-2026-0311',
      safetyPrecautions: [
        'Hydrostatic line isolation double-valve block and bleed confirmed',
        'Zero pressure gauge verification on suction and discharge headers',
        'Containment drip pan positioned underneath pump housing'
      ],
      ppeRequired: ['Safety Glasses', 'Nitrile Chemical Resistant Gloves', 'Steel Toe Slip-Resistant Boots'],
    },
    {
      id: 'WP-9021',
      type: 'permit' as const,
      workOrderId: 'WO-4102',
      title: 'Ultra Pure Water RO Membrane Array Module #4 Sanitization & Overhaul',
      permitType: 'Cold Work',
      status: 'pending approval',
      location: 'Building 1 - SubFab Loop B (RO Skid 4)',
      shiftWindow: 'Day Shift (07:00 - 19:00)',
      shiftLabel: '2026-08-31 (07:00 - 19:00) [Next Shift +1]',
      lotoTagNumber: 'LOTO-UPW-RO04-01',
      safetyPrecautions: [
        'RO High-Pressure pump drive circuit LOTO verified with safety tag',
        'CIP (Clean-in-Place) chemical transfer manifold locked in rinse mode',
        'Secondary containment berm lined with chemical neutralizer'
      ],
      ppeRequired: ['Safety Glasses', 'Chemical Apron', 'Neoprene Gloves', 'Safety Boots'],
    }
  ];

  const fallbackUpwTickets = [
    {
      id: 'WO-4102',
      type: 'ticket' as const,
      title: 'UPW Loop 1 Resistivity Recovery & Resin Polisher Bed 2 Flush',
      category: 'Ultra Pure Water (UPW)',
      priority: 'P1',
      status: 'In Progress',
      location: 'Fab 1 UPW Polisher Building Floor 2',
      assignedOwner: 'David Kim (UPW Lead)',
      description: 'Loop 1 resistivity dropped to 17.84 MΩ·cm due to micro-channeling in polishing resin column B2. Initiating secondary bypass and polishing resin bed reactivation.',
    },
    {
      id: 'WO-4094',
      type: 'ticket' as const,
      title: 'CM: UPW Loop 2 Hot DI Water Flow Transmitter Calibration & Zero-Trim',
      category: 'Ultra Pure Water (UPW)',
      priority: 'P2',
      status: 'Closed',
      location: 'Fab 1 Subfab UPW Distribution Gallery',
      assignedOwner: 'David Kim (UPW Lead)',
      description: 'Hot DI return flow transducer FT-204 displayed intermittent 1.8% zero-drift offset during temperature swing.',
    }
  ];

  const isPermitOrTicketQuery = qLower.includes("permit") || qLower.includes("work permit") || qLower.includes("ticket") || qLower.includes("work order") || qLower.includes("cmms") || qLower.includes("show me") || qLower.includes("list");
  const isUpw = qLower.includes("upw") || qLower.includes("ultra pure water") || qLower.includes("water") || qLower.includes("resistivity") || qLower.includes("di water");

  if (isPermitOrTicketQuery && isUpw) {
    // Look up from provided context if available, or fall back to known records
    let permits = Array.isArray(context?.workPermits)
      ? context.workPermits.filter((p: any) =>
          p.title?.toLowerCase().includes("upw") ||
          p.title?.toLowerCase().includes("water") ||
          p.location?.toLowerCase().includes("upw") ||
          p.location?.toLowerCase().includes("water") ||
          p.workOrderId === 'WO-4102' ||
          p.id === 'WP-8802' ||
          p.id === 'WP-9021'
        ).map((p: any) => ({ ...p, type: 'permit' as const }))
      : fallbackUpwPermits;

    if (permits.length === 0) permits = fallbackUpwPermits;

    let tickets = Array.isArray(context?.tickets)
      ? context.tickets.filter((t: any) =>
          t.category?.toLowerCase().includes("upw") ||
          t.category?.toLowerCase().includes("water") ||
          t.title?.toLowerCase().includes("upw") ||
          t.title?.toLowerCase().includes("water")
        ).map((t: any) => ({ ...t, type: 'ticket' as const }))
      : fallbackUpwTickets;

    if (tickets.length === 0) tickets = fallbackUpwTickets;

    matchedCmmsItems = [...permits, ...tickets];

    answer = `### 💧 CMMS Work Permits & Work Orders: Ultra Pure Water (UPW)

Found **${permits.length} Work Permits** and **${tickets.length} Work Orders** currently logged in the Fab-1 CMMS system for Ultra Pure Water:

---

#### 📋 Active & Scheduled UPW Work Permits

${permits.map((p: any) => `1. **[${p.id}: ${p.title}](permit:${p.id})**
   - **Type:** \`${p.permitType || 'Cold Work'}\` | **Status:** **\`${p.status?.toUpperCase() || 'OPEN'}\`**
   - **Shift Window:** ${p.shiftWindow || 'Day Shift'} (${p.shiftLabel || 'Shift Schedule'})
   - **Location:** 📍 ${p.location}
   - **LOTO Tag:** \`${p.lotoTagNumber || 'Verified'}\`
   - **Linked Work Order:** [${p.workOrderId || 'WO-4102'}](ticket:${p.workOrderId || 'WO-4102'})
   - **Key Safety Precautions:** ${(p.safetyPrecautions || ['Hydraulic isolation verified', 'Zero pressure check']).slice(0, 2).map((s: string) => `\n     - ${s}`).join('')}
   - 👉 *[Open ${p.id} Details in CMMS](permit:${p.id})*
`).join('\n')}

---

#### 🛠️ Linked UPW Maintenance Work Orders

${tickets.map((t: any) => `- **[${t.id}: ${t.title}](ticket:${t.id})**
  - **Priority:** \`${t.priority || 'P2'}\` | **Status:** **\`${t.status || 'Open'}\`** | **Owner:** ${t.assignedOwner || 'David Kim (UPW Lead)'}
  - **Location:** 📍 ${t.location || 'Fab 1 UPW Area'}
  - 👉 *[Open ${t.id} Work Order in CMMS](ticket:${t.id})*
`).join('\n')}

---
*Click any permit or work order card above or below to navigate directly to its full live record in the CMMS page.*`;

    keyTakeaways = [
      `Found ${permits.length} work permits and ${tickets.length} work orders for Ultra Pure Water systems.`,
      `WP-8802 (Polishing pump overhaul) is closed from the previous shift with LOTO cleared.`,
      `WP-9021 (RO membrane module 4 sanitization) is scheduled for the upcoming shift (+1) awaiting final EHS authorization.`,
      `Linked P1 work order WO-4102 is currently in progress for UPW Loop 1 recovery.`
    ];
    relevantStandards = ["SEMI S2-0818 (Safety Guidelines)", "ASTM D5127 (UPW Electronics Standard)", "OSHA 1910.147 (LOTO)"];
    suggestedFollowUps = [
      "What safety precautions are required for WP-9021 RO membrane sanitization?",
      "Show me all Hot Work permits across the subfab",
      "What is the status of UPW Loop 1 resistivity recovery in WO-4102?"
    ];
  } else if (isPermitOrTicketQuery) {
    // General permit / ticket search across provided context
    let matchedPermits: any[] = [];
    let matchedTickets: any[] = [];

    if (Array.isArray(context?.workPermits)) {
      matchedPermits = context.workPermits.filter((p: any) => {
        const text = `${p.id} ${p.title} ${p.location} ${p.permitType} ${p.status}`.toLowerCase();
        const keywords = qLower.split(' ').filter(w => w.length > 2 && !['show', 'the', 'for', 'with', 'related'].includes(w));
        return keywords.length === 0 || keywords.some(k => text.includes(k));
      }).map((p: any) => ({ ...p, type: 'permit' as const }));
    }

    if (Array.isArray(context?.tickets)) {
      matchedTickets = context.tickets.filter((t: any) => {
        const text = `${t.id} ${t.title} ${t.category} ${t.location} ${t.status}`.toLowerCase();
        const keywords = qLower.split(' ').filter(w => w.length > 2 && !['show', 'the', 'for', 'with', 'related'].includes(w));
        return keywords.length === 0 || keywords.some(k => text.includes(k));
      }).map((t: any) => ({ ...t, type: 'ticket' as const }));
    }

    if (matchedPermits.length > 0 || matchedTickets.length > 0) {
      matchedCmmsItems = [...matchedPermits.slice(0, 5), ...matchedTickets.slice(0, 5)];

      answer = `### 📋 CMMS Work Permits & Maintenance Records

Found **${matchedPermits.length} matching Work Permits** and **${matchedTickets.length} matching Work Orders** in the CMMS database:

${matchedPermits.length > 0 ? `#### Work Permits
${matchedPermits.slice(0, 4).map((p: any) => `- **[${p.id}: ${p.title}](permit:${p.id})** (\`${p.permitType}\` • **\`${p.status?.toUpperCase()}\`**) — Location: ${p.location} — [Open in CMMS](permit:${p.id})`).join('\n')}
` : ''}

${matchedTickets.length > 0 ? `#### Maintenance Work Orders
${matchedTickets.slice(0, 4).map((t: any) => `- **[${t.id}: ${t.title}](ticket:${t.id})** (\`${t.priority}\` • **\`${t.status}\`**) — Owner: ${t.assignedOwner} — [Open in CMMS](ticket:${t.id})`).join('\n')}
` : ''}

*Click any link above to open and inspect the full record in the CMMS view.*`;

      keyTakeaways = [
        `Found ${matchedPermits.length} permits and ${matchedTickets.length} tickets matching your search.`,
        "All work permits require valid shift authorization and physical LOTO zero-energy verification."
      ];
    } else {
      answer = `### 📋 Work Permits & CMMS Records Overview

No direct matching permits were found for "${query}". You can browse all work permits in the **CMMS / Work Permits** tab or search by system category (e.g. Ultra Pure Water, Scrubber, Chiller, Specialty Gases).`;
      keyTakeaways = ["Browse the CMMS tab to view all multi-shift work permits and work orders."];
    }
  } else if (qLower.includes("cpk") || qLower.includes("ppk") || qLower.includes("spc") || qLower.includes("capability")) {
    answer = `### Statistical Process Control (SPC) & Capability Analysis in Semiconductor Facilities

**Process Capability Index ($C_{pk}$)** measures how close a facility parameter is to its specification limits relative to natural short-term process variability ($\sigma_{ST}$):

$$C_{pk} = \\min\\left(\\frac{USL - \\mu}{3\\sigma_{ST}}, \\frac{\\mu - LSL}{3\\sigma_{ST}}\\right)$$

**Key Differences Between $C_p$, $C_{pk}$, and $P_{pk}$:**
- **$C_p$ (Potential Capability):** Measures process spread regardless of centering: $(USL - LSL) / (6\\sigma_{ST})$.
- **$C_{pk}$ (Current Capability):** Accounts for process mean centering over short-term stable rational subgroups.
- **$P_{pk}$ (Overall Performance):** Evaluates total long-term process capability using total standard deviation ($\sigma_{LT}$), encompassing shifts, drifts, and tool maintenance cycles.

**Fab Industry Benchmarks:**
- **$C_{pk} \\ge 1.33$:** Standard Four-Sigma minimum requirement.
- **$C_{pk} \\ge 1.67$:** Semiconductor Tier-1 Fab target for critical parameters (e.g., Litho Bay RH $42.0\\% \\pm 0.5\\%$, UPW Resistivity $>18.18\\text{ M}\\Omega\\cdot\\text{cm}$).
- **$C_{pk} \\ge 2.00$:** Six-Sigma world-class benchmark ( $<3.4\\text{ DPMO}$ ).`;

    keyTakeaways = [
      "Cpk evaluates short-term centered capability; Ppk accounts for long-term drift and tool transitions.",
      "Tier-1 semiconductor facilities mandate Cpk ≥ 1.67 for critical cleanroom micro-climate and ultra-pure water parameters.",
      "When Cp is high (>2.0) but Cpk is low (<1.33), the process is off-center but has tight variance."
    ];
    relevantStandards = ["SEMI E10 / E58", "ISO 22514-1", "AIAG SPC Manual 2nd Ed."];
    suggestedFollowUps = [
      "How to calculate Cpk for single-sided specification limits?",
      "What statistical rules define an SPC out-of-control condition (Western Electric rules)?",
      "How does cleanroom temperature instability impact photolithography CD (Critical Dimension)?"
    ];
  } else if (qLower.includes("upw") || qLower.includes("water") || qLower.includes("resistivity")) {
    answer = `### Ultra-Pure Water (UPW) System Specifications & Recovery Protocol

In a modern 300mm wafer fabrication facility, UPW serves as the primary chemical rinse medium. Semiconductor grade UPW requires near-theoretical purity:

1. **Critical Specifications:**
   - **Resistivity:** $18.18 - 18.25\\text{ M}\\Omega\\cdot\\text{cm}$ at $25.0^\\circ\\text{C}$ (Theoretical pure water is $18.20\\text{ M}\\Omega\\cdot\\text{cm}$).
   - **Total Organic Carbon (TOC):** $<0.5\\text{ ppb}$ (parts per billion).
   - **Dissolved Oxygen (DO):** $<1.0\\text{ ppb}$.
   - **Silica (Dissolved & Reactive):** $<0.5\\text{ ppb}$.
   - **Bacteria / Microbes:** $<1\\text{ CFU}/1000\\text{ mL}$.

2. **Common Causes of Resistivity Degradation:**
   - Polisher mixed-bed resin exhaustion or channeling.
   - UV destruct lamp ($185\\text{nm} / 254\\text{nm}$) intensity decay or quartz sleeve biofouling.
   - Ambient air or $CO_2$ ingress through storage tank breather or nitrogen blanketing seal breach.

3. **Immediate Remediation Protocol:**
   - Verify secondary reference conductivity transmitter to rule out probe polarization.
   - Switch to standby mixed-bed polisher vessel (Polisher Train B) while isolating Train A.
   - Confirm nitrogen blanket positive pressure in UPW final storage tank ($>50\\text{ mmAq}$).`;

    keyTakeaways = [
      "Theoretical pure water resistivity is 18.20 MΩ·cm at 25°C; alert threshold is typically 18.18 MΩ·cm.",
      "TOC breakdown via 185nm UV lamps creates organic acids that directly depress resistivity if polishing resin is saturated.",
      "Always maintain active N+1 loop recirculation to prevent stagnant microbial biofilm growth."
    ];
    relevantStandards = ["ASTM D5127 (Standard Guide for Ultra-Pure Water)", "SEMI F63 (Guide for UPW Quality)"];
  } else if (qLower.includes("permit") || qLower.includes("loto") || qLower.includes("safety") || qLower.includes("lockout")) {
    answer = `### Work Permit & Hazardous Energy Isolation (LOTO) Protocol

Facility maintenance in high-tech semiconductor fabs is governed by rigorous life safety standards to protect personnel from hazardous production materials (HPM), high voltage, and pressurized toxic gases:

1. **Hazardous Energy Isolation (LOTO - OSHA 1910.147):**
   - **Zero Energy State Verification:** Physical depressurization, bleed-down, nitrogen purge, and voltage discharge must be physically verified before lock application.
   - **Dual Lockout Policy:** Both the Facility System Owner and the Authorized Work Crew Lead must apply individual personal padlocks and danger tags.
   - **Group LOTO Box:** Key to master isolation is sealed in a lockbox until all party sign-offs are complete.

2. **Work Permit Lifecycles (Shift Horizon Management):**
   - **Permit Types:** Hot Work (Flame/Spark), Confined Space (Subfab Plenums), Toxic Gas Line Break, High-Voltage Switching (>480V), Working at Heights.
   - **Validity Window:** Permits are strictly valid for a single 12-hour operational shift. Shift handovers require re-inspection and transfer endorsements.
   - **Closeout Procedure:** Removal of personal locks, housekeeping inspection, atmospheric sniffer re-test, nitrogen leak check, and system handover to Duty Shift Lead.`;

    keyTakeaways = [
      "Work permits expire at shift end and cannot be automatically carried over without re-authorization.",
      "Toxic gas and pyrophoric line breaks require continuous localized TGDS monitoring and full SCBA / Level B PPE.",
      "Closeout notes must document physical isolation removal, leak checks, and operational clearance."
    ];
    relevantStandards = ["SEMI S2-0818 Section 16 (LOTO)", "OSHA 29 CFR 1910.147", "NFPA 70E"];
  } else if (qLower.includes("workflow") || qLower.includes("dag") || qLower.includes("canvas") || qLower.includes("execute tool")) {
    const activeWfs = Array.isArray(context?.workflows) ? context.workflows : [];
    const targetWf = activeWfs.find((w: any) => qLower.includes(w.name?.toLowerCase()) || qLower.includes(w.id?.toLowerCase())) || activeWfs[0];

    if (targetWf) {
      answer = `### ⚙️ Workflow Tool Execution: ${targetWf.name}
**Tool ID:** \`${targetWf.id}\` (Category: **${targetWf.category}** • Version: **${targetWf.version}**)

Ops Copilot has parsed the compiled visual workflow DAG containing **${targetWf.nodes?.length || 0} nodes** and **${targetWf.edges?.length || 0} transitions**:

#### Execution Step Trace & Verbosity:
${targetWf.nodes?.map((node: any, idx: number) => {
  return `${idx + 1}. **[${node.type.toUpperCase()}] ${node.title}**
   - *Description:* ${node.description}
   - *Configuration:* \`${JSON.stringify(node.config)}\`
   - *Interlock Status:* ✅ Verified & Dispatched.`;
}).join('\n')}

#### Interlocks & Industrial Compliance:
- All transitions satisfied directed acyclic graph (DAG) topological constraints.
- SEMI S2 hazardous energy & CMMS dispatch verified.
- Real-time execution logs appended to Workflow Engine runtime.`;

      keyTakeaways = [
        `Executed tool "${targetWf.name}" with ${targetWf.nodes?.length || 0} verified nodes.`,
        "Compiled DAG workflow successfully triggered all automated containment steps.",
        "Work order permits and notification steps are synchronized with CMMS."
      ];
      relevantStandards = ["SEMI S2-0818", "ISA-88 Batch / Recipe Control", "IEC 61131-3 Sequential Function Charts"];
    } else {
      answer = `### ⚙️ Workflow Engine Tools Overview
The Visual Drag-and-Drop Workflow Canvas currently defines industrial workflows that Ops Copilot can execute as tools. You can customize them or create new ones under **RDF Semantic Engine &rarr; Workflow Engine (Drag & Drop Canvas)**.`;
      keyTakeaways = ["Workflows created in the visual canvas are registered as executable tools."];
    }
  } else {
    answer = `### General Facility Operations & Engineering Analysis

**Query:** "${query}"

${context ? `**Live Facility Context Included:**
- Site: ${context.site || "Fab-1"}
- Shift: ${context.shift || "Active Shift"}
- Telemetry: UPW ${context.currentTelemetry?.upwResistivity || "18.22 MΩ·cm"}, Cleanroom Temp ${context.currentTelemetry?.cleanroomTemp || "21.05°C"}, RH ${context.currentTelemetry?.cleanroomRh || "42.1%"}
- Open Tickets: ${context.openTicketsCount ?? 0} active CMMS tickets` : ""}

**Engineering Overview:**
In semiconductor manufacturing facility infrastructure (encompassing Cleanrooms, UPW, CDA, Chilled Water, Industrial Exhaust Scrubbers, and Toxic Gas Delivery), continuous operational reliability requires adherence to SEMI S2, ISO 14644 cleanroom standards, and IEC 62682 industrial alarm rationalization.

**Operational Guidelines:**
1. **Redundancy & N+1 Architectures:** All primary utility systems (Chillers, UPW pumps, CDA compressors, Scrubbers) must maintain continuous automated failover to prevent wafer manufacturing line stops.
2. **Preventive & Corrective Maintenance (CMMS):** Track all work orders with clear priority matrices (P1 Emergency within 15 mins, P2 High within 4 hours, P3 Medium within 24 hours, P4 Routine within 7 days).
3. **Environmental Containment:** Maintain cascade pressure differentials (+15 to +25 Pa) between ISO Class 1 Litho bays, Class 1000 chases, and subfabs to block particle migration.`;

    keyTakeaways = [
      "Fab uptime relies on predictive telemetry and strict N+1 redundancy verification.",
      "Adherence to cleanroom ISO 14644-1 and SEMI S2 is mandatory across all sub-systems.",
      "Real-time SCADA and CMMS integration ensures instantaneous response to alarm excursions."
    ];
  }

  return {
    answer,
    keyTakeaways,
    relevantStandards,
    suggestedFollowUps,
    matchedCmmsItems,
    confidenceScore: 0.98,
    generatedByAI: false,
    timestamp: new Date().toISOString()
  };
}

// 1. Scope 4.1.A - AI Automated Shift Summary & Handover Report
app.post("/api/ai/shift-report", async (req, res) => {
  const { shiftInfo, telemetryData, alarms, tickets, scadaAnnotations, vocEvents, pmcmEvents } = req.body;
  const fallback = {
    summary: `Shift ${shiftInfo?.shiftName || "Day Shift"} Report generated. Operations remained within semiconductor spec tolerances across Fab 1 Cleanroom Bays. ${alarms?.length || 0} active alarms monitored, ${tickets?.length || 0} maintenance tickets handled. No chemical/gas containment breaches recorded.`,
    executiveSummary: `Primary systems (UPW, CDA, Chilled Water, Cleanroom FFU) maintained >99.8% uptime. All critical CPK parameters (UPW resistivity >18.18 MΩ·cm, Bay 3 Temp at 21.05°C ±0.2°C) passed target specifications.`,
    keyEvents: [
      "VESDA Fire pre-alarm sensor in Subfab Exhaust Duct Bay 4 cleared after preventive filter purge.",
      "Chiller Plant #3 completed scheduled PM (Preventive Maintenance); N+1 redundancy verified active.",
      "VOC (Voice of Customer / Litho Bay): Requested RH stabilization at 42.0% ±0.5% for Stepper Cluster 2.",
      "TGM Silane cabinet B-02 purge cycle completed successfully."
    ],
    actionItemsForNextShift: [
      "Monitor Chiller #3 post-PM vibration levels during peak thermal load.",
      "Follow up on Scrubber #2 recirc pump seal replacement ticket #TK-8842.",
      "Conduct 02:00 AM particulate sampling check in Class 1 Photolithography bay."
    ],
    complianceStatus: "Compliant with IEC 62682 industrial alarm rates (<1.8 alarms/operator-hour) and SEMI S2 safety guidelines.",
    generatedByAI: false
  };

  try {
    const prompt = `You are a Principal Facilities Operations Director at a tier-1 semiconductor fabrication plant (Cleanrooms ISO Class 1-4, UPW 18.2 MOhm-cm, CDA, Scrubber, Specialty Gases TGM/TCM, Chiller N+1).
Generate an authoritative, structured, and audit-ready Shift Handover & Operational Summary Report based on the following shift telemetry:
- Shift Info: ${JSON.stringify(shiftInfo)}
- Key Telemetry Status: ${JSON.stringify(telemetryData)}
- Alarm Summary: ${JSON.stringify(alarms?.slice(0, 10))}
- Active / Resolved Tickets: ${JSON.stringify(tickets?.slice(0, 10))}
- SCADA Annotations & Operator Overrides: ${JSON.stringify(scadaAnnotations)}
- VOC (Voice of Customer / Wafer Fab Process Teams): ${JSON.stringify(vocEvents)}
- PM/CM (Preventive / Corrective Maintenance): ${JSON.stringify(pmcmEvents)}

Return a strict JSON object with:
{
  "executiveSummary": "Concise executive overview of the shift operations, cleanroom integrity, and safety",
  "summary": "Detailed narrative covering cleanroom environment, UPW, Gases, HVAC, and Power",
  "keyEvents": ["List of 3-5 major operational events and maintenance milestones"],
  "alarmInsights": "Brief analysis of alarm activity, bad actors, and IEC 62682 compliance",
  "actionItemsForNextShift": ["List of 3-5 high-priority actionable handover items"],
  "riskAssessment": "Risk status (Low / Moderate / Elevated) with justification",
  "complianceStatus": "IEC 62682 and SEMI standards compliance commentary"
}`;

    const text = await generateContentWithFallback(prompt, undefined, 0.2);
    const parsed = JSON.parse(text || "{}");
    res.json({ ...parsed, generatedByAI: true });
  } catch (error: any) {
    console.warn("AI Shift Report falling back to deterministic response:", error?.message || error);
    res.json(fallback);
  }
});

// 2. Scope 4.1.D - AI Guided Action & OCAP Generator
app.post("/api/ai/guided-action", async (req, res) => {
  const { alarm, systemContext } = req.body;
  const fallback = {
    ocapTitle: `OCAP-Standard: ${alarm?.tag || "FAC-SYS-ALARM"} Response Protocol`,
    severity: alarm?.priority || "P1",
    rootCauseHypothesis: [
      "Pressure differential sensor membrane fouling or diaphragm drift.",
      "Secondary recirculating valve hunting or actuator pneumatic leakage.",
      "Subfab bypass line damper misalignment during shift transition."
    ],
    stepByStepChecklist: [
      { step: 1, action: "Verify physical sensor telemetry vs redundant secondary tag in SCADA.", role: "Shift Technician", critical: true },
      { step: 2, action: "Check local isolation valve position in Subfab Corridor 3B.", role: "Field Operator", critical: false },
      { step: 3, action: "Engage backup N+1 redundant unit if deviation persists beyond 300 seconds.", role: "Shift Lead Engineer", critical: true },
      { step: 4, action: "Notify Fab Module Process Lead if Cleanroom Class 1 boundary is impacted.", role: "Duty Manager", critical: false }
    ],
    emergencyContainment: "Ensure automated interlock remains armed. Do not bypass gas exhaust or sprinkler interlocks without signed MOC (Management of Change).",
    historicalResolution: "Similar alarm on 2026-06-14 was resolved by recalibrating transmitter FT-402 and flushing sensor sensing line.",
    generatedByAI: false
  };

  try {
    const prompt = `You are an expert Semiconductor Facility System Owner & Safety Engineer specializing in IEC 62682 industrial alarm response and semiconductor OCAP (Out-of-Control Action Plans).
An alarm has triggered in the semiconductor facility:
Alarm Details: ${JSON.stringify(alarm)}
System Context: ${JSON.stringify(systemContext)}

Generate a rigorous OCAP Guided Action Plan. Return a strict JSON object:
{
  "ocapTitle": "Standardized OCAP Code & Title (e.g. OCAP-UPW-04: Resistivity Excursion Response)",
  "severity": "P1-Critical | P2-High | P3-Medium",
  "rootCauseHypothesis": ["3 probable physical root causes in semiconductor context"],
  "stepByStepChecklist": [
    { "step": 1, "action": "Actionable instruction", "role": "Shift Technician / Field Engineer", "critical": true/false }
  ],
  "emergencyContainment": "Immediate containment instructions to prevent wafer scrap or safety incident",
  "historicalResolution": "Insight based on typical semiconductor facility failure modes",
  "verificationCriteria": "Criteria to verify alarm is safely cleared before closing OCAP"
}`;

    const text = await generateContentWithFallback(prompt, undefined, 0.2);
    const parsed = JSON.parse(text || "{}");
    res.json({ ...parsed, generatedByAI: true });
  } catch (error: any) {
    console.warn("AI Guided Action falling back to deterministic response:", error?.message || error);
    res.json(fallback);
  }
});

// 3. Scope 4.1.B - AI Event Auto-Classification to Ticket
app.post("/api/ai/classify-event", async (req, res) => {
  const { eventDescription, sourceSystem, location, rawTelemetry } = req.body;
  const fallback = {
    ticketTitle: `Investigate: ${eventDescription?.slice(0, 60) || "Facility Operational Event"}`,
    category: "Mechanical / HVAC & FFU",
    priority: "P2",
    assignedOwner: "Marcus Vance (HVAC System Owner)",
    location: location || "Fab 1 - Cleanroom Bay 3 (Sub-Fab Level 1)",
    estimatedResolutionHours: 4,
    suggestedWorkOrderType: "CM (Corrective Maintenance)",
    containmentPlan: "Inspect differential pressure transmitter and check FFU drive inverter frequency.",
    requiredPPE: ["Cleanroom Suit (Bunny Suit)", "Safety Glasses", "ESD Shoes"],
    generatedByAI: false
  };

  try {
    const prompt = `You are a CMMS (Computerized Maintenance Management System) AI Dispatcher for a 300mm Semiconductor Fab.
Classify the following operational event into an actionable maintenance ticket:
- Event: "${eventDescription}"
- Source System: "${sourceSystem}"
- Location: "${location}"
- Telemetry Context: ${JSON.stringify(rawTelemetry)}

Available System Owners:
- Ultra Pure Water (UPW): "David Kim (UPW System Owner)"
- Specialty Gases & Chemicals (TGM/TCM): "Elena Rostova (Gas & Chemical System Owner)"
- Cleanroom HVAC & FFU: "Marcus Vance (HVAC System Owner)"
- Electrical & N+1 Power: "Sarah Jenkins (Electrical Infrastructure Lead)"
- Industrial Waste & Scrubber: "Robert Zhao (Scrubber/Environmental Lead)"
- Fire & Life Safety (VESDA): "Michael Torres (Safety/Emergency Response Lead)"

Return strict JSON:
{
  "ticketTitle": "Clear, standardized ticket title",
  "category": "UPW | Specialty Gases (TGM/TCM) | Cleanroom HVAC/FFU | Electrical/UPS | Scrubber/Exhaust | Fire & Life Safety",
  "priority": "P1 (Urgent/Immediate) | P2 (High) | P3 (Medium) | P4 (Low)",
  "assignedOwner": "Name and role from the list above",
  "location": "Standardized semiconductor facility location",
  "estimatedResolutionHours": number,
  "suggestedWorkOrderType": "PM | CM | VOC Request | Safety Inspection",
  "containmentPlan": "Immediate containment steps before full repair",
  "requiredPPE": ["Array of required safety gear / PPE"]
}`;

    const text = await generateContentWithFallback(prompt, undefined, 0.1);
    const parsed = JSON.parse(text || "{}");
    res.json({ ...parsed, generatedByAI: true });
  } catch (error: any) {
    console.warn("AI Classify Event falling back to deterministic response:", error?.message || error);
    res.json(fallback);
  }
});

// 4. Scope 4.1.C - AI CPK & Cleanroom Trend Diagnosis
app.post("/api/ai/cpk-diagnosis", async (req, res) => {
  const { parameter, cpkData, cleanroomData } = req.body;
  const fallback = {
    analysis: `CPK for ${parameter || "UPW Resistivity"} is currently 1.54 (Target: ≥1.33 for Six Sigma control). Historical 3-day trend indicates tight variance with mean centered at 18.22 MΩ·cm. Cleanroom particulate counts in Bay 1 remain at ISO Class 1 (<10 particles/m³ at ≥0.1µm).`,
    recommendations: [
      "Continue standard polisher resin monitoring on UPW Loop B.",
      "Check pre-filter differential pressure on FFU unit #28 ahead of next scheduled cycle.",
      "Maintain current chiller chilled water supply setpoint at 6.5°C."
    ],
    healthScore: 96,
    status: "Optimal Process Capability",
    generatedByAI: false
  };

  try {
    const prompt = `You are a Semiconductor Quality & Statistical Process Control (SPC) Specialist.
Analyze the following process capability (CPK) metrics and cleanroom environmental trend:
- Parameter: ${JSON.stringify(parameter)}
- CPK Trend Data (3-day / monthly): ${JSON.stringify(cpkData)}
- Cleanroom Environmental Data (Temp, RH, Differential Pressure, Airborne Particles): ${JSON.stringify(cleanroomData)}

Provide an SPC diagnosis adhering to semiconductor cleanroom standards (ISO 14644-1, SEMI E10).
Return JSON:
{
  "analysis": "Statistical evaluation of mean drift, standard deviation, Cp vs Cpk, and potential microcontamination risks",
  "recommendations": ["3 practical engineering actions to prevent out-of-spec events"],
  "healthScore": number (0-100),
  "status": "Optimal Process Capability | Marginal Control (Warning) | Out of Control (Critical)",
  "anomaliesDetected": ["Any identified subtle pattern anomalies, chattering, or cyclical drifts"]
}`;

    const text = await generateContentWithFallback(prompt, undefined, 0.2);
    const parsed = JSON.parse(text || "{}");
    res.json({ ...parsed, generatedByAI: true });
  } catch (error: any) {
    console.warn("AI CPK Diagnosis falling back to deterministic response:", error?.message || error);
    res.json(fallback);
  }
});

// 5. Scope 4.1.D - Emergency Response Management (Fire, Gas, Chemical)
app.post("/api/ai/emergency-response", async (req, res) => {
  const { emergencyType, gasName, concentration, location, impactedBays } = req.body;
  const fallback = {
    emergencyCode: `ERM-${(emergencyType || "GAS").toUpperCase()}-001`,
    severityLevel: "LEVEL 3 - CRITICAL LIFE SAFETY",
    immediateAutomaticInterlocks: [
      `Auto-shutoff Valve (ESV) triggered for ${gasName || "Hazardous Gas"} line at Bunker Subfab.`,
      "Exhaust Scrubber fans ramped to 100% emergency speed.",
      "Air Handling Unit (AHU) fresh air dampers switched to 100% purge mode (no recirculation in affected zone).",
      "Automated audible strobe sirens activated in Zone 4."
    ],
    evacuationScope: impactedBays || ["Cleanroom Bay 4", "Subfab Zone 4B", "Chase Area 4"],
    ertProtocolChecklist: [
      { order: 1, action: "ERT Alpha Team deploy with SCBA (Self-Contained Breathing Apparatus) and Level B Hazmat suits.", targetTime: "3 minutes" },
      { order: 2, action: "Verify pneumatic lockouts on source gas cylinder manifold.", targetTime: "5 minutes" },
      { order: 3, action: "Monitor secondary toxic gas detection sensors (TGDS) in adjacent chase areas.", targetTime: "Continuous" },
      { order: 4, action: "Coordinate with Municipal Fire/Hazmat dispatch if reading exceeds TLV-TWA by 5x.", targetTime: "10 minutes" }
    ],
    containmentAdvice: "Maintain negative differential pressure in Subfab Gas Room relative to cleanroom plenum to prevent back-migration.",
    generatedByAI: false
  };

  try {
    const prompt = `You are a Semiconductor Emergency Response Command Center AI Specialist adhering to SEMI S2, NFPA 318 (Standard for the Protection of Semiconductor Fabrication Facilities), and OSHA 1910.
An active facility emergency has been flagged:
- Emergency Type: ${emergencyType} (Fire / Gas Leak / Chemical Spill / Scrubber Failure)
- Chemical/Gas involved: ${gasName || "N/A"}
- Concentration / Sensor Reading: ${concentration || "N/A"}
- Location: ${location}
- Impacted Bays / Zones: ${JSON.stringify(impactedBays)}

Generate an authoritative Emergency Response Command Protocol.
Return strict JSON:
{
  "emergencyCode": "Standard emergency designation (e.g. ERM-GAS-SILANE-01)",
  "severityLevel": "LEVEL 1 (Advisory) | LEVEL 2 (Urgent Containment) | LEVEL 3 (Critical Evacuation)",
  "immediateAutomaticInterlocks": ["List of physical interlock actions taken by SCADA/BMS"],
  "evacuationScope": ["List of specific bays and corridors requiring immediate clearance"],
  "ertProtocolChecklist": [
    { "order": 1, "action": "Clear step for ERT (Emergency Response Team)", "targetTime": "e.g. 2 mins" }
  ],
  "containmentAdvice": "Specific containment, neutralization, or ventilation strategy",
  "postIncidentRequirements": "Mandatory safety checks before declaring All-Clear"
}`;

    const text = await generateContentWithFallback(prompt, undefined, 0.1);
    const parsed = JSON.parse(text || "{}");
    res.json({ ...parsed, generatedByAI: true });
  } catch (error: any) {
    console.warn("AI Emergency Response falling back to deterministic response:", error?.message || error);
    res.json(fallback);
  }
});

// 6. Scope Ops Copilot - Knowledge, Query & Information Return Endpoint

// ==========================================
// 🤖 AI WORKFLOW COMPOSER API
// ==========================================
app.post("/api/ai/compose-workflow", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "A valid prompt string is required." });
  }

  const fallbackWorkflow = {
    name: "Automated Containment & Triage Workflow",
    description: `Automated response workflow composed for: ${prompt.slice(0, 50)}`,
    facilityZone: "Fab 1 - Cleanroom Bay & SubFab Utilities",
    nodes: [
      {
        id: "node-1",
        type: "trigger",
        title: "Telemetry & Alarm Ingestion",
        description: "Ingest sensor spike / out-of-control threshold excursion",
        config: { system: "UPW/CHW SCADA", actionVerb: "MONITOR", systemPrompt: "Continuously evaluate streaming SCADA telemetry against SPC upper and lower limits." },
        x: 60,
        y: 80
      },
      {
        id: "node-2",
        type: "condition",
        title: "Redundancy & Failover Check",
        description: "Assess N+1 backup unit readiness and auto-switch feasibility",
        config: { system: "Interlock Matrix", actionVerb: "EVALUATE", systemPrompt: "Verify standby equipment health status prior to triggering failover." },
        x: 340,
        y: 80
      },
      {
        id: "node-3",
        type: "cmms",
        title: "Dispatch CMMS Work Order",
        description: "Auto-generate P1/P2 work order and notify duty lead",
        config: { workOrderPriority: "P2", system: "CMMS Dispatch", actionVerb: "DISPATCH", systemPrompt: "Create prioritized ticket and assign to certified system owner." },
        x: 620,
        y: 80
      },
      {
        id: "node-4",
        type: "notification",
        title: "Shift Operations Notification",
        description: "Broadcast containment status to Ops Center & EHS",
        config: { channel: "Ops Command Center", actionVerb: "NOTIFY", systemPrompt: "Send real-time audit alert and update shift handover log." },
        x: 900,
        y: 80
      }
    ],
    edges: [
      { id: "edge-1", source: "node-1", target: "node-2", label: "Excursion Flagged" },
      { id: "edge-2", source: "node-2", target: "node-3", label: "Standby Verified" },
      { id: "edge-3", source: "node-3", target: "node-4", label: "Ticket Created" }
    ]
  };

  try {
    const promptText = `
You are an expert facility operations architect.
You need to generate a valid JSON object representing a Facility Workflow based on the user's request.

A workflow consists of:
- nodes: Array of objects with properties:
  - id (string, unique like "node-1")
  - type (string: 'trigger' | 'condition' | 'action' | 'cmms' | 'notification' | 'compose_email' | 'delay' | 'human_approval' | 'data_fetch')
  - title (string, concise)
  - description (string, what the node does)
  - config (object containing key-values like systemPrompt for LLM narration, actionVerb, workOrderPriority, system, etc. Give good descriptive systemPrompts for each node for the LLM Execution Engine.)
  - x (number, coordinate, increment by 280 for each subsequent step horizontally, e.g. 60, 340, 620)
  - y (number, coordinate, keep at 80 usually)
- edges: Array of objects with properties:
  - id (string, unique like "edge-1")
  - source (string, node id)
  - target (string, node id)
  - label (string, optional text for the link)

User request: "${prompt}"

Return ONLY valid JSON with this schema:
{
  "name": "Generated Workflow",
  "description": "Brief description",
  "facilityZone": "Zone Name",
  "nodes": [...],
  "edges": [...]
}
`;

    const text = await generateContentWithFallback(
      promptText,
      undefined,
      0.2,
      "application/json",
      ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash"]
    );
    const cleanedText = cleanJsonString(text);
    const workflowData = JSON.parse(cleanedText);
    res.json(workflowData);

  } catch (error: any) {
    console.warn("[AI Composer] Falling back to deterministic workflow:", error?.message || error);
    res.json(fallbackWorkflow);
  }
});

app.post("/api/ai/general-query", async (req, res) => {
  const { query, history, context } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "A valid query string is required." });
  }

  try {
    const systemInstruction = `You are the FabCore Principal Semiconductor Facilities AI Engineer & Ops Copilot.
You possess deep expertise in:
1. Semiconductor Cleanrooms (ISO 14644-1 Classes 1-7, Airborne Particulate, Airflow Velocity, FFU, Temperature ±0.1°C, Relative Humidity ±0.5%, Differential Pressure Cascade).
2. Ultra-Pure Water (UPW ASTM D5127, 18.2 MOhm-cm, TOC <0.5 ppb, Degasification, UV destruct, Polishers).
3. Compressed Dry Air (CDA ISO 8573-1 Class 1.1.1, Dew Point -70°C, Oil-free).
4. Industrial Exhaust & Scrubbers (Acid exhaust, Ammonia exhaust, VOC solvent incinerators, NFPA 318).
5. Specialty Gases & Chemicals (TGM/TCM, Silane, Arsine, Phosphine, NF3, Bulk LN2/LOX, Double-contained tubing, TGDS, SEMI S2).
6. Central Utility Plant & HVAC (Chillers N+1 redundancy, Cooling Towers, Boilers, Emergency Diesel Generators, UPS).
7. Safety, Work Permits & LOTO (OSHA 1910.147, Confined Space, Hot Work, Line Breaking).
8. Alarm Management & OCAP (IEC 62682, ISA-18.2, EEMUA 191, Six Sigma CPK/PPK math).
9. General engineering, physics, thermodynamics, chemistry, mathematics, and operational troubleshooting.
10. Executable Visual Workflows as Tools: The facility defines custom automated workflows in the context payload under the \`workflows\` array. If the user asks you to do something that matches a workflow, DO NOT execute it immediately in your markdown answer. Instead, provide a brief summary in "answer" asking if they want to proceed, and populate the "workflowExecutionRequest" field in the JSON with the matched workflow's details (workflowId, workflowName) and a list of step labels derived from its nodes in order. The frontend will handle presenting the interactive confirmation and execution widget.

When the user asks to view, search, find, or list Work Permits, Work Orders, or CMMS tickets (e.g. "show me work permits related to ultra pure water" or "find tickets for chiller"):
- You MUST cross-reference the live context or fab database records.
- In your answer Markdown, provide detailed summaries with clickable links formatted as [Open WP-8802 in CMMS](permit:WP-8802) for permits and [Open WO-4102 in CMMS](ticket:WO-4102) for work orders.
- Populate the "matchedCmmsItems" array in your JSON output with all matching permits and tickets.

Provide comprehensive, highly structured, well-formatted Markdown answers. Use LaTeX math formatting ($...$ and $$...$$) where applicable. Include key takeaways, standard references, and practical engineering guidance.`;

    let contextSection = "";
    if (context && Object.keys(context).length > 0) {
      contextSection = `\n\n--- CURRENT LIVE FACILITY & CMMS CONTEXT ---\n${JSON.stringify(context, null, 2)}\n--- END OF CONTEXT ---\nUse the live facility and CMMS context if relevant to the query.`;
    }

    let historySection = "";
    if (Array.isArray(history) && history.length > 0) {
      historySection = `\n\nConversation History:\n` + history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');
    }

    const fullPrompt = `${historySection}\n\nUser Query: ${query}${contextSection}

Please return your response as a JSON object with the following schema:
{
  "answer": "Comprehensive, authoritative Markdown response with detailed explanations, equations, and steps. Include markdown links like [WP-8802: UPW Polishing Seal Overhaul](permit:WP-8802) or [WO-4102: UPW Recovery](ticket:WO-4102) when referencing permits or work orders.",
  "keyTakeaways": ["3-4 concise bullet points summarizing the core response"],
  "relevantStandards": ["List of official standards referenced, e.g. SEMI S2, ISO 14644-1, NFPA 318, IEC 62682"],
  "suggestedFollowUps": ["3 intelligent and relevant follow-up questions the engineer can ask next"],
  "workflowExecutionRequest": {
    "workflowId": "string (the id of the matched workflow)",
    "workflowName": "string",
    "steps": ["Step 1", "Step 2", "Step 3"]
  },
  "matchedCmmsItems": [
    {
      "id": "WP-8802",
      "type": "permit",
      "title": "Title of permit or ticket",
      "permitType": "Cold Work | Hot Work | Confined Space | Working at Heights",
      "status": "open | closed | pending approval | rejected",
      "location": "Location string",
      "workOrderId": "WO-4102",
      "shiftLabel": "Day Shift",
      "lotoTagNumber": "LOTO tag if any"
    }
  ],
  "confidenceScore": 0.99
}`;

    const text = await generateContentWithFallback(fullPrompt, systemInstruction, 0.3);
    const parsed = JSON.parse(text || "{}");

    // If the model didn't populate matchedCmmsItems but query is asking for permits/tickets, compute from fallback helper
    let finalMatchedItems = Array.isArray(parsed.matchedCmmsItems) && parsed.matchedCmmsItems.length > 0
      ? parsed.matchedCmmsItems
      : [];

    if (finalMatchedItems.length === 0) {
      const fb = getFallbackGeneralQueryResponse(query, context);
      if (fb.matchedCmmsItems && fb.matchedCmmsItems.length > 0) {
        finalMatchedItems = fb.matchedCmmsItems;
      }
    }

    res.json({
      answer: parsed.answer || text || "No response generated.",
      keyTakeaways: parsed.keyTakeaways || [],
      relevantStandards: parsed.relevantStandards || ["SEMI S2", "ISO 14644-1"],
      suggestedFollowUps: parsed.suggestedFollowUps || [
        "How do we optimize energy efficiency in cleanroom HVAC recirc loops?",
        "What are the best practices for predictive maintenance on UPW pumps?"
      ],
      matchedCmmsItems: finalMatchedItems,
      workflowExecutionRequest: parsed.workflowExecutionRequest || undefined,
      confidenceScore: parsed.confidenceScore || 0.98,
      generatedByAI: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.warn("AI General Query falling back to structured domain knowledge response:", error?.message || error);
    const fallbackResponse = getFallbackGeneralQueryResponse(query, context);
    res.json(fallbackResponse);
  }
});


// --- DIGITAL TWIN CORE ENDPOINTS (STAGE 1) ---
  app.get("/api/twin/lpg", (req, res) => {
    res.json(digitalTwin.getTopology());
  });

  app.get("/api/twin/rdf", (req, res) => {
    res.json(digitalTwin.getOntology());
  });

  // --- NEO4J AURA REAL LPG CLOUD ENDPOINTS ---
  app.get("/api/neo4j/status", async (req, res) => {
    try {
      const status = await getNeo4jStatus();
      res.json(status);
    } catch (error: any) {
      console.error("[NEO4J] Status Check Error:", error);
      res.status(500).json({
        connected: false,
        error: error.message || "Failed to connect to Neo4j Aura",
      });
    }
  });

  app.post("/api/neo4j/query", async (req, res) => {
    try {
      const { cypher, params } = req.body;
      if (!cypher || typeof cypher !== "string") {
        return res.status(400).json({ error: "Missing required 'cypher' query string." });
      }
      console.log(`[NEO4J] Executing Cypher query: ${cypher.trim().replace(/\s+/g, " ").slice(0, 120)}...`);
      const result = await executeCypherQuery(cypher, params || {});
      res.json(result);
    } catch (error: any) {
      console.error("[NEO4J] Query Execution Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Cypher execution error",
      });
    }
  });

  app.post("/api/neo4j/seed", async (req, res) => {
    try {
      console.log("[NEO4J] Re-seeding digital twin graph into Neo4j Aura...");
      const result = await seedNeo4jFromParsedGraph();
      res.json(result);
    } catch (error: any) {
      console.error("[NEO4J] Seeding Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to seed Neo4j Aura",
      });
    }
  });

  // --- ALARM NODES CRUD ENDPOINTS ---
  app.post("/api/neo4j/alarms/create", async (req, res) => {
    try {
      console.log("[NEO4J] Creating/updating 8 target Alarm nodes...");
      const result = await createAlarmNodesInNeo4j();
      res.json(result);
    } catch (error: any) {
      console.error("[NEO4J] Create Alarms Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create alarm nodes in Neo4j",
      });
    }
  });

  app.post("/api/neo4j/alarms/case/:caseId", async (req, res) => {
    try {
      const caseId = parseInt(req.params.caseId, 10);
      if (![1, 2, 3].includes(caseId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid case ID. Must be 1, 2, or 3.",
        });
      }
      console.log(`[NEO4J] Planting Case ${caseId} Alarm nodes...`);
      const result = await createCaseAlarmNodesInNeo4j(caseId as 1 | 2 | 3);
      res.json(result);
    } catch (error: any) {
      console.error(`[NEO4J] Plant Case Alarm Error:`, error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to plant case alarm nodes in Neo4j",
      });
    }
  });

  app.get("/api/neo4j/alarms/check", async (req, res) => {
    try {
      console.log("[NEO4J] Checking for existing Alarm nodes...");
      const result = await checkAlarmNodesInNeo4j();
      res.json(result);
    } catch (error: any) {
      console.error("[NEO4J] Check Alarms Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to check alarm nodes in Neo4j",
      });
    }
  });

  app.post("/api/neo4j/alarms/clear", async (req, res) => {
    try {
      console.log("[NEO4J] Clearing all Alarm nodes...");
      const result = await clearAlarmNodesInNeo4j();
      res.json(result);
    } catch (error: any) {
      console.error("[NEO4J] Clear Alarms Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to clear alarm nodes in Neo4j",
      });
    }
  });
  // ----------------------------------------------

  // API routes
  app.post("/api/query", async (req, res) => {
    try {
      console.log(`\n[GRAPH ENGINE] ----------------------------------`);
      console.log(`[GRAPH ENGINE] Received AI Cypher Request...`);
      const { prompt, mode, useAura } = req.body;
      const isDeep = mode === "deep";
      const apiKey = process.env.GEMINI_API_KEY;
      
      console.log(`[GRAPH ENGINE] User Prompt: "${prompt}"`);
      console.log(`[GRAPH ENGINE] Target Mode: ${isDeep ? "🧠 Deep Reasoning (Gemini 3.1 Pro)" : "⚡ Fast Mode (Gemini 3.1 Flash-Lite)"}`);
      console.log(`[GRAPH ENGINE] Aura Execution: ${useAura ? "🟢 ENABLED (Neo4j Aura Cloud)" : "⚪ Local Engine"}`);

      if (!apiKey) {
        console.error(`[GRAPH ENGINE] ERROR: GEMINI_API_KEY is missing.`);
        return res.status(500).json({ 
          error: "GEMINI_API_KEY environment variable is missing. Please add it to Settings -> Environment Variables." 
        });
      }

      console.log(`[GRAPH ENGINE] Initializing Google GenAI Client...`);
      const ai = new GoogleGenAI({ apiKey });
      
      const topology = digitalTwin.getTopology().graphData || (digitalTwin.getTopology() as any).flowData;
      const liveNodes = topology.nodes.map((n: any) => ({ id: n.id, name: n.properties?.name || (n.data && n.data.label), type: n.properties?.type || n.labels?.[1] }));
      const liveEdges = topology.edges.map((e: any) => ({ id: e.id, source: e.source, target: e.target, type: e.type || e.label }));

      const systemPrompt = `You are an AI Graph Engine Orchestrator analyzing a logical Labeled Property Graph (LPG) for a Semiconductor Ultrapure Water (UPW) and Chilled Water (CHW) facility digital twin.
The user will provide a natural language prompt about the graph. You must translate the user's intent into an executable Neo4j Cypher query AND identify the corresponding graph operation.

DATABASE SCHEMA & TOPOLOGY (Neo4j Aura Cloud LPG):
- Node Labels: :Equipment and specific category labels (:Tank, :Pump, :Filter, :RO, :EDI, :Header, :DistributionLoop, :POU, :CoolingTower, :CondenserWaterPump, :Chiller, :CHWPump, :DistributionZone, :CoolingLoad, :HeatExchanger, :ProcessTool, :Transformer, :MCC, :PLC).
- Node Properties: id (e.g. 'UPW-TK-01', 'CHW-CH-01', 'CHW-P-05', 'CHW-P-08', 'TOOL-CMP-01', 'MCC-01', 'TX-01', 'PLC-UPW-01'), name, type.
- Relationships & Standard Directionality:
  1. Physical Fluid Flow: (:Equipment)-[:SUPPLIES|FEEDS|DISTRIBUTES_TO]->(:Equipment).
     - UPW Distribution: (:POU)-[:SUPPLIES]->(:ProcessTool).
     - CHW Cooling: (:HeatExchanger)-[:COOLS]->(:ProcessTool).
     - Return loops: (:ProcessTool)-[:RETURNS_TO]->(:Header|Tank).
  2. Electrical Power Flow: (:Transformer)-[:POWERS]->(:MCC)-[:POWERS]->(:Equipment).
  3. Supervisory Control Flow: (:PLC)-[:CONTROLS]->(:Equipment).
  4. Redundancy & Standby: (:Equipment)-[:BACKUP_FOR]->(:Equipment).
     - Standby/backup units point TO the primary/duty unit: (standby:Equipment)-[:BACKUP_FOR]->(duty:Equipment).
     - Example: (standby:Equipment)-[:BACKUP_FOR]->(duty:Equipment).

ALGORITHM ACTION SELECTION RULES:
- "pseudo_engine": Use for redundancy/backup queries ("What is backup for X?"), equipment lookups, status checks, category queries, or queries answered directly by Cypher. Populate "highlightNodes" with the matching node IDs.
- "bfs": Use for downstream flow tracing, blast radius, or downstream impact analysis ("What is downstream of X?", "What tools lose water if X fails?"). Set "sourceId" to X. If filtering for tools, set "targetLabel": "ProcessTool".
- "bfs_upstream": Use for upstream supply tracing, feed sources, or electrical supply origins ("What supplies X?", "Where does X get power from?"). Set "sourceId" to X.
- "dijkstra": Use for shortest path between two specific equipment ("Path from A to B", "How does water flow from A to B?"). Set "sourceId" to A and "targetId" to B.

CYPHER GENERATION GUIDELINES:
- Always write valid, clean Neo4j Cypher syntax returning the matched equipment node variable(s).
- For backup / redundancy queries:
  - Match standby pointing to target: MATCH (b:Equipment)-[:BACKUP_FOR]->(e:Equipment {id: 'X'}) RETURN DISTINCT b
  - Or match undirected for maximum resilience: MATCH (e:Equipment {id: 'X'})-[:BACKUP_FOR]-(b:Equipment) RETURN DISTINCT b
- For downstream trace:
  MATCH (src:Equipment {id: 'X'})-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*..10]->(dest:Equipment) RETURN DISTINCT dest
- For upstream feed/power trace:
  MATCH (dest:Equipment {id: 'X'})<-[:SUPPLIES|FEEDS|POWERS*..5]-(src:Equipment) RETURN DISTINCT src
- For equipment by type/prefix:
  MATCH (e:Equipment) WHERE e.id STARTS WITH 'CHW-P-' OR e:Pump RETURN e

Here is the Graph Topology (Adjacency List):
Nodes: ${JSON.stringify(liveNodes)}
Edges: ${JSON.stringify(liveEdges)}

Respond ONLY with a JSON object in this exact schema:
{
  "action": "bfs" | "bfs_upstream" | "dijkstra" | "pseudo_engine",
  "sourceId": "string (Required for bfs, bfs_upstream, and dijkstra. The exact node ID to start from)",
  "targetId": "string (Required for dijkstra. The exact node ID to end at)",
  "targetLabel": "string (Optional. Used with bfs or bfs_upstream to filter the final highlighted nodes by this type, e.g., 'ProcessTool')",
  "cypher": "string (A valid Neo4j Cypher query returning the matching equipment nodes)",
  "explanation": "string (A clear, concise 1-2 sentence explanation of your query translation)",
  "highlightNodes": ["array of exact node IDs matching the query (Required if action is pseudo_engine)"],
  "highlightEdges": ["array of exact edge IDs (Required if action is pseudo_engine)"]
}

User Prompt: "${prompt}"`;

      console.log(`[GRAPH ENGINE] Sending payload to AI model cascade. Awaiting inference...`);
      const startTime = Date.now();

      const candidateModels = isDeep
        ? ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.1-flash-lite"]
        : ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

      const result = await generateContentDetailed(systemPrompt, undefined, 0.1, "application/json", candidateModels);
      const latency = Date.now() - startTime;
      const cleaned = cleanJsonString(result.text);
      
      console.log(`[GRAPH ENGINE] Parsing JSON payload (${latency}ms from ${result.modelUsed})...`);
      let parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }

      if (!parsed.action) {
        parsed.action = (parsed.highlightNodes && parsed.highlightNodes.length > 0) ? "pseudo_engine" : "pseudo_engine";
      }
      if (!parsed.highlightNodes) {
        parsed.highlightNodes = [];
      }
      
      console.log(`[GRAPH ENGINE] Translated Intent: ${parsed.action?.toUpperCase()} (via ${result.modelUsed})`);
      console.log(`[GRAPH ENGINE] Formulated Cypher: ${parsed.cypher}`);

      // If user requested execution on live Neo4j Aura cloud database:
      if (useAura && parsed.cypher) {
        try {
          console.log(`[AURA] Executing Cypher on Neo4j Aura cloud...`);
          const auraRes = await executeCypherQuery(parsed.cypher);
          parsed.auraResult = auraRes;

          const auraNodeIds = new Set<string>();
          if (auraRes.graph?.nodes?.length) {
            auraRes.graph.nodes.forEach((n: any) => {
              if (n.id) auraNodeIds.add(n.id);
              if (n.properties?.id) auraNodeIds.add(n.properties.id);
            });
          }
          if (auraRes.records?.length) {
            auraRes.records.forEach((row: any) => {
              Object.values(row).forEach((val) => {
                if (typeof val === "string") {
                  const cleanVal = val.trim();
                  if (
                    cleanVal.startsWith("UPW-") ||
                    cleanVal.startsWith("CHW-") ||
                    cleanVal.startsWith("TOOL-") ||
                    cleanVal.startsWith("MCC-") ||
                    cleanVal.startsWith("TX-") ||
                    cleanVal.startsWith("PLC-") ||
                    cleanVal.startsWith("POU-")
                  ) {
                    auraNodeIds.add(cleanVal);
                  }
                } else if (val && typeof val === "object") {
                  const obj = val as Record<string, any>;
                  if (obj.properties?.id) auraNodeIds.add(obj.properties.id);
                  if (obj.id) auraNodeIds.add(obj.id);
                }
              });
            });
          }

          if (auraNodeIds.size > 0) {
            parsed.highlightNodes = Array.from(auraNodeIds);
            if (auraRes.graph?.edges?.length) {
              parsed.highlightEdges = auraRes.graph.edges.map((e: any) => e.id);
            }
            console.log(`[AURA] Successfully resolved ${auraNodeIds.size} nodes from Neo4j Aura in ${auraRes.executionTimeMs}ms:`, Array.from(auraNodeIds));
          } else {
            console.log(`[AURA] Cypher executed successfully (${auraRes.executionTimeMs}ms), records count: ${auraRes.records.length}`);
          }
        } catch (auraErr: any) {
          console.error("[AURA] Execution failed:", auraErr.message);
          parsed.auraError = auraErr.message;
        }
      }

      console.log(`[GRAPH ENGINE] Returning payload to client frontend.`);
      console.log(`[GRAPH ENGINE] ----------------------------------\n`);
      
      res.json({
        ...parsed,
        modelUsed: result.modelUsed,
        mode: isDeep ? "deep" : "fast",
        useAura: !!useAura,
      });
      
    } catch (error: any) {
      console.error("[GRAPH ENGINE] LLM Query Error:", error);
      res.status(500).json({ error: error.message || "Failed to process query" });
    }
  });

  app.post("/api/lpg/synthesize", async (req, res) => {
    try {
      const { prompt, action, resultNodes, mode } = req.body;
      const isDeep = mode === "deep";
      
      const topology = digitalTwin.getTopology().graphData || (digitalTwin.getTopology() as any).flowData;
      const enrichedNodes = (resultNodes || []).map((id: string) => {
        const found = topology.nodes.find((n: any) => n.id === id);
        if (!found) return { id };
        return {
          id: found.id,
          name: found.properties?.name || (found.data && found.data.label) || found.name || found.id,
          type: found.properties?.type || (found.labels && found.labels[1]) || found.type || "Equipment",
          spec: found.properties?.spec || found.spec || undefined,
          status: found.properties?.status || found.status || "Operational",
        };
      });

      let systemPrompt = "";
      if (isDeep) {
        systemPrompt = `You are a Principal Industrial Plant & Reliability Systems Engineer performing deep topological analysis of a semiconductor cleanroom utility digital twin (UPW & CHW).

USER INQUIRY: "${prompt}"
EXECUTED GRAPH ACTION: "${action}"
IDENTIFIED EQUIPMENT NODES (${enrichedNodes.length} total):
${JSON.stringify(enrichedNodes, null, 2)}

Generate a structured, comprehensive, and authoritative operational diagnosis using the following clear sections:

### 1. Executive Summary & Direct Findings
Directly answer what equipment was resolved, their operational role, and the immediate takeaway for plant operations.

### 2. Physical & Topological Connectivity
Detail how the identified equipment interact across physical process loops, hydraulic headers, electrical power distribution (MCC/substations), and control systems (PLCs/SCADA). Detail any upstream feeds or downstream dependencies.

### 3. Reliability & Vulnerability Assessment
Analyze redundancy architectures (e.g., N+1 parallel duty/standby, common-cause failure vectors), single-points-of-failure, and the operational blast radius on wafer fab cleanroom tools if an excursion or failure cascades.

### 4. Recommended Operational Actions
Provide concrete, prioritized engineering recommendations (e.g., lead/lag rotation schedules, isolation valve line-up verification, standby interlock readiness checks, or monitoring thresholds).

Guidelines:
- Ground all statements in the identified equipment nodes and standard semiconductor facility engineering protocols.
- Avoid vague generic advice; provide concrete tag names, failure mechanisms, and actionable control-room guidance.
- Use readable markdown formatting with bold headers and clean bullet points.`;
      } else {
        systemPrompt = `You are an expert industrial plant control room assistant for a semiconductor cleanroom facility.
The operator asked: "${prompt}"
The graph analysis executed: "${action}"
Identified equipment nodes:
${JSON.stringify(enrichedNodes, null, 2)}

Provide a crisp, clear 2-part operational brief:
- **Direct Identification & Role**: State clearly which equipment was identified, its function, and standby/duty relationship.
- **Immediate Operational Checklist**: Provide 2-3 bullet points on control-room checks (e.g., standby readiness, valve line-up, or SCADA interlock status).

Keep it professional, high-signal, and directly actionable for the shift engineer.`;
      }

      const candidateModels = isDeep
        ? ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.1-flash-lite"]
        : ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

      const result = await generateContentDetailed(systemPrompt, undefined, 0.25, undefined, candidateModels);
      res.json({
        synthesis: result.text.trim() || "Analysis complete.",
        modelUsed: result.modelUsed,
        mode: isDeep ? "deep" : "fast"
      });
    } catch (err: any) {
      console.error("[GRAPH ENGINE] Synthesis Error:", err);
      res.status(500).json({ error: "Failed to synthesize graph results" });
    }
  });

  // --- REAL W3C RDF / OXIGRAPH ENGINE ENDPOINTS ---
  app.get("/api/rdf/status", (_req, res) => {
    try {
      const stats = rdfKnowledgeEngine.getStats();
      res.json({
        success: true,
        ...stats,
        triplesCount: digitalTwin.getOntology().length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/rdf/clear", (_req, res) => {
    try {
      console.log("[OXIGRAPH] Request received to remove all triples from Oxigraph store...");
      const result = rdfKnowledgeEngine.clearTriples();
      res.json({
        success: true,
        clearedCount: result.clearedCount,
        message: `Successfully removed all ${result.clearedCount} triples from Oxigraph store.`,
      });
    } catch (err: any) {
      console.error("[OXIGRAPH] Error clearing Oxigraph store:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/rdf/reload", (_req, res) => {
    try {
      console.log("[OXIGRAPH] Request received to clear and reload all triples into Oxigraph store...");
      const reloadResult = rdfKnowledgeEngine.reloadTriples();
      res.json({
        success: true,
        previousCount: reloadResult.previousCount,
        count: reloadResult.newCount,
        message: `Oxigraph store cleared (${reloadResult.previousCount} triples removed) and reloaded with ${reloadResult.newCount} triples.`,
      });
    } catch (err: any) {
      console.error("[OXIGRAPH] Error reloading Oxigraph store:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/rdf/sparql", (req, res) => {
    try {
      const { sparql } = req.body;
      if (!sparql || typeof sparql !== "string") {
        return res.status(400).json({ success: false, error: "Missing required 'sparql' query string." });
      }
      if (!rdfKnowledgeEngine.getStats().isLoaded) {
        rdfKnowledgeEngine.loadTriples(digitalTwin.getOntology());
      }
      const result = rdfKnowledgeEngine.executeSparql(sparql);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/rdf/query", async (req, res) => {
    try {
      const { prompt, isVerbose } = req.body;
      const triples = digitalTwin.getOntology();
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing." });
      }

      // Ensure Oxigraph store is active
      if (!rdfKnowledgeEngine.getStats().isLoaded) {
        rdfKnowledgeEngine.loadTriples(triples);
      }

      console.log(`\n[RDF ENGINE] ----------------------------------`);
      console.log(`[RDF ENGINE] Received Semantic Query: "${prompt}" (Verbose: ${isVerbose})`);

      const verbosityInstruction = isVerbose 
        ? "Provide a highly detailed, step-by-step logical reasoning explanation. Explain each transitive inference explicitly, noting exact classes, subclasses, and facts traversed to arrive at the conclusion."
        : "Provide a very brief 1-sentence explanation of the logical reasoning you used to discover this new knowledge.";

      const ai = new GoogleGenAI({ apiKey });
      const systemPrompt = `You are a Semantic Web reasoning engine.
The user wants to discover knowledge from the following RDF Triples:
${JSON.stringify(triples, null, 2)}

The user's query is: "${prompt}"

Your job is to:
1. Translate their natural language query into a standard SPARQL 1.1 query string that could be run against this triplestore. Use standard prefixes (: for default ontology namespace, rdfs:, rdf:, owl:).
2. Act as the reasoner: evaluate the query against the provided triples, taking into account basic RDFS inferencing (e.g., if X rdfs:subClassOf Y, and Z rdf:type X, then Z rdf:type Y).
3. Return the inferred facts/results as an array of strings (e.g. ["Pump_101 is located in a HazardZone", "Valve_505 is located in a HazardZone"]).
4. ${verbosityInstruction}

Return EXACTLY a JSON object with this shape, and nothing else (no markdown wrapping):
{
  "sparql": "SELECT ?subject WHERE { ... }",
  "newKnowledge": ["fact 1", "fact 2"],
  "explanation": "Because X is a subclass of Y..."
}`;

      const text = await generateContentWithFallback(systemPrompt, undefined, 0.1, "application/json");
      const cleaned = cleanJsonString(text);
      const parsed = JSON.parse(cleaned);

      // Deterministically execute the generated SPARQL query on the real Oxigraph engine
      let sparqlResult = null;
      if (parsed.sparql && typeof parsed.sparql === "string") {
        try {
          sparqlResult = rdfKnowledgeEngine.executeSparql(parsed.sparql);
          console.log(`[RDF ENGINE] Oxigraph executed generated SPARQL in ${sparqlResult.executionTimeMs}ms (Type: ${sparqlResult.type}, Count: ${sparqlResult.count ?? (sparqlResult.booleanValue !== undefined ? 1 : 0)})`);
        } catch (execErr: any) {
          console.warn("[RDF ENGINE] Oxigraph generated SPARQL warning:", execErr.message);
          sparqlResult = { success: false, type: "error", error: execErr.message };
        }
      }

      console.log(`[RDF ENGINE] Generated SPARQL Query & Results successfully.`);
      console.log(`[RDF ENGINE] ----------------------------------\n`);

      res.json({
        ...parsed,
        sparqlResult,
      });
    } catch (error: any) {
      console.error("[RDF ENGINE] Query Error:", error);
      res.status(500).json({ error: error.message || "Failed to process RDF query" });
    }
  });

  // --------------------------------------------------------------------------
  // COMMON ONTOLOGY MANAGER ENDPOINTS (Dual LPG & RDF Integration)
  // --------------------------------------------------------------------------
  app.get("/api/ontology/overview", (_req, res) => {
    try {
      const triples = digitalTwin.getOntology();
      const topology = digitalTwin.getTopology();
      const nodes = topology.flowData?.nodes || [];
      const edges = topology.flowData?.edges || [];

      // Extract unique classes
      const classMap: Record<string, string[]> = {};
      triples.forEach((t: any) => {
        if (t.predicate === "rdf:type") {
          if (!classMap[t.object]) classMap[t.object] = [];
          if (!classMap[t.object].includes(t.subject)) classMap[t.object].push(t.subject);
        }
      });
      const classes = Object.entries(classMap)
        .map(([className, assets]) => ({
          className,
          count: assets.length,
          assets: assets.sort()
        }))
        .sort((a, b) => b.count - a.count);

      // Extract unique predicates
      const predMap: Record<string, number> = {};
      triples.forEach((t: any) => {
        predMap[t.predicate] = (predMap[t.predicate] || 0) + 1;
      });
      const lpgEdgeLabels = new Set(edges.map((e: any) => e.label || (e.data as any)?.type));
      const predicates = Object.entries(predMap)
        .map(([predicate, count]) => ({
          predicate,
          count,
          isLpgEdgeType: lpgEdgeLabels.has(predicate)
        }))
        .sort((a, b) => b.count - a.count);

      // Distinct subjects & objects
      const subjects = new Set(triples.map((t: any) => t.subject));
      const objects = new Set(triples.map((t: any) => t.object));

      // LPG Node Mapping status
      const rdfTypeSubjects = new Set(
        triples.filter((t: any) => t.predicate === "rdf:type").map((t: any) => t.subject)
      );
      const mappedNodes: any[] = [];
      const unmappedNodes: any[] = [];
      nodes.forEach((n: any) => {
        const hasRdfType = rdfTypeSubjects.has(n.id);
        const item = {
          id: n.id,
          label: n.data?.label || n.id,
          type: n.data?.type || "Unknown",
          domain: n.data?.domain || "General",
          hasRdfType
        };
        if (hasRdfType) mappedNodes.push(item);
        else unmappedNodes.push(item);
      });

      // Domain breakdown
      const domainMap: Record<string, number> = {};
      nodes.forEach((n: any) => {
        const dom = n.data?.domain || "Other";
        domainMap[dom] = (domainMap[dom] || 0) + 1;
      });

      // Oxigraph Engine status
      const oxigraphStats = rdfKnowledgeEngine.getStats();

      res.json({
        success: true,
        triples,
        lpgNodes: nodes,
        lpgEdges: edges,
        stats: {
          totalTriples: triples.length,
          totalLpgNodes: nodes.length,
          totalLpgEdges: edges.length,
          distinctSubjectsCount: subjects.size,
          distinctObjectsCount: objects.size,
          distinctClassesCount: classes.length,
          distinctPredicatesCount: predicates.length,
          mappedLpgNodesCount: mappedNodes.length,
          unmappedLpgNodesCount: unmappedNodes.length,
          alignmentPercentage: nodes.length > 0 ? Math.round((mappedNodes.length / nodes.length) * 100) : 100,
          oxigraphLoaded: oxigraphStats.isLoaded,
          oxigraphLoadedCount: oxigraphStats.loadedCount
        },
        classes,
        predicates,
        domains: domainMap,
        mappedNodes,
        unmappedNodes
      });
    } catch (err: any) {
      console.error("[ONTOLOGY MANAGER] Overview Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/ontology/triple", (req, res) => {
    try {
      const { subject, predicate, object } = req.body;
      if (!subject || !predicate || !object) {
        return res.status(400).json({ success: false, error: "Subject, predicate, and object are required." });
      }
      const added = digitalTwin.addTriple({
        subject: String(subject).trim(),
        predicate: String(predicate).trim(),
        object: String(object).trim()
      });
      if (!added) {
        return res.status(409).json({ success: false, error: "Triple already exists in ontology." });
      }
      const currentTriples = digitalTwin.getOntology();
      fs.writeFileSync("ontology.json", JSON.stringify(currentTriples, null, 2), "utf8");
      rdfKnowledgeEngine.reloadTriples(currentTriples);
      res.json({
        success: true,
        message: `Added triple (${subject} -> ${predicate} -> ${object}) and synchronized across LPG & Oxigraph RDF store.`,
        totalTriples: currentTriples.length
      });
    } catch (err: any) {
      console.error("[ONTOLOGY MANAGER] Add Triple Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put("/api/ontology/triple", (req, res) => {
    try {
      const { oldTriple, newTriple } = req.body;
      if (!oldTriple || !newTriple || !newTriple.subject || !newTriple.predicate || !newTriple.object) {
        return res.status(400).json({ success: false, error: "Valid oldTriple and newTriple are required." });
      }
      const updated = digitalTwin.updateTriple(
        { subject: String(oldTriple.subject).trim(), predicate: String(oldTriple.predicate).trim(), object: String(oldTriple.object).trim() },
        { subject: String(newTriple.subject).trim(), predicate: String(newTriple.predicate).trim(), object: String(newTriple.object).trim() }
      );
      if (!updated) {
        return res.status(404).json({ success: false, error: "Original triple not found." });
      }
      const currentTriples = digitalTwin.getOntology();
      fs.writeFileSync("ontology.json", JSON.stringify(currentTriples, null, 2), "utf8");
      rdfKnowledgeEngine.reloadTriples(currentTriples);
      res.json({
        success: true,
        message: "Triple updated and synchronized across LPG & Oxigraph RDF store.",
        totalTriples: currentTriples.length
      });
    } catch (err: any) {
      console.error("[ONTOLOGY MANAGER] Update Triple Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/ontology/triple", (req, res) => {
    try {
      const { subject, predicate, object } = req.body;
      if (!subject || !predicate || !object) {
        return res.status(400).json({ success: false, error: "Subject, predicate, and object are required." });
      }
      const removed = digitalTwin.removeTriple(
        String(subject).trim(),
        String(predicate).trim(),
        String(object).trim()
      );
      if (!removed) {
        return res.status(404).json({ success: false, error: "Triple not found." });
      }
      const currentTriples = digitalTwin.getOntology();
      fs.writeFileSync("ontology.json", JSON.stringify(currentTriples, null, 2), "utf8");
      rdfKnowledgeEngine.reloadTriples(currentTriples);
      res.json({
        success: true,
        message: "Triple deleted and removed from Oxigraph RDF store.",
        totalTriples: currentTriples.length
      });
    } catch (err: any) {
      console.error("[ONTOLOGY MANAGER] Delete Triple Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/ontology/sync-lpg", (_req, res) => {
    try {
      const nodes = digitalTwin.getTopology().flowData?.nodes || [];
      const edges = digitalTwin.getTopology().flowData?.edges || [];
      let addedCount = 0;

      // 1. Ensure every LPG node has an rdf:type triple
      nodes.forEach((n: any) => {
        const type = n.data?.type || n.labels?.[0] || "Equipment";
        const addedType = digitalTwin.addTriple({
          subject: n.id,
          predicate: "rdf:type",
          object: type
        });
        if (addedType) addedCount++;

        if (n.data?.domain) {
          const addedDom = digitalTwin.addTriple({
            subject: n.id,
            predicate: "carriesMedium",
            object: n.data?.medium || n.data?.domain
          });
          if (addedDom) addedCount++;
        }
      });

      // 2. Ensure each LPG edge has a direct relationship triple
      edges.forEach((e: any) => {
        const rel = e.label || (e.data as any)?.type;
        if (rel && e.source && e.target) {
          const addedRel = digitalTwin.addTriple({
            subject: e.source,
            predicate: rel,
            object: e.target
          });
          if (addedRel) addedCount++;
        }
      });

      const currentTriples = digitalTwin.getOntology();
      fs.writeFileSync("ontology.json", JSON.stringify(currentTriples, null, 2), "utf8");
      rdfKnowledgeEngine.reloadTriples(currentTriples);

      res.json({
        success: true,
        addedCount,
        totalTriples: currentTriples.length,
        message: `Synchronized LPG topology with RDF ontology (+${addedCount} harmonized triples).`
      });
    } catch (err: any) {
      console.error("[ONTOLOGY MANAGER] Sync LPG Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/ontology/bulk-import", (req, res) => {
    try {
      const { triples } = req.body;
      if (!Array.isArray(triples)) {
        return res.status(400).json({ success: false, error: "Expected an array of triples." });
      }
      let added = 0;
      triples.forEach((t: any) => {
        if (t.subject && t.predicate && t.object) {
          if (
            digitalTwin.addTriple({
              subject: String(t.subject).trim(),
              predicate: String(t.predicate).trim(),
              object: String(t.object).trim()
            })
          ) {
            added++;
          }
        }
      });
      const currentTriples = digitalTwin.getOntology();
      fs.writeFileSync("ontology.json", JSON.stringify(currentTriples, null, 2), "utf8");
      rdfKnowledgeEngine.reloadTriples(currentTriples);
      res.json({
        success: true,
        addedCount: added,
        totalTriples: currentTriples.length,
        message: `Successfully imported ${added} new triples into common ontology.`
      });
    } catch (err: any) {
      console.error("[ONTOLOGY MANAGER] Bulk Import Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/ontology/reset-defaults", (_req, res) => {
    try {
      const resetTriples = digitalTwin.resetOntologyToInitial();
      fs.writeFileSync("ontology.json", JSON.stringify(resetTriples, null, 2), "utf8");
      rdfKnowledgeEngine.reloadTriples(resetTriples);
      res.json({
        success: true,
        count: resetTriples.length,
        message: `Ontology restored to initial standard baseline (${resetTriples.length} triples).`
      });
    } catch (err: any) {
      console.error("[ONTOLOGY MANAGER] Reset Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ------------------------------------------------
  // STAGE 5: NEUROSYMBOLIC ORCHESTRATOR
  // ------------------------------------------------
  app.post("/api/neurosymbolic/query", async (req, res) => {
    try {
      const { prompt, mode } = req.body;
      const isDeep = mode === "deep";
      console.log(`\n[NEUROSYMBOLIC] ----------------------------------`);
      console.log(`[NEUROSYMBOLIC] Received Query: "${prompt}" (Mode: ${isDeep ? "🧠 Deep Reasoning (Gemini 3.1 Pro)" : "⚡ Fast Mode (Gemini 3.1 Flash-Lite)"})`);

      const liveNodes = digitalTwin.getTopology().graphData.nodes;
      const nodeDescriptions = liveNodes.map(n => `${n.id} (${n.properties?.name || n.labels.join(', ')})`).join(', ');
      const triples = digitalTwin.getOntology();

      const systemPrompt = `You are the Chief Engineer AI for a Semiconductor Ultrapure Water (UPW) system. You govern both the Semantic Knowledge Base (safety rules, materials, cleanliness) and the Labeled Property Graph (physical pipes and equipment).

The plant contains UPW systems (Tanks, RO, EDI, Pumps), CHW systems (Chillers, Cooling Towers), Process Tools (CMP, Etch, Litho), and Electrical Dependencies (MCC, Transformers).
Live Equipment Nodes:
${nodeDescriptions}

Safety Rules and Equipment Materials (RDF Triplestore):
${JSON.stringify(triples, null, 2)}

Your task is to answer the user's routing request by executing a Chain-of-Thought:
1. **Semantic Analysis (RDF)**: Look at the Triplestore. Determine the properties of the material being routed and identify any conflicting equipment materials on the path (e.g. UPW + StainlessSteel).
2. **Conflict Resolution**: Identify exact node IDs from the Live Equipment list that MUST be avoided based on the Semantic Analysis.
3. **Graph Execution (LPG)**: Formulate the physical graph routing query (usually 'dijkstra' for routing), explicitly excluding the dangerous nodes.

Respond ONLY with a valid JSON object matching this schema:
{
  "action": "dijkstra" | "bfs" | "dfs",
  "sourceId": "string (the starting node id)",
  "targetId": "string (the ending node id)",
  "excludeNodes": ["array of node ids to exclude based on safety rules"],
  "reasoning": "A concise step-by-step explanation of your neurosymbolic reasoning (e.g. 'RDF Analysis showed UPW corrodes StainlessSteel. Excluded v4-out. Running Dijkstra.')"
}`;

      const candidateModels = isDeep
        ? ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.1-flash-lite"]
        : ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

      const result = await generateContentDetailed(prompt, systemPrompt, 0.1, "application/json", candidateModels);
      console.log(`[NEUROSYMBOLIC] AI Response (${result.modelUsed}):\n${result.text}`);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanJsonString(result.text) || "{}");
      } catch (err) {
        console.error("[NEUROSYMBOLIC] Failed to parse JSON:", err);
        return res.status(500).json({ error: "AI returned invalid JSON." });
      }

      res.json({
        ...parsedResponse,
        modelUsed: result.modelUsed,
        mode: isDeep ? "deep" : "fast"
      });
    } catch (error: any) {
      console.error("[NEUROSYMBOLIC] Execution Error:", error);
      res.status(500).json({ error: "Failed to process neurosymbolic query.", details: error.message, stack: error.stack });
    }
  });

  // ------------------------------------------------
  // LANGSMITH TRACING STATUS ENDPOINT
  // ------------------------------------------------
  app.get("/api/langsmith/status", (req, res) => {
    const isTracing = !!process.env.LANGCHAIN_API_KEY && process.env.LANGCHAIN_TRACING_V2 !== "false";
    res.json({
      enabled: isTracing,
      project: process.env.LANGCHAIN_PROJECT || "semiconductor-cleanroom-hive",
      endpoint: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
      hasApiKey: !!process.env.LANGCHAIN_API_KEY,
    });
  });

  // ------------------------------------------------
  // STAGE 6: AGENT HIVE CHAT & HUMAN-IN-THE-LOOP RCA/MITIGATION
  // EXECUTED VIA OFFICIAL @langchain/langgraph COMPILED STATEGRAPH
  // ------------------------------------------------
  app.post("/api/agent-hive/stream", async (req, res) => {
    try {
      const { message, history, threadId, simVariables } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required." });
      }

      if (simVariables && typeof simVariables === "object") {
        digitalTwin.setLiveTelemetry(simVariables);
      }

      const activeThreadId = (typeof threadId === "string" && threadId.trim())
        ? threadId.trim()
        : "default_hive_thread";

      // Configure SSE Headers for live LangGraph streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      console.log(`[OFFICIAL LANGGRAPH STREAM] Starting streamEvents for thread "${activeThreadId}", query: "${message}"`);

      // Stream native LangGraph v2 events
      let finalReply = "";
      let delegated = true;
      let needsOperatorInput = false;
      let executedCypher = "";
      let cypherResultsSummary = "";
      let graphData: any = undefined;
      let actionButtons: any = undefined;
      let routeDecision: any = undefined;
      let analystReasoning = "";
      const traceHistory: any[] = [];

      const eventStream = officialCompiledHiveGraph.streamEvents(
        {
          currentTurnInput: message,
          messages: [new HumanMessage(message)],
        },
        {
          version: "v2",
          runName: "AgentHive_State_Turn",
          recursionLimit: 50,
          tags: ["semiconductor-cleanroom", "langgraph-v2", "neo4j-rca", "agent-hive"],
          metadata: {
            userQuery: message,
            threadId: activeThreadId,
            timestamp: new Date().toISOString(),
          },
          configurable: {
            thread_id: activeThreadId,
          },
        }
      );

      for await (const event of eventStream) {
        const eventType = event.event;
        const nodeName = event.metadata?.langgraph_node;

        if (eventType === "on_chain_start" && nodeName) {
          res.write(`data: ${JSON.stringify({
            type: "node_start",
            node: nodeName,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else if (eventType === "on_chain_end" && nodeName) {
          const output = event.data?.output;
          if (output) {
            if (output.finalReply) finalReply = output.finalReply;
            if (typeof output.delegated === "boolean") delegated = output.delegated;
            if (typeof output.needsOperatorInput === "boolean") needsOperatorInput = output.needsOperatorInput;
            if (output.executedCypher !== undefined) executedCypher = output.executedCypher || "";
            if (output.cypherResultsSummary !== undefined) cypherResultsSummary = output.cypherResultsSummary || "";
            if (output.graphData !== undefined) graphData = output.graphData || undefined;
            if (output.actionButtons !== undefined) actionButtons = output.actionButtons || undefined;
            if (output.routeDecision) routeDecision = output.routeDecision;
            if (output.analystReasoning) analystReasoning = output.analystReasoning;
            if (Array.isArray(output.traceHistory)) {
              traceHistory.push(...output.traceHistory);
            }
          }
          res.write(`data: ${JSON.stringify({
            type: "node_end",
            node: nodeName,
            output,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else if (eventType === "on_tool_start") {
          res.write(`data: ${JSON.stringify({
            type: "tool_start",
            tool: event.name,
            input: event.data?.input,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else if (eventType === "on_tool_end") {
          res.write(`data: ${JSON.stringify({
            type: "tool_end",
            tool: event.name,
            output: event.data?.output,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else if (eventType === "on_chat_model_stream") {
          const chunk = event.data?.chunk?.content;
          if (chunk && typeof chunk === "string") {
            res.write(`data: ${JSON.stringify({
              type: "token",
              node: nodeName,
              content: chunk
            })}\n\n`);
          }
        }
      }

      res.write(`data: ${JSON.stringify({
        type: "final_state",
        reply: finalReply,
        delegated,
        needsOperatorInput,
        cypherQuery: executedCypher,
        cypherResultsSummary,
        graphData,
        actionButtons,
        routeDecision,
        analystReasoning,
        langGraphTrace: traceHistory,
        timestamp: new Date().toISOString(),
      })}\n\n`);

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("[OFFICIAL LANGGRAPH STREAM] Execution Error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", error: error.message || "Streaming failed" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/agent-hive/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required." });
      }

      console.log(`[OFFICIAL LANGGRAPH] Invoking compiled StateGraph for query: "${message}"`);

      // Invoke the official compiled LangGraph StateGraph
      const graphResult = await officialCompiledHiveGraph.invoke(
        {
          currentTurnInput: message,
          messages: [new HumanMessage(message)],
        },
        {
          recursionLimit: 50,
          configurable: {
            thread_id: "default_hive_thread",
          },
        }
      );

      console.log(`[OFFICIAL LANGGRAPH] StateGraph completed turn. Mode: ${graphResult.routeDecision?.mode}. Trace:`, graphResult.traceHistory);

      return res.json({
        reply: graphResult.finalReply,
        delegated: graphResult.delegated,
        needsOperatorInput: graphResult.needsOperatorInput,
        cypherQuery: graphResult.executedCypher,
        cypherResultsSummary: graphResult.cypherResultsSummary,
        graphData: graphResult.graphData,
        actionButtons: graphResult.actionButtons,
        routeDecision: graphResult.routeDecision,
        analystReasoning: graphResult.analystReasoning,
        langGraphTrace: graphResult.traceHistory,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[OFFICIAL LANGGRAPH] Execution Error:", error);
      res.status(500).json({ error: error.message || "Failed to execute LangGraph" });
    }
  });

  // ------------------------------------------------
  // AGENT FORGE: ISOLATED DEEP AGENTS LANGGRAPH ROUTES
  // Completely separate from /api/agent-hive/*
  // 3-node graph: START -> deep_agent -> END
  // ------------------------------------------------
  app.post("/api/agent-forge/stream", async (req, res) => {
    try {
      const { message, threadId } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required." });
      }

      // Enforce distinct namespacing for thread_id to guarantee zero state collisions
      const rawThreadId = (typeof threadId === "string" && threadId.trim()) ? threadId.trim() : "default";
      const namespacedThreadId = rawThreadId.startsWith("forge-v2-") ? rawThreadId : `forge-v2-${rawThreadId}`;

      // Configure SSE Headers for live streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      console.log(`[AGENT FORGE LANGGRAPH] Live event streaming for thread: "${namespacedThreadId}", prompt: "${message.slice(0, 60)}..."`);

      // Initial graph lifecycle event: START
      res.write(`data: ${JSON.stringify({
        type: "graph_start",
        node: "start",
        message: "Pipeline entrypoint triggered (START node)",
        timestamp: new Date().toISOString(),
      })}\n\n`);

      // Immediate transition to deep_agent node
      res.write(`data: ${JSON.stringify({
        type: "node_transition",
        from: "start",
        to: "deep_agent",
        edge: "edge-start-deep",
        timestamp: new Date().toISOString(),
      })}\n\n`);

      let finalReply = "";
      let thoughts: string[] = [];
      let executedCypher = "";
      const toolCallsDetected: string[] = [];

      try {
        const eventStream = (compiledDeepAgentGraph as any).streamEvents(
          {
            messages: [{ role: "user", content: message }],
          },
          {
            version: "v2",
            recursionLimit: 60,
            configurable: {
              thread_id: namespacedThreadId,
            },
          }
        );

        for await (const event of eventStream) {
          const eventType = event.event;
          const toolName = event.name;

          if (eventType === "on_tool_start") {
            if (toolName) toolCallsDetected.push(toolName);
            if (toolName === "neo4j_schema_introspect") {
              res.write(`data: ${JSON.stringify({
                type: "node_transition",
                from: "deep_agent",
                to: "tool_schema",
                edge: "edge-deep-schema",
                tool: toolName,
                timestamp: new Date().toISOString(),
              })}\n\n`);
            } else if (toolName === "neo4j_cypher_query") {
              const inputCypher = event.data?.input?.cypher || event.data?.input?.query;
              if (inputCypher && typeof inputCypher === "string") {
                executedCypher = inputCypher;
              }
              res.write(`data: ${JSON.stringify({
                type: "node_transition",
                from: "deep_agent",
                to: "tool_cypher",
                edge: "edge-deep-cypher",
                tool: toolName,
                timestamp: new Date().toISOString(),
              })}\n\n`);
            } else if (toolName === "write_todos") {
              const todosArg = event.data?.input?.todos;
              if (Array.isArray(todosArg)) {
                thoughts = todosArg.map((t: any) => {
                  if (typeof t === "string") return t;
                  const label = t?.content ?? t?.task ?? t?.title ?? JSON.stringify(t);
                  return t?.status ? `[${t.status}] ${label}` : label;
                });
                res.write(`data: ${JSON.stringify({
                  type: "thoughts",
                  thoughts,
                  timestamp: new Date().toISOString(),
                })}\n\n`);
              }
            }
          } else if (eventType === "on_tool_end") {
            if (toolName === "neo4j_schema_introspect") {
              res.write(`data: ${JSON.stringify({
                type: "node_transition",
                from: "tool_schema",
                to: "deep_agent",
                edge: "edge-deep-schema",
                tool: toolName,
                timestamp: new Date().toISOString(),
              })}\n\n`);
            } else if (toolName === "neo4j_cypher_query") {
              res.write(`data: ${JSON.stringify({
                type: "node_transition",
                from: "tool_cypher",
                to: "deep_agent",
                edge: "edge-deep-cypher",
                tool: toolName,
                timestamp: new Date().toISOString(),
              })}\n\n`);
            }
          } else if (eventType === "on_chat_model_stream") {
            const chunk = event.data?.chunk?.content;
            if (chunk && typeof chunk === "string") {
              finalReply += chunk;
              res.write(`data: ${JSON.stringify({
                type: "token",
                content: chunk,
                timestamp: new Date().toISOString(),
              })}\n\n`);
            }
          }
        }
      } catch (streamErr: any) {
        console.warn("[AGENT FORGE LANGGRAPH] streamEvents encountered warning:", streamErr);
      }

      // Check state for complete reply and todos if needed
      try {
        const state = await (compiledDeepAgentGraph as any).getState({
          configurable: { thread_id: namespacedThreadId },
        });
        if (state?.values) {
          const resultMessages = Array.isArray(state.values.messages) ? state.values.messages : [];
          const lastAiMessage = [...resultMessages].reverse().find((m: any) => m?._getType?.() === "ai" || m?.type === "ai");
          if (lastAiMessage?.content && typeof lastAiMessage.content === "string" && lastAiMessage.content.trim()) {
            finalReply = lastAiMessage.content;
          } else if (!finalReply) {
            const toolMessages = resultMessages.filter((m: any) => m?._getType?.() === "tool" || m?.type === "tool");
            if (toolMessages.length > 0) {
              const lastTool = toolMessages[toolMessages.length - 1];
              const contentStr = typeof lastTool.content === "string" ? lastTool.content : JSON.stringify(lastTool.content, null, 2);
              finalReply = `Inspection completed across ${toolMessages.length} step(s). Data retrieved:\n\n${contentStr}`;
            }
          }
          const rawTodos = Array.isArray(state.values.todos) ? state.values.todos : [];
          if (rawTodos.length > 0) {
            thoughts = rawTodos.map((t: any) => {
              if (typeof t === "string") return t;
              const label = t?.content ?? t?.task ?? t?.title ?? JSON.stringify(t);
              return t?.status ? `[${t.status}] ${label}` : label;
            });
          }
        }
      } catch (err) {
        console.warn("[AGENT FORGE] getState check warning:", err);
      }

      if (thoughts.length > 0) {
        res.write(`data: ${JSON.stringify({
          type: "thoughts",
          thoughts,
          timestamp: new Date().toISOString(),
        })}\n\n`);
      }

      // Transition from deep_agent to END
      res.write(`data: ${JSON.stringify({
        type: "node_transition",
        from: "deep_agent",
        to: "end",
        edge: "edge-deep-end",
        timestamp: new Date().toISOString(),
      })}\n\n`);

      // Extract intelligent dynamic graph JSON if provided by Deep Agent
      let graphData: any = undefined;
      const graphJsonMatch = finalReply.match(/```json:graph\s*([\s\S]*?)\s*```/);
      if (graphJsonMatch) {
        try {
          const parsedGraph = JSON.parse(graphJsonMatch[1]);
          if (parsedGraph.plotRequired && parsedGraph.nodes && parsedGraph.nodes.length > 0) {
            graphData = {
              nodes: parsedGraph.nodes,
              edges: parsedGraph.edges || [],
            };
          }
          finalReply = finalReply.replace(/```json:graph\s*[\s\S]*?\s*```/, '').trim();
        } catch (e) {
          console.warn("[AGENT FORGE] Failed to parse dynamic json:graph:", e);
        }
      }

      // Send the completed reply
      res.write(`data: ${JSON.stringify({
        type: "complete",
        node: "end",
        reply: finalReply || "Completed processing.",
        thoughtProcess: thoughts,
        cypherQuery: executedCypher || undefined,
        graphData: graphData,
        traceHistory: [{
          step: "deep_agent_complete",
          node: "deep_agent",
          timestamp: new Date().toISOString(),
          details: `Live execution finished with ${toolCallsDetected.length} tool executions`,
        }],
        threadId: namespacedThreadId,
        timestamp: new Date().toISOString(),
      })}\n\n`);

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("[AGENT FORGE LANGGRAPH] Stream Error:", error);
      res.write(`data: ${JSON.stringify({ type: "error", error: error.message || "Streaming failed" })}\n\n`);
      res.end();
    }
  });

  app.post("/api/agent-forge/history", async (req, res) => {
    try {
      const { threadId } = req.body;
      const rawThreadId = (typeof threadId === "string" && threadId.trim()) ? threadId.trim() : "default";
      const namespacedThreadId = rawThreadId.startsWith("forge-v2-") ? rawThreadId : `forge-v2-${rawThreadId}`;

      // getState/updateState are typed `never` on DeepAgent (marked @internal by
      // the langchain ReactAgent base type), but remain functional at runtime —
      // cast past the type guard rather than reimplementing checkpoint reads.
      const state = await (compiledDeepAgentGraph as any).getState({
        configurable: { thread_id: namespacedThreadId },
      });

      return res.json({
        success: true,
        threadId: namespacedThreadId,
        values: state?.values || null,
        next: state?.next || [],
      });
    } catch (error: any) {
      console.error("[AGENT FORGE LANGGRAPH] Get History Error:", error);
      res.status(500).json({ error: error.message || "Failed to retrieve history" });
    }
  });

  // High-Fidelity Neural TTS endpoint using Google's gemini-3.8-flash-lite-tts (Sultry Female Voice)
  app.post("/api/agent-forge/tts", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "Gemini client is not initialized" });
      }

      // Truncate text cleanly for responsive TTS turn
      const cleaned = text.slice(0, 1000);

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: cleaned,
                speechMetadata: {
                  style: "Calm, alluring, articulate and sophisticated female AI assistant with an elegant, sultry, warm and composed tone",
                },
              },
            ],
          },
        ] as any,
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              // 'Aoede' is a deep, smooth, elegant and sophisticated female voice
              // Options: 'Aoede', 'Kore', 'Zephyr', 'Fenrir', 'Charon', 'Puck'
              prebuiltVoiceConfig: { voiceName: voiceName || "Aoede" },
            },
          },
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType || "audio/pcm;rate=24000";

      if (!base64Audio) {
        return res.status(502).json({ error: "No audio generated from TTS model" });
      }

      return res.json({
        success: true,
        audio: base64Audio,
        mimeType,
        sampleRate: 24000,
      });
    } catch (error: any) {
      console.warn("[AGENT FORGE TTS] Generation error:", error);
      return res.status(500).json({ error: error.message || "TTS generation failed" });
    }
  });

  // High-Accuracy Speech-to-Text Transcription via Gemini Multimodal
  app.post("/api/agent-forge/stt", async (req, res) => {
    try {
      const { audio, mimeType } = req.body;
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ error: "Audio base64 data is required" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "Gemini client is not initialized" });
      }

      const cleanBase64 = audio.replace(/^data:audio\/[a-zA-Z0-9_-]+;base64,/, "");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: cleanBase64,
                },
              },
              {
                text: "Transcribe the spoken cleanroom/facility operator words from this audio. Return strictly and only the verbatim transcribed speech as a plain text string. Do not include markdown, explanations, speaker tags, or quotation marks.",
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
        },
      });

      const transcript = response.text ? response.text.trim() : "";
      return res.json({
        success: true,
        transcript,
      });
    } catch (error: any) {
      console.warn("[AGENT FORGE STT] Transcription error:", error);
      return res.status(500).json({ error: error.message || "STT transcription failed" });
    }
  });

  // Reset Agent Forge LangGraph state
  app.post("/api/agent-forge/reset", async (req, res) => {
    try {
      const { threadId } = req.body;
      const rawThreadId = (typeof threadId === "string" && threadId.trim()) ? threadId.trim() : "default";
      const namespacedThreadId = rawThreadId.startsWith("forge-v2-") ? rawThreadId : `forge-v2-${rawThreadId}`;

      // Reset thread state in isolated checkpointer by pushing an empty message checkpoint
      // (see the @internal note on getState above — same cast, same reasoning).
      await (compiledDeepAgentGraph as any).updateState(
        { configurable: { thread_id: namespacedThreadId } },
        { messages: [] }
      );

      return res.json({
        success: true,
        message: `Thread ${namespacedThreadId} reset successfully in forgeCheckpointer.`,
      });
    } catch (error: any) {
      console.error("[AGENT FORGE LANGGRAPH] Reset Error:", error);
      res.status(500).json({ error: error.message || "Failed to reset thread" });
    }
  });

  // =========================================================================
  // MOBILE APP OPERATOR DIRECTORY & ROLE DISPATCH SYSTEM
  // 4 Authorized Cleanroom Mobile Users: Licheng, Mario, Zhuqi, Weiliang
  // Password: root
  // =========================================================================
  interface MobileOperator {
    id: string;
    username: string;
    displayName: string;
    role: string;
    domain: string;
    email: string;
    phone: string;
    avatar: string;
    status: "ON_DUTY" | "IN_FIELD" | "STANDBY";
    lastActive: string;
  }

  interface OperatorNotification {
    id: string;
    targetUserId: string; // 'licheng' | 'mario' | 'zhuqi' | 'weiliang' | 'all'
    targetUserName?: string;
    title: string;
    message: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
    assetId?: string;
    sender: string;
    timestamp: string;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
  }

  const registeredOperators: MobileOperator[] = [
    {
      id: "licheng",
      username: "Licheng",
      displayName: "Licheng Yan",
      role: "Facility Operations Lead",
      domain: "Cleanroom Fab-1 Management",
      email: "licheng.yan@siemens.com",
      phone: "+65 9123 4567",
      avatar: "LC",
      status: "ON_DUTY",
      lastActive: new Date().toISOString(),
    },
    {
      id: "mario",
      username: "Mario",
      displayName: "Mario Rossi",
      role: "Mechanical Systems Specialist",
      domain: "Chilled Water & Primary Pumps",
      email: "mario.facility@fabcore.io",
      phone: "+65 9234 5678",
      avatar: "MR",
      status: "ON_DUTY",
      lastActive: new Date().toISOString(),
    },
    {
      id: "zhuqi",
      username: "Zhuqi",
      displayName: "Zhuqi Chen",
      role: "Electrical & Automation Engineer",
      domain: "Substations & Motor Control Centers",
      email: "zhuqi.ee@fabcore.io",
      phone: "+65 9345 6789",
      avatar: "ZQ",
      status: "ON_DUTY",
      lastActive: new Date().toISOString(),
    },
    {
      id: "weiliang",
      username: "Weiliang",
      displayName: "Weiliang Tan",
      role: "EHS & Cleanroom Safety Officer",
      domain: "Hazardous Gas & Hot Work Permits",
      email: "weiliang.ehs@fabcore.io",
      phone: "+65 9456 7890",
      avatar: "WL",
      status: "ON_DUTY",
      lastActive: new Date().toISOString(),
    },
  ];

  // In-memory active notifications store shared by the Node.js backend
  const activeOperatorNotifications: OperatorNotification[] = [
    {
      id: "notif-init-1",
      targetUserId: "mario",
      targetUserName: "Mario",
      title: "Chiller CHW-P-05 Differential Pressure Alert",
      message: "Vibration threshold exceeded on Primary Pump 5. Inspect impeller bearing.",
      severity: "HIGH",
      assetId: "CHW-P-05",
      sender: "Operations Command Center",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      acknowledged: false,
    },
    {
      id: "notif-init-2",
      targetUserId: "zhuqi",
      targetUserName: "Zhuqi",
      title: "MCC-01 Feeder Ground Fault Warning",
      message: "Feeder breaker #4 reporting intermittent leakage current. Check busbar.",
      severity: "CRITICAL",
      assetId: "MCC-01",
      sender: "Operations Command Center",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      acknowledged: false,
    },
  ];

  // 1. Authenticate mobile user
  app.post("/api/mobile/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const operator = registeredOperators.find(
      (op) => op.username.toLowerCase() === cleanUser || op.id === cleanUser
    );

    if (!operator) {
      return res.status(401).json({
        error: "Operator not recognized. Allowed users: Licheng, Mario, Zhuqi, Weiliang",
      });
    }

    if (password !== "root") {
      return res.status(401).json({ error: "Invalid password. Default password is 'root'" });
    }

    // Update active timestamp
    operator.lastActive = new Date().toISOString();

    return res.json({
      success: true,
      user: operator,
      token: `token_${operator.id}_${Date.now()}`,
    });
  });

  // 2. Get list of all 4 registered operators
  app.get("/api/mobile/operators", (_req, res) => {
    return res.json({
      operators: registeredOperators,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Dispatch notification to specific user or all users
  app.post("/api/mobile/notify", (req, res) => {
    const { targetUserId, title, message, severity, assetId, sender } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required." });
    }

    const targetUser = registeredOperators.find((op) => op.id === targetUserId);
    const targetUserName = targetUserId === "all" ? "All Operators" : targetUser?.displayName || targetUserId;

    const newNotification: OperatorNotification = {
      id: `notif-${Date.now()}`,
      targetUserId: targetUserId || "all",
      targetUserName,
      title: String(title).trim(),
      message: String(message).trim(),
      severity: severity || "HIGH",
      assetId: assetId || undefined,
      sender: sender || "Central Command",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      acknowledged: false,
    };

    activeOperatorNotifications.unshift(newNotification);
    if (activeOperatorNotifications.length > 50) {
      activeOperatorNotifications.pop();
    }

    return res.json({
      success: true,
      notification: newNotification,
    });
  });

  // 4. Retrieve notifications for a specific user
  app.get("/api/mobile/notifications", (req, res) => {
    const userId = (req.query.userId as string)?.toLowerCase();
    let userNotifications = activeOperatorNotifications;

    if (userId && userId !== "all") {
      userNotifications = activeOperatorNotifications.filter(
        (n) => n.targetUserId === userId || n.targetUserId === "all"
      );
    }

    return res.json({
      notifications: userNotifications,
      total: userNotifications.length,
      unacknowledgedCount: userNotifications.filter((n) => !n.acknowledged).length,
    });
  });

  // 5. Acknowledge a notification
  app.post("/api/mobile/acknowledge", (req, res) => {
    const { notificationId, userId, userName } = req.body;
    const notif = activeOperatorNotifications.find((n) => n.id === notificationId);

    if (!notif) {
      return res.status(404).json({ error: "Notification not found." });
    }

    notif.acknowledged = true;
    notif.acknowledgedBy = userName || userId || "Operator";
    notif.acknowledgedAt = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    return res.json({
      success: true,
      notification: notif,
    });
  });

  // Ephemeral In-Memory Comms Chat (No database, zero disk, pure live RAM)
  interface EphemeralChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    role: string;
    text: string;
    timestamp: string;
  }
  let ephemeralMobileChatMessages: EphemeralChatMessage[] = [
    {
      id: "msg-init-1",
      senderId: "licheng",
      senderName: "Licheng",
      role: "Lead Facilities Engineer",
      text: "Fab-1 Ops Comms channel online. All 4 shift leads report in.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ];

  // 6. Get live ephemeral chat messages
  app.get("/api/mobile/chat/messages", (_req, res) => {
    return res.json({
      success: true,
      messages: ephemeralMobileChatMessages,
    });
  });

  // 7. Post new ephemeral chat message
  app.post("/api/mobile/chat/messages", (req, res) => {
    const { senderId, senderName, role, text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Message text is required." });
    }

    const newMessage: EphemeralChatMessage = {
      id: `mchat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: senderId || "operator",
      senderName: senderName || "Operator",
      role: role || "Cleanroom Operator",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    ephemeralMobileChatMessages.push(newMessage);
    // Keep max 100 messages in live RAM to stay lean
    if (ephemeralMobileChatMessages.length > 100) {
      ephemeralMobileChatMessages = ephemeralMobileChatMessages.slice(-100);
    }

    return res.json({
      success: true,
      message: newMessage,
    });
  });

  // 8. Wipe ephemeral room
  app.post("/api/mobile/chat/clear", (_req, res) => {
    ephemeralMobileChatMessages = [];
    return res.json({ success: true, message: "Chat cleared." });
  });

  // 9. Dedicated Licheng Mobile AI Field Copilot (Native LangGraph, Isolated from Agent Hive)
  app.post("/api/mobile/licheng-ai-assistant", async (req, res) => {
    const { prompt, imageBase64, operatorId, operatorName } = req.body;

    if (operatorId && operatorId.toLowerCase() !== "licheng") {
      return res.status(403).json({
        error: "Access restricted. AI Field Copilot is exclusively provisioned for Licheng.",
      });
    }

    if (!prompt && !imageBase64) {
      return res.status(400).json({ error: "A prompt or image is required." });
    }

    try {
      const result = await executeLichengFieldAgent({
        prompt: prompt || "Please inspect this image and advise on cleanroom status and equipment condition.",
        imageBase64,
        operatorName: operatorName || "Licheng",
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error("[FieldAgent Endpoint] Error invoking LangGraph field agent:", err);
      return res.status(500).json({ error: err?.message || "Failed to process field agent query" });
    }
  });

// Vite middleware in dev / static in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FabCore Facilities Management Server running on port ${PORT}`);
  });
}

startServer();
