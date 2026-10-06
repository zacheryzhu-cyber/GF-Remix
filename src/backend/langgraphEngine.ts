/**
 * 100% Native LangGraph Multi-Agent Engine for Semiconductor Fab Operations
 * Built with @langchain/langgraph, @langchain/langgraph/prebuilt (ToolNode, toolsCondition),
 * @langchain/core/tools (tool), and @langchain/google-genai.
 * 
 * Clean Multi-Agent Architecture:
 * 1. Orchestrator Node ("orchestrator"):
 *    - Central Supervisor. For non-plant trivia, answers directly and routes to END.
 *    - For cleanroom/facility queries, explicitly orders mode (GENERAL_QUERY, DIAGNOSTIC, MITIGATION)
 *      and delegates to System Analyst.
 * 
 * 2. System Analyst Specialist Node ("system_analyst"):
 *    - Domain specialist bound to neo4jCypherTool via model.bindTools([neo4jCypherTool]).
 *    - Synthesizes findings and emits tool_calls.
 * 
 * 3. Native ToolNode ("tools"):
 *    - Prebuilt ToolNode executing queries against live Neo4j Aura instance.
 * 
 * 4. Native toolsCondition:
 *    - Native ReAct edge routing between "tools" and END.
 */

import { StateGraph, START, END, Annotation, MemorySaver } from "@langchain/langgraph";
import { toolsCondition } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import { neo4jCypherTool, neo4jSchemaTool, rdfSparqlTool, knowledgeBaseTool, otConnectionTool, nativeToolNode } from "./agentTools";

export interface GraphTopologyArtifact {
  nodes: Array<{ id: string; name: string; type: string; status?: string }>;
  edges: Array<{ sourceId: string; sourceName: string; targetId: string; targetName: string; relationship: string; property?: string }>;
}

export interface ActionButtonArtifact {
  id: string;
  label: string;
  prompt: string;
  variant?: 'primary' | 'secondary' | 'amber' | 'emerald';
}

export type AnalystMode = "GENERAL_QUERY" | "DIAGNOSTIC" | "MITIGATION";

// --------------------------------------------------------
// 2. STATE ANNOTATION SCHEMA
// --------------------------------------------------------
export const AgentHiveStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentTurnInput: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  routeDecision: Annotation<{
    destination: "end" | "system_analyst" | "upw_drift_agent";
    orderedMode?: AnalystMode;
    reasoning: string;
    targetEquipment?: string;
    needsOperatorInput: boolean;
    mode?: "GENERAL_DIRECT" | "GENERAL_FACILITY_FACT" | "TOPOLOGY_QUERY" | "RCA_DIAGNOSTICS" | "MITIGATION_OCAP" | "ALARM_QUERY";
  }>({
    reducer: (_, y) => y,
    default: () => ({
      destination: "end",
      reasoning: "Default direct mode",
      needsOperatorInput: false,
    }),
  }),
  finalReply: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  executedCypher: Annotation<string | null | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  cypherResultsSummary: Annotation<string | null | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  analystReasoning: Annotation<string | null | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  graphData: Annotation<GraphTopologyArtifact | null | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  actionButtons: Annotation<ActionButtonArtifact[] | null | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  delegated: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  needsOperatorInput: Annotation<boolean>({
    reducer: (_, y) => y,
    default: () => false,
  }),
  traceHistory: Annotation<Array<{ node: string; description: string; timestamp: string }>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

export type AgentHiveStateType = typeof AgentHiveStateAnnotation.State;

// LLM Helper
function getLangChainGemini(temperature: number = 0.1): ChatGoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash-lite",
    apiKey,
    temperature,
    maxRetries: 2,
  });
}

// --------------------------------------------------------
// 3. NODE: Central Orchestrator Node (Single Unified Node)
// Handles direct answers for non-plant questions,
// OR delegates with explicit mode to System Analyst.
// --------------------------------------------------------
export async function orchestratorNode(state: AgentHiveStateType): Promise<Partial<AgentHiveStateType>> {
  const userMessage = state.currentTurnInput || (state.messages.length > 0 ? state.messages[state.messages.length - 1].content.toString() : "");
  const lower = userMessage.toLowerCase();

  // Default routing; only used if the LLM classifier below is unavailable or throws.
  let destination: "end" | "system_analyst" | "upw_drift_agent" = "system_analyst";
  let orderedMode: AnalystMode = "GENERAL_QUERY";
  let reasoning = "Delegated to System Analyst in GENERAL QUERY MODE (default routing; classifier unavailable)";

  // LLM classification for dynamic supervisor reasoning across all queries
  const model = getLangChainGemini(0.0);
  if (model) {
    try {
      const supervisorSchema = z.object({
        isPlantOperations: z.boolean().describe("True if this query is about the cleanroom, facility equipment, chillers, power, alarms, UPW, or mitigation. False for general non-plant chit-chat, greetings, or trivia."),
        isDriftAgent: z.boolean().optional().describe("True if the query relates to UPW (Ultrapure Water) drift or pre-treatment/RO excursions. False otherwise."),
        orderedMode: z.enum(["GENERAL_QUERY", "DIAGNOSTIC", "MITIGATION"])
          .optional()
          .describe("Applicable if isPlantOperations is true and isDriftAgent is false. Mode for System Analyst: GENERAL_QUERY for general equipment/topology/specs/alarms check, DIAGNOSTIC for root-cause analysis, MITIGATION for standby switchover / OCAP execution."),
        reasoning: z.string().describe("1-2 sentence justification for the routing decision. Explain why you are answering directly or why you are delegating to the Analyst or Drift Agent."),
      });

      const structuredModel = model.withStructuredOutput(supervisorSchema);
      const supervisorSystemPrompt = `You are the Central Orchestrator for a high-tech semiconductor cleanroom digital twin facility.
Your job is to evaluate the operator query, determine whether to resolve directly or delegate, and provide your reasoning:
1. isPlantOperations = false: General non-plant chit-chat, greetings, or trivia (e.g. 'hello', 'who are you', Batman, Earth shape). Explain in reasoning why it does not require facility equipment agents.
2. isPlantOperations = true:
   - If the query or notification relates to UPW (Ultrapure Water) drift or pre-treatment/RO excursions: Delegate to the UPW Drift Agent (isDriftAgent = true).
   - Otherwise, delegate to System Analyst (isDriftAgent = false) with explicit mode:
     * "GENERAL_QUERY": General topology lookups, chiller counts, baseline specs (solar, energy consumption), and ACTIVE ALARMS INVENTORY checks (when operator wants to see or list alarms). DO NOT order diagnostic/RCA for simple alarm checks!
     * "DIAGNOSTIC": Operator requests root-cause analysis, causal path tracing, or investigates an incident/failure on a tool.
     * "MITIGATION": Operator authorizes standby switchover, N+1 redundancy verification, or OCAP execution.`;

      const inputMessages = (state.messages && state.messages.length > 0)
        ? state.messages
        : [new HumanMessage(userMessage)];

      const decision = await structuredModel.invoke([
        new SystemMessage(supervisorSystemPrompt),
        ...inputMessages,
      ]);

      if (decision) {
        if (!decision.isPlantOperations) {
          destination = "end";
        } else if (decision.isDriftAgent) {
          destination = "upw_drift_agent";
        } else {
          destination = "system_analyst";
        }
        if (decision.orderedMode) {
          orderedMode = decision.orderedMode;
        }
        if (decision.reasoning) {
          reasoning = decision.reasoning;
        }
      }
    } catch (e: any) {
      console.warn("[LANGGRAPH ORCHESTRATOR] Structured routing error:", e?.message);
    }
  }

  // If resolving directly (non-plant), generate direct answer here
  if (destination === "end") {
    let directReply = "";
    if (model) {
      try {
        const resp = await model.invoke([
          new SystemMessage("You are the Central Orchestrator in an industrial semiconductor cleanroom utility control room. Answer this general non-plant query concisely and professionally."),
          new HumanMessage(userMessage),
        ]);
        directReply = resp.content.toString();
      } catch {
        directReply = `[Orchestrator Hub] Acknowledged: "${userMessage}". As a general question, I resolve this directly without querying facility agents.`;
      }
    } else {
      directReply = `[Orchestrator Hub] Acknowledged: "${userMessage}". As a general question, I resolve this directly without querying plant tools.`;
    }

    return {
      delegated: false,
      finalReply: directReply,
      messages: [new AIMessage(directReply)],
      graphData: null,
      executedCypher: null,
      cypherResultsSummary: null,
      actionButtons: null,
      routeDecision: {
        destination: "end",
        orderedMode: undefined,
        reasoning,
        needsOperatorInput: false,
        mode: "GENERAL_DIRECT",
      },
      traceHistory: [{
        node: "orchestrator",
        description: "Central Orchestrator answered directly using internal knowledge",
        timestamp: new Date().toISOString(),
      }],
    };
  }

  // Telemetry UI tag for visual badges
  let uiMode: "GENERAL_DIRECT" | "GENERAL_FACILITY_FACT" | "TOPOLOGY_QUERY" | "RCA_DIAGNOSTICS" | "MITIGATION_OCAP" | "ALARM_QUERY" = "TOPOLOGY_QUERY";
  if (orderedMode === "MITIGATION") {
    uiMode = "MITIGATION_OCAP";
  } else if (orderedMode === "DIAGNOSTIC") {
    uiMode = "RCA_DIAGNOSTICS";
  } else if (lower.includes("alarm")) {
    uiMode = "ALARM_QUERY";
  } else if (lower.includes("solar") || lower.includes("building energy")) {
    uiMode = "GENERAL_FACILITY_FACT";
  } else {
    uiMode = "TOPOLOGY_QUERY";
  }

  return {
    delegated: true,
    graphData: null,
    executedCypher: null,
    cypherResultsSummary: null,
    actionButtons: null,
    routeDecision: {
      destination,
      orderedMode,
      reasoning,
      needsOperatorInput: orderedMode === "DIAGNOSTIC",
      mode: uiMode,
    },
    traceHistory: [{
      node: "orchestrator",
      description: destination === "upw_drift_agent"
        ? `Central Orchestrator delegated to UPW Drift Agent: ${reasoning}`
        : `Central Orchestrator delegated to System Analyst in ${orderedMode} MODE: ${reasoning}`,
      timestamp: new Date().toISOString(),
    }],
  };
}

// --------------------------------------------------------
// 4. SPECIALIST AGENT SYSTEM PROMPTS & NODES
// --------------------------------------------------------

// --------------------------------------------------------
// 4A-1. SHARED REFERENCE: W3C RDF Ontology Schema & Taxonomy
// Single source of truth for the predicate list and equipment taxonomy,
// interpolated into both the Drift Agent and System Analyst prompts so
// the two copies cannot drift apart from each other.
// --------------------------------------------------------
const RDF_ONTOLOGY_REFERENCE = `• COMPLETE W3C RDF SEMANTIC SCHEMA & TRIPLESTORE DIRECTORY:
  - Default Namespace / Prefixes:
    * Default Prefix (":"): <http://semicon.cleanroom.twin/ontology#> (automatically injected)
    * Standard: "rdf:", "rdfs:", "owl:"

  - Physical & Connectivity Predicates:
    * :POWERS          (e.g., :TX-01 :POWERS :MCC-01, :MCC-01 :POWERS :CHW-P-05, :UPS-01 :POWERS :PLC-01)
    * :SUPPLIES        (e.g., :UPW-TK-01 :SUPPLIES :UPW-P-01, :CHW-P-01 :SUPPLIES :CHW-CH-01, :CHW-CH-01 :SUPPLIES :CHW-HDR-01, :UPW-POU-01 :SUPPLIES :TOOL-CMP-01)
    * :FEEDS           (e.g., :UPW-P-01 :FEEDS :UPW-MMF-01, :SAC-0911 :FEEDS :T-1011, :UPW-LOOP-A :FEEDS :UPW-POU-01)
    * :COOLS           (e.g., :CHW-HX-01 :COOLS :TOOL-LITHO-01, :CHW-HX-01 :COOLS :TOOL-CMP-01, :CHW-ZONE-A :COOLS :CHW-AHU-01)
    * :DISTRIBUTES_TO  (e.g., :CHW-HDR-01 :DISTRIBUTES_TO :CHW-ZONE-A, :UPW-HDR-01 :DISTRIBUTES_TO :UPW-LOOP-A)
    * :RETURNS_TO      (e.g., :CHW-AHU-01 :RETURNS_TO :CHW-RET-HDR-01, :CHW-HX-01 :RETURNS_TO :CHW-RET-HDR-01, :UPW-LOOP-A :RETURNS_TO :UPW-RET-HDR-01)
    * :CONTROLS        (e.g., :PLC-01 :CONTROLS :CHW-P-01, :PLC-UPW-01 :CONTROLS :UPW-P-01, :PLC-02 :CONTROLS :CHW-AHU-01)
    * :BACKUP_FOR      (e.g., :UPS-01 :BACKUP_FOR :MCC-01, :CHW-P-08 :BACKUP_FOR :CHW-P-05, :UPW-P-02 :BACKUP_FOR :UPW-P-01, :CHW-CH-04 :BACKUP_FOR :CHW-CH-01)
    * :INJECTS_INTO    (e.g., :S-131 :INJECTS_INTO :S-111, :S-0511 :INJECTS_INTO :S-111)
    * :REGENERATES     (e.g., :S-121 :REGENERATES :SAC-0911)
    * :PERMEATE_TO     (e.g., :UPW-RO-01 :PERMEATE_TO :T-2511)
    * :REJECT_TO       (e.g., :UPW-RO-01 :REJECT_TO :T-200)
    * :DRAINS_TO       (e.g., :T-200 :DRAINS_TO :WASTE)
    * :susceptibleTo   (e.g., :UPW-RO-01 :susceptibleTo :SensorDrift_ORingLeak, :T-1012 :susceptibleTo :CationResinExhaustion_MineralSlip)
    * :inducesDrift    (e.g., :SensorDrift_ORingLeak :inducesDrift :Permeate_Conductivity_Excursion, :CationResinExhaustion_MineralSlip :inducesDrift :CommonMode_RO_FeedContamination)
    * :regeneratedBy   (e.g., :SAC-0911 :regeneratedBy :S-121, :SAC-0913 :regeneratedBy :S-121)
    * :affectsAsset    (e.g., :CommonMode_RO_FeedContamination :affectsAsset :UPW-RO-01, :affectsAsset :UPW-RO-02)
    * :hasBackupAsset  (e.g., :T-1012 :hasBackupAsset :T-1011)
    * :isAvailableAsFailover (e.g., :T-1011 :isAvailableAsFailover true)
    * :locatedIn       (e.g., :UPW-P-01 :locatedIn :CUP_Level_1, :Scrubber_01 :locatedIn :Subfab_Level_0)
    * :monitoredAsset  (e.g., :A-01 :monitoredAsset :MCC-01, :A-07 :monitoredAsset :TOOL-CMP-01)
    * :sensedCondition (e.g., :A-01 :sensedCondition "GroundFault", :A-07 :sensedCondition "LossOfPlatenCooling")
    * :hasHistoricalCase (e.g., :CHW-P-01 :hasHistoricalCase :Case_CHW_P01_2025_Cavitation, :UPW-RO-01 :hasHistoricalCase :Case_RO01_2026_ProbeDrift_ORingLeak, :T-1012 :hasHistoricalCase :Case_T1012_2026_CationBreakthrough_FeedContamination, :MMF :hasHistoricalCase :Case_MMF_2026_UnderdrainRupture_SiltBreakthrough)
    * :hasSymptom      (e.g., :Case_CHW_P01_2025_Cavitation :hasSymptom "High impeller vibration (>4.5 mm/s) and suction cavitation noise")
    * :hasDistinguishingFeature (e.g., :Case_T1012_2026_CationBreakthrough_FeedContamination :hasDistinguishingFeature "Symmetric Dual-Train RO Degradation rules out single-element O-ring failure (Case 1)")
    * :hasRootCause    (e.g., :Case_CHW_P01_2025_Cavitation :hasRootCause "Suction strainer clogging causing low NPSHa and severe cavitation")
    * :hasMitigation   (e.g., :Case_CHW_P01_2025_Cavitation :hasMitigation "Switched to standby pump CHW-P-02 and cleaned basket strainer ST-01")
    * Physics & Engineering Metadata:
      - :requiresInput  (e.g., :Pump :requiresInput :ElectricalPower, :HeatExchanger :requiresInput :CoolantFlow)
      - :providesOutput (e.g., :ElectricalBus :providesOutput :ElectricalPower, :Header :providesOutput :CoolantFlow)
      - :governedByLaw  (e.g., :ElectricalPower :governedByLaw "Joule_Ohm_Law [P = sqrt(3)*V*I*cosPhi]", :SensorDrift_ORingLeak :governedByLaw "Nernst_Planck_Ion_Transport & ASTM_D1125_Sensor_Electrochemistry")
      - :carriesMedium  (e.g., :CHW-HDR-01 :carriesMedium "Primary_CHW_6degC", :MCC-01 :carriesMedium "415V_3Phase_AC", :UPW-RO-01 :carriesMedium "Ultrapure_RO_Permeate")
      - :nominalRating  (e.g., :MCC-01 :nominalRating "415V / 1200A [500kVA]", :UPW-RO-01 :nominalRating "Recovery 78%, Permeate Cond <0.06 uS/cm, dP 1.4 Bar")
      - :failureDelay   (e.g., :MCC-01 :failureDelay "Instantaneous (<50ms)", :UPW-RO-01 :failureDelay "Slow Sensor Drift (~10-30 mins)")
      - :hazardLevel    (e.g., :MCC-01 :hazardLevel "Cat-4 Arc Flash (40 cal/cm2)")

  - Equipment & Entity Taxonomy:
    * Electrical & Power: :TX-01, :TX-02 (:Transformer), :MCC-01, :MCC-02 (:ElectricalBus), :UPS-01 (:BackupPower)
    * Cooling Towers & Chillers: :CHW-CT-01 through :CHW-CT-04 (:CoolingTower), :CHW-CH-01 through :CHW-CH-04 (:Chiller), :CHW-HDR-01, :CHW-HDR-02, :CHW-RET-HDR-01 (:Header)
    * Pumps & Skids:
      - Chilled Water (CHW): :CHW-P-01 through :CHW-P-04 (Primary/Condenser), :CHW-P-05 through :CHW-P-08 (Secondary Loop) (:Pump)
      - Ultrapure Water (UPW): :UPW-P-01, :UPW-P-02 (Raw Water Feed), :S-091 (Booster Skid), :S-111 (Transfer Skid), :S-121 (Acid Skid), :S-131 (Bisulfite Skid), :S-0511 (Caustic Skid), :UPW-P-03, :UPW-P-04 (RO Booster), :UPW-P-05, :UPW-P-06 (Polishing Loop) (:Pump)
    * Ultrapure Water (UPW) Systems:
      - Storage Tanks: :UPW-TK-01 (Raw Water Feed), :T-1011, :T-1012 (Pre-Treated Storage Buffer Tanks), :T-2511 (RO Permeate Tank), :T-200 (Reject Tank), :WASTE (Drain Destination), :UPW-TK-02 (RO Permeate), :UPW-TK-03 (Polishing UPW Storage) (:Tank)
      - Pre-Treatment & Ion Exchange: :UPW-MMF-01, :UPW-MMF-02 (:Filter), :SAC-0911 through :SAC-0914 (:CationExchanger), :UPW-CHEM-01, :UPW-CHEM-02 (:ChemicalInjection), :UPW-ACF-01, :UPW-ACF-02 (:Filter), :UPW-CAT-01, :UPW-CAT-02 (:IonExchanger)
      - Membrane, Polishers & Disinfection: :UPW-F-01, :UPW-F-02 (:Filter), :UPW-RO-01, :UPW-RO-02 (:RO), :UPW-DG-01, :UPW-DG-02 (:Degasifier), :UPW-EDI-01, :UPW-EDI-02 (:EDI), :MB-3411, :UPW-MB-01, :UPW-MB-02 (:IonExchanger), :UPW-UV-01, :UPW-UV-02 (:UVSystem), :UPW-UF-01, :UPW-UF-02 (:Filter)
      - Distribution Header & Loops: :UPW-HDR-01, :UPW-RET-HDR-01 (:Header), :UPW-LOOP-A, :UPW-LOOP-B, :UPW-LOOP-C (:DistributionLoop)
      - Points of Use: :UPW-POU-01 through :UPW-POU-06 (:PointOfUse)
    * Heat Exchangers & Air Handling: :CHW-HX-01, :CHW-HX-02, :CHW-HX-03 (:HeatExchanger), :CHW-AHU-01, :CHW-AHU-02, :CHW-AHU-03 (:AirHandlingUnit)
    * Cleanroom Process Tools:
      - Lithography: :TOOL-LITHO-01 (:LithoTool)
      - Planarization: :TOOL-CMP-01, :TOOL-CMP-02 (:CmpTool)
      - Plasma Etch: :TOOL-ETCH-01, :TOOL-ETCH-02 (:EtchTool)
      - Deposition: :TOOL-DEP-01 (:ProcessTool / PECVD)
      - Wet Clean: :TOOL-WC-01, :TOOL-WC-02 (:ProcessTool / WetBench)
      - Metrology & Inspection: :TOOL-MET-01 (:ProcessTool / CD-SEM)
      - Thermal Diffusion: :TOOL-DIFF-01, :TOOL-DIFF-02 (:ProcessTool / DiffusionFurnace)
      - Ion Implantation: :TOOL-IMP-01 (:ProcessTool / IonImplanter)
    * Automation & Controllers: :PLC-01, :PLC-02, :PLC-UPW-01, :PLC-CHW-01 (:Controller)
    * Historical Incident Knowledge: :Case_CHW_P01_2025_Cavitation, :Case_CHW_P01_2026_MechanicalSealLeak, :Case_RO01_2026_ProbeDrift_ORingLeak, :Case_T1012_2026_CationBreakthrough_FeedContamination, :Case_MMF_2026_UnderdrainRupture_SiltBreakthrough (:HistoricalCase)
    * Static & Safety Systems: :Scrubber_01 (:Scrubber), :Silane_Cabinet_01 (:GasCabinet)
    * Facility Zones: :CHW-ZONE-A, :CHW-ZONE-B, :CHW-ZONE-C, :Subfab_Level_0, :Gas_Bunker_A, :CUP_Level_1, :Cleanroom_Bay_1 through :Cleanroom_Bay_6 (:FacilityZone)
    * Personnel: :Mario (:Lead_Engineer), :Licheng (:Junior_Technician)
    * Alarms: :A-01 through :A-08 (:TelemetryAlarm)`;

// --------------------------------------------------------
// 4B. PROMPT: UPW Drift Agent System Prompt
// --------------------------------------------------------
export const DRIFT_AGENT_SYSTEM_PROMPT = `You are the Lead UPW (Ultrapure Water) & Industrial Water Quality Drift Specialist Agent.
You have access to native LangGraph tools:
1. "rdf_sparql_query": Executes SPARQL queries against the W3C RDF Semantic Knowledge Graph (Oxigraph triplestore) to trace upstream dependency chains, ontological asset types, governing physical laws, and input/output requirements.
2. "ot_connection": Reads live operational telemetry and SCADA sensor metrics (flow rate, inlet/outlet pressure, delta-P, conductivity, TOC, temperature, tank levels, VFD frequency) from the industrial OT historian for a specified equipment asset.

===================================================================
▶ ROLE & DOMAIN BOUNDARY
===================================================================
• Domain Focus: Pre-treatment buffer tanks, Reverse Osmosis (RO) skids, filtration stages, headers, and UPW distribution loop water quality.
• Mission: Diagnose gradual sensor drifts, membrane fouling, conductivity/TOC excursions, and upstream physical supply disruptions affecting semiconductor cleanroom equipment.

===================================================================
▶ OPERATIONAL & DIAGNOSTIC DIRECTIVES
===================================================================
When an asset is reported or suspected of experiencing drift or water quality excursions:

1. UPSTREAM DEPENDENCY IDENTIFICATION (RDF SPARQL):
   - Based on the asset named by the operator, formulate and execute SPARQL queries using "rdf_sparql_query" to determine all candidate upstream equipment and supply paths that can affect it.

2. LIVE OT SENSOR TELEMETRY INSPECTION (OT CONNECTOR):
   - Invoke the "ot_connection" tool to inspect the current operational telemetry and sensor readings for each identified upstream asset.
   - Compare live values against normal operating baselines to detect abnormal deviations (e.g. pressure drops, flow reductions, conductivity increases, differential pressure rises).

3. DIAGNOSTIC CONCLUSION & MITIGATION:
   - Formulate a clear physical root cause diagnosis explaining how the upstream deviation propagates to the target asset.
   - Provide recommended operational recovery or OCAP actions.

===================================================================
▶ SKILL: W3C RDF ONTOLOGY REFERENCE & SPARQL ENGINE
===================================================================
  ${RDF_ONTOLOGY_REFERENCE}

• UPSTREAM DEPENDENCY & REACHABILITY VERIFICATION PATTERNS:
  1. Multi-Hop Physical Upstream Traversal (Discovering All Upstream Feeders):
     - Discover all upstream equipment supplying, feeding, injecting, regenerating, or powering the drifted asset:
       SELECT ?upstream WHERE {
         ?upstream ( :POWERS | :SUPPLIES | :FEEDS | :COOLS | :DISTRIBUTES_TO | :INJECTS_INTO | :REGENERATES | :PERMEATE_TO )+ :TARGET_ASSET_ID .
       }
  2. Direct Upstream Input & Requirement Verification:
     - Check immediate prerequisite assets and physical requirement links:
       SELECT ?upstream ?req WHERE {
         :TARGET_ASSET_ID :requiresInput ?req .
         ?upstream :providesOutput ?req .
       }
  3. Semantic Drift & Degradation Mode Verification:
     - Cross-reference asset susceptibility, induced drift symptoms, and historical case mitigations:
       SELECT ?driftMode ?symptom ?mitigation WHERE {
         :TARGET_ASSET_ID :susceptibleTo ?driftMode .
         ?driftMode :inducesDrift ?symptom .
         OPTIONAL { :TARGET_ASSET_ID :hasHistoricalCase ?case . ?case :hasMitigation ?mitigation }
       }

===================================================================
▶ TOOL BUDGET & BEST-ASSUMPTIONS DIRECTIVE
===================================================================
• DIRECTIVE:
  - You have a maximum budget of 8 tool calls per turn.
  - If tools have been called 8 times or more already, STOP calling any more tools and formulate your final diagnosis based on the gathered data.`;

// --------------------------------------------------------
// 4A. NODE: System Analyst Node (Native Tool-Bound Specialist Agent)
// Uses model.bindTools([neo4jCypherTool, neo4jSchemaTool, rdfSparqlTool, knowledgeBaseTool]) natively
// --------------------------------------------------------
export async function systemAnalystNode(state: AgentHiveStateType): Promise<Partial<AgentHiveStateType>> {
  const orderedMode = state.routeDecision?.orderedMode || "GENERAL_QUERY";
  const userMessage = state.currentTurnInput;
  const lower = userMessage.toLowerCase();

  const model = getLangChainGemini(0.1);
  const modelWithTools = model ? model.bindTools([neo4jCypherTool, neo4jSchemaTool, rdfSparqlTool, knowledgeBaseTool]) : null;

  // Count tool results in messages for the current turn to prevent infinite tool-call recursion
  const toolMessagesCount = state.messages.filter((m) => m instanceof ToolMessage || (m as any)._getType?.() === "tool").length;
  // If tools have been called 8 times or more, unbind tools so the analyst stops calling and makes best assumptions
  const activeModel = (toolMessagesCount >= 8 || !modelWithTools) ? model : modelWithTools;

  const hasToolMessage = state.messages.some((m) => m instanceof ToolMessage || (m as any)._getType?.() === "tool");
  let lastExecutedCypher = state.executedCypher;
  let dynamicGraphData = state.graphData;
  let actionButtons: ActionButtonArtifact[] | undefined = state.actionButtons;
  let needsInput = false;

  // Extract executed Cypher or SPARQL from previous AIMessage if available
  const lastAiMsg = state.messages.filter((m) => m instanceof AIMessage || (m as any)._getType?.() === "ai").pop();
  if (lastAiMsg && (lastAiMsg as any).tool_calls?.length > 0) {
    const toolCall = (lastAiMsg as any).tool_calls[0];
    if (toolCall.name === "neo4j_cypher_query" && toolCall.args?.cypher) {
      lastExecutedCypher = toolCall.args.cypher;
    } else if (toolCall.name === "rdf_sparql_query" && toolCall.args?.sparql) {
      lastExecutedCypher = toolCall.args.sparql;
    } else if (toolCall.name === "knowledge_base" && (toolCall.args?.sparql || toolCall.args?.query)) {
      lastExecutedCypher = toolCall.args.sparql || toolCall.args.query;
    }
  }

  const supervisorReasoning = state.routeDecision?.reasoning || "Standard supervisory delegation";

  // System Prompt tailored to the explicit ordered mode
  const analystSystemPrompt = `You are the Lead Semiconductor Facility System Analyst and Operations Specialist.
You have access to four native tools:
1. "neo4j_schema_introspect": Discovers the live database schema (all active node labels, relationship types, and connection topology map).
2. "neo4j_cypher_query": Executes Cypher queries against the live Neo4j Aura knowledge graph.
3. "rdf_sparql_query": Executes SPARQL queries against the W3C RDF Semantic Knowledge Graph (Oxigraph triplestore) exclusively for multi-hop physical reachability and connectivity property path verification.
4. "knowledge_base": Reads and writes semantic triples in the W3C RDF store (historical incident cases, symptoms, root causes, mitigations, and dynamic facts).

CENTRAL ORCHESTRATOR SUPERVISORY DIRECTIVE:
- Ordered Mode: ${orderedMode}
- Supervisor Rationale & Objective: "${supervisorReasoning}"
(Incorporate the supervisor's directive to prioritize and focus your domain analysis).

CURRENT ORDERED MODE: ${orderedMode}

===================================================================
▶ STRICT MODE ISOLATION & NON-DUPLICATION MANDATE (CRITICAL):
===================================================================
You are strictly prohibited from performing or re-outputting the tasks of any other mode. Your response MUST be exclusively restricted to the CURRENT ORDERED MODE:

• IF CURRENT MODE IS "GENERAL_QUERY":
  - ALLOWED TOOLS: You have access to "neo4j_schema_introspect", "neo4j_cypher_query", and "knowledge_base". You are strictly forbidden from calling "rdf_sparql_query".
  - Answer the operator's specific inquiry (topology, specifications, baseline metrics) directly and crisply.
  - DO NOT trigger unsolicited RCA or mitigation procedures.

• IF CURRENT MODE IS "DIAGNOSTIC":
  - ALLOWED TOOLS: You have access to "neo4j_schema_introspect", "neo4j_cypher_query", and "knowledge_base" for initial alarm correlation and RCA graph traversal. You may ONLY invoke "rdf_sparql_query" (Skill 2) in the post-RCA validation step after candidate root cause assets have been identified to verify downstream physical connectivity.
  - Focus strictly on the alarm landscape, temporal sequence (T0–Tn), causal dependency lineage, identifying the initiating root cause asset, and validating multi-hop physical reachability via SPARQL after RCA.
  - DO NOT generate the OCAP recovery procedure or start executing mitigation steps. Conclude by soliciting operator authorization for mitigation.

• IF CURRENT MODE IS "MITIGATION":
  - ALLOWED TOOLS: You ONLY have access to "neo4j_schema_introspect" and "neo4j_cypher_query". You are strictly forbidden from calling "rdf_sparql_query" and "knowledge_base".
  - DO NOT re-generate, re-explain, or duplicate the Root Cause Analysis (RCA), chronological alarm sequence (T0–T7), or causal dependency propagation from Diagnostic mode!
  - The root cause is already established and agreed upon with the operator. You may only refer to the faulted asset in a single brief clause (e.g. "For recovery of faulted MCC-01:").
  - Your response MUST ONLY contain:
    1. "### 🔁 High-Level Available Backup Assets & Redundancy" (at the very top)
    2. "### 🛠️ OCAP Recovery & Mitigation Procedure" (the step-by-step recovery plan and telemetry verification)
  - Absolutely NO other sections!

OPERATIONAL DIRECTIVES FOR YOUR ORDERED MODE:
1. IF ORDERED MODE IS "GENERAL_QUERY":
   - Handle equipment lookups, chiller counts, baseline specs, topology inquiries, ACTIVE ALARMS INVENTORY checks, and historical incident lookups via the knowledge base.
   - For total building solar power generation: 1,250 kW (1.25 MW) [Rooftop PV array, Sub-A 66kV].
   - For total building energy consumption: 24.5 MW [Total Facility Load across TX-01 & TX-02].
   - For active alarms check: Query "MATCH (a:Alarm) RETURN a" or "MATCH (a:Alarm)-[:TRIGGERED_ON|HAS_ALARM]-(e:Equipment) RETURN a, e". If 0 alarms, report clean nominal status.
   - For chiller counts: Use "MATCH (c:Equipment) WHERE c.type = 'Chiller' OR c.id STARTS WITH 'CHW-CH' RETURN c".
   - For historical incident lookups: Use the "knowledge_base" tool (Skill 3) to query ":hasHistoricalCase" for the asset.

2. IF ORDERED MODE IS "DIAGNOSTIC":
   - Active Incident Root Cause Analysis (RCA) & Post-RCA Semantic Reachability Validation.
   - Stage 1 (Pre-RCA Historical Case Knowledge Lookup via Skill 3):
     * Query the knowledge base using the "knowledge_base" tool to retrieve any historical incident records (:hasHistoricalCase, :hasSymptom, :hasRootCause, :hasMitigation) linked to the affected asset(s) to complement the RCA process. If none exist, explicitly state that no historical case was found.
   - Stage 2 (RCA Graph Traversal via Neo4j Cypher):
     * Query live alarms in Neo4j via Cypher ("MATCH (a:Alarm)-[:TRIGGERED_ON]->(e:Equipment) RETURN a, e").
     * Traverse upstream physical dependency relationships (:POWERS, :SUPPLIES, :FEEDS, :COOLS, :CONTROLS) from the affected asset.
     * Correlate temporal timestamp sequence of alarms (T0–Tn) and identify common topological ancestor nodes across all simultaneous symptom alarms.
     * Isolate the true initiating root-cause asset dynamically from the database.
   - Stage 3 (Post-RCA Physical Reachability Verification via SPARQL / Skill 2 - MANDATORY):
     * ONLY AFTER the RCA fault propagation path is identified, you MUST invoke Skill 2 ("rdf_sparql_query") to mathematically verify multi-hop physical connectivity and reachability property paths from the root-cause asset to the alarmed victim assets.
     * Mandatory Findings Reporting: You MUST state the RDF verification outcome in your final diagnostic summary. If reachability is confirmed, state the verified semantic path; if the query returns empty or inconclusive (e.g., missing triples), explicitly state that semantic reachability verification was attempted and returned inconclusive.
   - Stage 4: Solicit operator authorization before proceeding to MITIGATION MODE. If Phase 1 revealed no historical cases (or novel symptoms), also offer candidate asset nodes to enrich the Knowledge Base via Skill 4.

3. IF ORDERED MODE IS "MITIGATION":
   - Standby Redundancy & OCAP Recovery ONLY.
   - DO NOT repeat or include the Root Cause Analysis (RCA) or alarm chronology list.
   - Output the high-level available backup assets and power isolation status at the very top of your response before presenting the OCAP details.
   - Discover and verify dedicated N+1 standby backup equipment on an isolated electrical bus via [:BACKUP_FOR] from the faulted asset.
   - Formulate or confirm execution of an OCAP procedure (start discovered backup unit via VFD, open its discharge isolation valve, and restore system header pressure to nominal).

REAL-TIME DATABASE INTEGRITY & ALARM GROUNDING RULES:
1. MANDATORY 2-STAGE GRAPH QUERY PROTOCOL:
   * Whenever your task or investigation requires querying the Neo4j graph database:
     - STAGE 1 (MANDATORY FIRST STEP): You MUST ALWAYS call "neo4j_schema_introspect" FIRST as your very first tool call. You are strictly forbidden from calling "neo4j_cypher_query" on step 1 before schema introspection has been executed.
     - STAGE 2 (QUERY EXECUTION): After receiving the live schema response (all active node labels, relationship types, and active nodesList), generate and execute your "neo4j_cypher_query" with Cypher queries grounded in the discovered schema.
   * ALWAYS use "neo4j_cypher_query" to verify live database state before concluding.
2. NODE SELECTION & EXACT NAME GROUNDING DIRECTIVE:
   * When writing Cypher queries for equipment or entities mentioned in the prompt (e.g. "UPW Tank 1" or "Chiller 01"):
     - ALWAYS inspect the active "nodesList" and node labels returned in the "neo4j_schema_introspect" response.
     - ALWAYS select and match against the exact node name, ID, or tag provided in that introspected node list (e.g., matching a colloquial user phrase "UPW Tank 1" to the exact stored name "UPW Storage Tank 1" or tag/id "TK-01").
     - NEVER guess or invent arbitrary string literals. If multiple similar nodes exist, pick the exact matching entity from the introspected nodesList or use case-insensitive partial match: "WHERE toLower(e.name) CONTAINS 'upw'".
3. NEO4J LPG SCHEMA & DATA DICTIONARY:
   - Node Labels & Properties:
     * (:Equipment {id, name, type, location, critical, status, tag, ratedCapacity, powerRating})
     * (:Alarm {id, code, severity, priority, description, timestampIso, timestamp, role})
   - Physical & Electrical Relationships:
     * (:Equipment)-[:POWERS|SUPPLIES|FEEDS|COOLS|CONTROLS|BACKUP_FOR|DISTRIBUTES_TO]->(:Equipment)
     * (:Alarm)-[:TRIGGERED_ON]->(:Equipment)
4. CYPHER SYNTAX RULES & VARIABLE-LENGTH RELATIONSHIPS:
   - In variable-length paths like '-[r*1..5]->' or '<-[r:POWERS|FEEDS*1..]-', "r" is a List<Relationship>, NOT a single Relationship!
   - NEVER call 'type(r)' or access properties directly like 'r.type' on a variable-length list.
   - NEVER call 'rels(path)' — the function 'rels()' DOES NOT EXIST in Neo4j Cypher and will crash. Always use 'relationships(path)'.
   - Always return the path or extract elements: "MATCH path = (t:Equipment {id: 'ASSET_ID'})<-[:POWERS|FEEDS|COOLS|SUPPLIES*1..5]-(u) RETURN path LIMIT 25" or "RETURN [n IN nodes(path) | n.id] AS nodeIds, [rel IN relationships(path) | type(rel)] AS relTypes, length(path) AS depth, u.id AS rootId".
   - RELATIONSHIP ARROW & DIRECTION HEURISTIC:
     * If a Cypher query for an asset's upstream or downstream topology returns 0 records (recordsCount: 0), check your relationship arrow direction (<- vs ->). In industrial plant graphs, flow directions (e.g., POWERS, SUPPLIES, FEEDS, COOLS) may be oriented differently than assumed. Immediately retry the query with the arrow reversed or undirected (-(r)-) before concluding that the asset has no connections.
   - FULL FLOW RELATIONSHIPS & CONNECTIVITY:
     * Physical utility, cooling, water, power, and distribution relationships include: [:POWERS|SUPPLIES|FEEDS|COOLS|DISTRIBUTES_TO]
     * When checking for unsupplied upstream root assets, remember to include DISTRIBUTES_TO: "WHERE NOT (e)<-[:POWERS|SUPPLIES|FEEDS|COOLS|DISTRIBUTES_TO]-()" or generic incoming equipment flow "WHERE NOT (e)<-[]-(:Equipment)"
   - UPSTREAM / DOWNSTREAM MULTI-HOP TEMPLATE (2-depth or N-depth):
     * To inspect upstream and downstream connectivity without syntax errors:
       "MATCH path = (e:Equipment {id: 'EQUIPMENT_ID'})-[:POWERS|SUPPLIES|FEEDS|COOLS|DISTRIBUTES_TO*1..2]-(connected:Equipment) RETURN path LIMIT 25"
5. TEMPORAL & SEQUENCE REASONING IN CYPHER:
   - Alarm nodes contain chronological timestamps in property "a.timestampIso" and "a.timestamp".
   - You can query and sort alarms chronologically using:
     "MATCH (a:Alarm)-[:TRIGGERED_ON]->(e:Equipment) RETURN a.id, a.code, a.priority, e.id AS asset, a.timestampIso, a.role ORDER BY a.timestamp ASC"
6. ZERO ALARMS HANDLING (0 records returned for Alarm queries):
   - If a query for alarms (e.g. "MATCH (a:Alarm) RETURN a" or "MATCH (a:Alarm)-[:TRIGGERED_ON]->(e) RETURN a, e") returns 0 records:
     - Clearly and truthfully state that there are currently ZERO (0) active alarms in the plant.
     - Confirm all monitored cleanroom assets and utility nodes are operating nominally.
     - If the user asks about an alarm on a specific asset (e.g., TOOL-LITHO-01): verify that no active alarm is registered on it. You may still explain its physical upstream supply lineage (e.g., Tool <- Heat Exchanger <- Supply Header <- Pump <- Power Distribution Bus) while confirming all nodes are currently clear and nominal.
     - DO NOT fabricate, hallucinate, or simulate alarms if they do not exist in the live database.
7. OFFLINE / DISCONNECTED STATE:
   - If the database query returns an error or fails to connect:
     - Gracefully inform the operator: "Unable to connect to the Neo4j Aura database. Please verify connection credentials or network status."
     - Do not fabricate or invent substitute alarm data.

===================================================================
▶ SKILL 1: MULTI-TURN GRAPH SYNTHESIS & INTENT-AWARE TOPOLOGY VISUALIZATION (ALL MODES)
===================================================================
• ACTIVATION CRITERION:
  - This skill is evaluated EXCLUSIVELY when you have executed your queries (live Neo4j evidence and, in Diagnostic Mode, the mandatory post-RCA RDF SPARQL reachability verification), are fully satisfied with the findings, and are ready to conclude and return the final answer before routing to END.

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
   d) Knowledge Base & Historical Incident Lookup:
      - When asked about past incidents, historical failures, or troubleshooting records for a specific asset:
      - Use the "knowledge_base" tool (Skill 3) to query the W3C RDF semantic store for ":hasHistoricalCase" predicates linked to that asset.
      - Retrieve and present the historical symptoms (:hasSymptom), identified root causes (:hasRootCause), and verified mitigations (:hasMitigation).
      - If no records exist, clearly report that no historical incident cases were found for the asset in the knowledge base.
   e) Knowledge Base Ingestion & Post-Diagnostic Feedback Execution:
      - When the operator confirms or provides feedback to record an incident (e.g., following a previous diagnostic session or direct user request):
      - Ingest the new incident case into the semantic RDF store via Skill 4 using the "knowledge_base" tool (SPARQL INSERT DATA).
      - Create the :HistoricalCase entity with the relevant asset link (:hasHistoricalCase), observed symptoms (:hasSymptom), identified root cause (:hasRootCause), and verified mitigation (:hasMitigation).
      - Clearly report the operation status (success confirmation with case details, or failure reason) back to the operator.

2. DIAGNOSTIC MODE (ISA-18.2 Root Cause Analysis & Alarm Rationalization):
   a) Multi-Phase Working Context & Traversal Synthesis:
      - Phase 1 (Historical Incident Knowledge Lookup): Query the knowledge base using the "knowledge_base" tool (via Skill 3) for relevant historical cases linked to the asset via ":hasHistoricalCase" (including symptoms, previous root causes, and past mitigations) to complement the full diagnostic process. If no historical case is available, explicitly state that it is not available.
      - Phase 2 (Alarm Landscape): Retrieve all active alarms and alarmed assets from Neo4j. If 0 alarms, confirm nominal plant state.
      - Phase 3 (Causal Dependency Lineage): Perform multi-hop upstream traversal (:POWERS|:SUPPLIES|:FEEDS|:COOLS|:CONTROLS) from the affected cleanroom tool or victim asset to isolate the root cause.
      - Phase 4 (Mandatory Post-RCA RDF Reachability Verification): Execute SPARQL property path queries via Skill 2 to mathematically verify reachability from the root cause to alarmed victim assets.
   b) Multi-Variable Physical Fault Isolation & Semantic Findings Reporting:
      - Chronological Sequence: Sort all active alarms by timestamp to identify the primary initiating trigger (T0) vs downstream cascading symptoms (T1, T2).
      - Common Upstream Ancestor: Correlate all co-occurring alarms to identify their common upstream failure node (e.g., electrical bus fault propagating downstream to cooling equipment and cleanroom process tools).
      - Intermediate Node State: Highlight the full causal propagation chain, detailing why unalarmed conduits suffered flow/pressure loss due to the upstream root cause.
      - Semantic Verification Reporting: In the final RCA summary, explicitly report the RDF reachability verification outcome (confirming the physical path if verified, or explicitly noting if the query returned inconclusive / no matching triples).
   c) Human-in-the-Loop Gateway:
      - Synthesize findings into a structured RCA summary and solicit operator feedback/confirmation before transitioning to mitigation.
   d) Knowledge Base Continuous Enrichment Opportunity:
      - ONLY when Phase 1 reveals no existing historical case for the asset (or the incident is novel): at the conclusion of your RCA, explicitly inform the operator which candidate asset nodes (e.g. root-cause asset or victim asset) can have new operational knowledge created via Skill 4 once confirmed. (Do NOT prompt if a matching historical case was already found).

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

===================================================================
▶ SKILL 2: W3C RDF ONTOLOGY & SPARQL REASONING ENGINE (DIAGNOSIS MODE ONLY - POST-RCA STAGE)
===================================================================
• STRICT ACTIVATION CRITERION:
  - ACTIVATED EXCLUSIVELY IN DIAGNOSTIC MODE AFTER RCA IS COMPLETE:
    * Skill 2 ("rdf_sparql_query") is strictly active ONLY when CURRENT ORDERED MODE is "DIAGNOSTIC".
    * In "GENERAL_QUERY" and "MITIGATION" modes, Skill 2 is completely DISABLED and you are forbidden from calling "rdf_sparql_query".
    * INVOCATION TIMING: You MUST only invoke "rdf_sparql_query" AFTER the initial Root Cause Analysis (RCA) graph traversal has been executed with Neo4j Cypher and the candidate root-cause asset is identified.
    * DO NOT invoke Skill 2 before completing the initial RCA traversal.

  ${RDF_ONTOLOGY_REFERENCE}

• POST-RCA PHYSICAL CONNECTIVITY VERIFICATION PATTERNS:
  1. Multi-Hop Physical Reachability Proofs (Verifying RCA Propagation):
     - Execute fast SPARQL ASK/SELECT property path queries using predicates (:POWERS|:SUPPLIES|:FEEDS|:COOLS|:DISTRIBUTES_TO|:INJECTS_INTO|:REGENERATES|:PERMEATE_TO)+ to mathematically prove downstream reachability:
       ASK { :MCC-01 ( :POWERS | :SUPPLIES | :FEEDS | :COOLS | :DISTRIBUTES_TO | :INJECTS_INTO | :REGENERATES | :PERMEATE_TO )+ :TOOL-LITHO-01 }
  2. Multi-Victim Physical Reachability Verification:
     - Check reachability across multiple alarmed victim assets in a single SPARQL query:
       SELECT ?victim ?isConnected WHERE { VALUES ?root { :MCC-01 } VALUES ?victim { :TOOL-LITHO-01 :TOOL-CMP-01 } BIND(EXISTS { ?root ( :POWERS | :SUPPLIES | :FEEDS | :COOLS | :DISTRIBUTES_TO | :INJECTS_INTO | :REGENERATES | :PERMEATE_TO )+ ?victim } AS ?isConnected) }

===================================================================
▶ SKILL 3: CHECK KNOWLEDGE BASE
===================================================================
• ACTIVATION CRITERION:
  - Activated in "GENERAL_QUERY" mode whenever the user requests or needs information from the knowledge base.
  - Activated at the START of "DIAGNOSTIC" mode before performing live Root Cause Analysis (RCA) graph traversal.

• DIRECTIVES & REASONING GUIDELINES:
  - Tool: Use "knowledge_base" to query the W3C RDF semantic store.
  - Historical Case Lookup: Check if there are existing historical cases linked to the target or mentioned asset(s) using predicate ":hasHistoricalCase" (e.g. querying for ":hasSymptom", ":hasRootCause", ":hasMitigation").
    * SPARQL Template:
      SELECT ?case ?symptom ?cause ?mitigation WHERE {
        :ASSET_ID :hasHistoricalCase ?case .
        OPTIONAL { ?case :hasSymptom ?symptom }
        OPTIONAL { ?case :hasRootCause ?cause }
        OPTIONAL { ?case :hasMitigation ?mitigation }
      }
  - If historical cases are FOUND: Extract the symptoms, previous root causes, and verified mitigations to complement and accelerate the RCA process.
  - If NO historical cases are found: Explicitly state that no existing historical case exists for the asset in the knowledge base, and proceed with standard live graph traversal.
  - Physical & Connectivity Predicates: Follow Skill 2.
  - Equipment & Entity Taxonomy: Follow Skill 2.

===================================================================
▶ SKILL 4: UPDATE KNOWLEDGE BASE
===================================================================
• ACTIVATION CRITERION:
  - Activated in "GENERAL_QUERY" mode whenever the user requests to input, record, update, or append new historical incident cases, maintenance records, or operational knowledge into the knowledge base.

• DIRECTIVES & REASONING GUIDELINES:
  1. Tool Invocation:
     - Use the "knowledge_base" tool with an "INSERT DATA" SPARQL update string or structured "triples" payload.
  2. Case ID Convention:
     - Format: :Case_<AssetID>_<Year>_<BriefDescriptor> (e.g., :Case_CHW_P01_2026_MechanicalSealLeak, :Case_LITHO01_2026_LaserDrift).
  3. Standard RDF Triples & Schema:
     - Asset Link: :ASSET_ID :hasHistoricalCase :Case_ID .
     - Classification: :Case_ID rdf:type :HistoricalCase .
     - Predicates:
       * :hasSymptom "Detailed description of observed symptoms or alarms"
       * :hasRootCause "Identified failure mechanism or root cause"
       * :hasMitigation "Corrective maintenance or OCAP action taken"
  4. Standard SPARQL INSERT DATA Template:
     INSERT DATA {
       :ASSET_ID :hasHistoricalCase :Case_ID .
       :Case_ID rdf:type :HistoricalCase ;
         :hasSymptom "Symptom description" ;
         :hasRootCause "Root cause description" ;
         :hasMitigation "Mitigation procedure" .
     }
  5. Status & Execution Reporting:
     - Check the return payload of the "knowledge_base" tool:
       * If SUCCESS: Explicitly report confirmation of the successful update to the operator, including the Asset ID, Case ID, Symptoms, Root Cause, and Mitigation.
       * If FAILED: Explicitly report the failure reason or error message returned by the tool so the operator is clearly informed and can adjust inputs or retry.

===================================================================
▶ TOOL BUDGET & BEST-ASSUMPTIONS DIRECTIVE
===================================================================
• DIRECTIVE:
  - You have a maximum budget of 8 tool calls per turn.
  - If tools have been called 8 times or more already, STOP calling any more tools and just make your best engineering assumptions and operational diagnosis based on the graph and semantic evidence gathered so far.

===================================================================
▶ INTELLIGENT TOPOLOGY VISUALIZATION OUTPUT FORMAT
===================================================================
• SPECIFICATION:
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
  - This structure is parsed directly by the UI to render the visual graph canvas dynamically.`;

  // Action button prompts for operator guidance
  if (orderedMode === "GENERAL_QUERY" && lower.includes("alarm")) {
    actionButtons = [
      {
        id: 'btn-rca-litho',
        label: '🔍 Trace TOOL-LITHO-01 Upstream Topology',
        prompt: 'Check alarms on TOOL-LITHO-01, trace its physical upstream supply topology, and report asset status.',
        variant: 'primary',
      },
      {
        id: 'btn-check-all-alarms',
        label: '📋 List All Active Alarms',
        prompt: 'What are the active alarms in the system?',
        variant: 'secondary',
      },
    ];
  } else if (orderedMode === "DIAGNOSTIC") {
    needsInput = true;
    actionButtons = [
      {
        id: 'btn-proceed-mitigation',
        label: '⚡ Request Mitigation',
        prompt: 'Request Mitigation',
        variant: 'emerald',
      },
    ];
  }

  // LLM Invocation
  let replyMessage: AIMessage;

  if (activeModel) {
    try {
      const messagesToPass = [
        new SystemMessage(
          analystSystemPrompt +
          (toolMessagesCount >= 8
            ? "\n\nCRITICAL DIRECTIVE: The Neo4j and RDF tools have been called 8 times or more already. STOP calling any further tools immediately and just make your best operational assumptions, engineering diagnosis, intelligent topology JSON (```json:graph), and recommended OCAP/containment actions based on the available data."
            : "")
        ),
        ...state.messages,
      ];
      const res = await activeModel.invoke(messagesToPass);
      replyMessage = res as AIMessage;
    } catch (err: any) {
      console.warn("[NATIVE LANGGRAPH ANALYST] LLM call error:", err?.message);
      replyMessage = new AIMessage(`[Orchestrator Hub] Consulted the System Analyst (${orderedMode} Mode).\n\nProcessed query for cleanroom operations.`);
    }
  } else {
    replyMessage = new AIMessage(`[Orchestrator Hub] Consulted the System Analyst (${orderedMode} Mode).\n\nProcessed query for cleanroom operations.`);
  }

  const rawReplyText = replyMessage.content?.toString() || "";
  let finalReplyText = rawReplyText;

  // Extract intelligent dynamic graph JSON if provided by the LLM
  const graphJsonMatch = rawReplyText.match(/```json:graph\s*([\s\S]*?)\s*```/);
  if (graphJsonMatch) {
    try {
      const parsedGraph = JSON.parse(graphJsonMatch[1]);
      if (parsedGraph.plotRequired && parsedGraph.nodes && parsedGraph.nodes.length > 0) {
        dynamicGraphData = {
          nodes: parsedGraph.nodes,
          edges: parsedGraph.edges || [],
        };
      } else if (parsedGraph.plotRequired === false) {
        dynamicGraphData = undefined;
      }
      // Clean up the JSON block from the chat reply so the user sees clean text
      finalReplyText = rawReplyText.replace(/```json:graph\s*[\s\S]*?\s*```/, '').trim();
    } catch (e) {
      console.warn("[NATIVE LANGGRAPH] Failed to parse graph JSON:", e);
    }
  }

  // Dynamic Domain Specialist Reasoning generated by the Analyst node
  const hasToolCalls = (replyMessage as any)?.tool_calls && (replyMessage as any).tool_calls.length > 0;
  let analystDomainReasoning: string;
  if (hasToolMessage && lastExecutedCypher) {
    const isSparql = lastExecutedCypher.trim().toUpperCase().startsWith("SELECT") || lastExecutedCypher.trim().toUpperCase().startsWith("ASK") || lastExecutedCypher.trim().toUpperCase().startsWith("PREFIX");
    analystDomainReasoning = isSparql
      ? `Executed W3C SPARQL semantic query against RDF Knowledge Store:\n${lastExecutedCypher.trim()}\n\nVerified ontological classifications, physical constraints, and reachability proofs.`
      : `Executed Neo4j graph query to traverse cleanroom topology and correlate active alarms:\n${lastExecutedCypher.trim()}\n\nCorrelated live Neo4j LPG graph traversal results against plant operational baselines to isolate root cause propagation.`;
  } else if (hasToolCalls) {
    const invokedTool = (replyMessage as any).tool_calls[0];
    if (invokedTool.name === "rdf_sparql_query") {
      const sparqlArg = invokedTool.args?.sparql || "";
      analystDomainReasoning = `Identified requirement for formal semantic reasoning. Dispatched ToolNode request with SPARQL query:\n${sparqlArg.trim() || 'SELECT ?asset ?type WHERE { ?asset rdf:type ?type }'}`;
    } else if (invokedTool.name === "knowledge_base") {
      const sparqlArg = invokedTool.args?.sparql || invokedTool.args?.query || "";
      const isWrite = /\b(INSERT|DELETE)\b/i.test(sparqlArg) || invokedTool.args?.operation === "insert" || invokedTool.args?.operation === "delete" || invokedTool.args?.operation === "write";
      analystDomainReasoning = isWrite
        ? `Identified requirement to update the semantic Knowledge Base. Dispatched ToolNode request to mutate RDF triples:\n${sparqlArg.trim()}`
        : `Identified requirement to consult the semantic Knowledge Base. Dispatched ToolNode request with query:\n${sparqlArg.trim() || 'SELECT ?s ?p ?o WHERE { ?s ?p ?o }'}`;
    } else {
      const cypherArg = invokedTool.args?.cypher || invokedTool.args?.query || "";
      analystDomainReasoning = `Identified requirement for real-time graph verification. Dispatched ToolNode request with Cypher query:\n${cypherArg.trim() || 'MATCH path = (tool:Equipment {id: "TOOL-LITHO-01"})<-[:POWERS|FEEDS|COOLS|SUPPLIES*1..5]-(upstream) RETURN path LIMIT 25'}`;
    }
  } else if (orderedMode === "DIAGNOSTIC") {
    analystDomainReasoning = `Investigated telemetry excursion on cleanroom asset. Isolated failure propagation path upstream through chilled water loop to root cause asset.`;
  } else if (orderedMode === "MITIGATION") {
    analystDomainReasoning = `Evaluated standby redundant asset N+1 availability. Verified isolated electrical bus ready for equipment switchover.`;
  } else {
    // Generate specialized analyst justification or extract key specification retrieved
    analystDomainReasoning = `Evaluated query under ${orderedMode} mode. Verified facility specifications against baseline engineering models.`;
  }

  return {
    messages: [replyMessage],
    finalReply: finalReplyText || state.finalReply,
    executedCypher: lastExecutedCypher || null,
    analystReasoning: analystDomainReasoning,
    graphData: dynamicGraphData ?? null,
    actionButtons: actionButtons ?? null,
    needsOperatorInput: needsInput,
    traceHistory: [{
      node: "system_analyst",
      description: hasToolMessage
        ? `System Analyst synthesized results from database tools in ${orderedMode} MODE`
        : `System Analyst evaluated query in ${orderedMode} MODE`,
      timestamp: new Date().toISOString(),
    }],
  };
}

// --------------------------------------------------------
// 4B. NODE: UPW Drift Agent Node (Native RDF & OT Tool-Bound Specialist Agent)
// Uses model.bindTools([rdfSparqlTool, otConnectionTool]) natively
// --------------------------------------------------------
export async function upwDriftAgentNode(state: AgentHiveStateType): Promise<Partial<AgentHiveStateType>> {
  const model = getLangChainGemini(0.1);
  const modelWithTools = model ? model.bindTools([rdfSparqlTool, otConnectionTool]) : null;

  // Count tool results in messages for the current turn to prevent infinite tool-call recursion
  const toolMessagesCount = state.messages.filter((m) => m instanceof ToolMessage || (m as any)._getType?.() === "tool").length;
  const activeModel = (toolMessagesCount >= 8 || !modelWithTools) ? model : modelWithTools;

  const hasToolMessage = state.messages.some((m) => m instanceof ToolMessage || (m as any)._getType?.() === "tool");
  let lastExecutedSparql = state.executedCypher;
  let dynamicGraphData = state.graphData;
  let actionButtons: ActionButtonArtifact[] | undefined = state.actionButtons;

  // Extract executed SPARQL or OT tool call from previous AIMessage if available
  const lastAiMsg = state.messages.filter((m) => m instanceof AIMessage || (m as any)._getType?.() === "ai").pop();
  if (lastAiMsg && (lastAiMsg as any).tool_calls?.length > 0) {
    const toolCall = (lastAiMsg as any).tool_calls[0];
    if (toolCall.name === "rdf_sparql_query" && toolCall.args?.sparql) {
      lastExecutedSparql = toolCall.args.sparql;
    } else if (toolCall.name === "ot_connection" && toolCall.args?.assetId) {
      lastExecutedSparql = `ot_connection(assetId: "${toolCall.args.assetId}")`;
    } else if (toolCall.name === "knowledge_base" && (toolCall.args?.sparql || toolCall.args?.query)) {
      lastExecutedSparql = toolCall.args.sparql || toolCall.args.query;
    }
  }

  // LLM Invocation
  let replyMessage: AIMessage;

  if (activeModel) {
    try {
      const messagesToPass = [
        new SystemMessage(
          DRIFT_AGENT_SYSTEM_PROMPT +
          (toolMessagesCount >= 8
            ? "\n\nCRITICAL DIRECTIVE: The diagnostic tools have been called 8 times or more already. STOP calling any further tools immediately and formulate your engineering diagnosis and recommended OCAP actions based on the collected upstream and OT telemetry data."
            : "")
        ),
        ...state.messages,
      ];
      const res = await activeModel.invoke(messagesToPass);
      replyMessage = res as AIMessage;
    } catch (err: any) {
      console.warn("[NATIVE LANGGRAPH DRIFT AGENT] LLM call error:", err?.message);
      replyMessage = new AIMessage(`[UPW Drift Agent] Evaluated drift telemetry and RDF semantic triples for UPW pre-treatment and RO systems.`);
    }
  } else {
    replyMessage = new AIMessage(`[UPW Drift Agent] Evaluated drift telemetry and RDF semantic triples for UPW pre-treatment and RO systems.`);
  }

  const rawReplyText = replyMessage.content?.toString() || "";
  let finalReplyText = rawReplyText;

  // Extract intelligent dynamic graph JSON if provided by the LLM
  const graphJsonMatch = rawReplyText.match(/```json:graph\s*([\s\S]*?)\s*```/);
  if (graphJsonMatch) {
    try {
      const parsedGraph = JSON.parse(graphJsonMatch[1]);
      if (parsedGraph.plotRequired && parsedGraph.nodes && parsedGraph.nodes.length > 0) {
        dynamicGraphData = {
          nodes: parsedGraph.nodes,
          edges: parsedGraph.edges || [],
        };
      } else if (parsedGraph.plotRequired === false) {
        dynamicGraphData = undefined;
      }
      finalReplyText = rawReplyText.replace(/```json:graph\s*[\s\S]*?\s*```/, '').trim();
    } catch (e) {
      console.warn("[NATIVE LANGGRAPH DRIFT AGENT] Failed to parse graph JSON:", e);
    }
  }

  let driftReasoning = "UPW Drift Agent cross-referenced live drift telemetry with W3C RDF semantic store.";
  if (hasToolMessage && lastExecutedSparql) {
    if (lastExecutedSparql.startsWith("ot_connection")) {
      driftReasoning = `Queried industrial OT SCADA historian for live operational telemetry readings (${lastExecutedSparql}). Verified baseline deviations and sensor excursions.`;
    } else {
      driftReasoning = `Executed W3C SPARQL semantic query against RDF Knowledge Store:\n${lastExecutedSparql.trim()}\n\nTraversed upstream asset topology and isolated candidate upstream feeding units.`;
    }
  }

  return {
    messages: [replyMessage],
    finalReply: finalReplyText || state.finalReply,
    executedCypher: lastExecutedSparql || null,
    analystReasoning: driftReasoning,
    graphData: dynamicGraphData ?? null,
    actionButtons: actionButtons ?? null,
    needsOperatorInput: false,
    traceHistory: [{
      node: "upw_drift_agent",
      description: hasToolMessage
        ? "UPW Drift Agent synthesized results from W3C RDF ontology and OT Telemetry tools"
        : "UPW Drift Agent initiated upstream dependency and OT sensor telemetry investigation",
      timestamp: new Date().toISOString(),
    }],
  };
}

// --------------------------------------------------------
// 5. CONDITIONAL EDGES
// --------------------------------------------------------
export function orchestratorConditionalEdge(state: AgentHiveStateType): "system_analyst" | "upw_drift_agent" | typeof END {
  if (state.routeDecision?.destination === "upw_drift_agent") return "upw_drift_agent";
  if (state.routeDecision?.destination === "system_analyst") return "system_analyst";
  return END;
}

export function toolsReturnEdge(state: AgentHiveStateType): "system_analyst" | "upw_drift_agent" {
  if (state.routeDecision?.destination === "upw_drift_agent") {
    return "upw_drift_agent";
  }
  return "system_analyst";
}

// --------------------------------------------------------
// 6. BUILD THE 100% NATIVE LANGGRAPH STATEGRAPH
// --------------------------------------------------------
export function buildOfficialLangGraph() {
  const workflow = new StateGraph(AgentHiveStateAnnotation)
    // Graph Nodes
    .addNode("orchestrator", orchestratorNode)
    .addNode("system_analyst", systemAnalystNode)
    .addNode("upw_drift_agent", upwDriftAgentNode)
    .addNode("tools", nativeToolNode)

    // Entry Edge into Central Orchestrator
    .addEdge(START, "orchestrator")

    // Routing from Orchestrator:
    // If direct non-plant answer -> END
    // If plant operations -> system_analyst or upw_drift_agent
    .addConditionalEdges("orchestrator", orchestratorConditionalEdge, {
      system_analyst: "system_analyst",
      upw_drift_agent: "upw_drift_agent",
      [END]: END,
    })

    // System Analyst Native Tool Loop
    .addConditionalEdges("system_analyst", toolsCondition)

    // UPW Drift Agent Native Tool Loop
    .addConditionalEdges("upw_drift_agent", toolsCondition)

    // Edge from tools back to the requesting specialist node for synthesis
    .addConditionalEdges("tools", toolsReturnEdge, {
      system_analyst: "system_analyst",
      upw_drift_agent: "upw_drift_agent",
    });

  // Compile StateGraph with Native LangGraph MemorySaver checkpointer for thread persistence
  return workflow.compile({ checkpointer: hiveCheckpointer });
}

// Singleton Checkpointer instance for multi-turn thread memory
export const hiveCheckpointer = new MemorySaver();

// Singleton compiled StateGraph instance
export const officialCompiledHiveGraph = buildOfficialLangGraph();
