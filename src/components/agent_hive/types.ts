export type LangGraphNodeType =
  | 'start'
  | 'orchestrator'
  | 'operator'
  | 'end'
  | 'process_agent'
  | 'hvac_agent'
  | 'chiller_agent'
  | 'electrical_agent'
  | 'drift_agent'
  | 'deep_agent'
  | 'system_analyst'
  | 'tool_node';

export type NodeExecutionStatus = 'idle' | 'active' | 'success' | 'waiting';

export interface LangGraphNode {
  id: string;
  type: LangGraphNodeType;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  status: NodeExecutionStatus;
  description: string;
  isCentral?: boolean;
  systemPrompt?: string;
  stateSchema: {
    inputs: string[];
    outputs: string[];
    channels: string[];
  };
}

export interface LangGraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  isActive: boolean;
  isBidirectional?: boolean;
}

export interface SubgraphNode {
  id: string;
  name: string;
  type?: string;
  status?: string;
}

export interface SubgraphEdge {
  sourceId: string;
  sourceName?: string;
  targetId: string;
  targetName?: string;
  relationship: string;
  property?: string;
}

export interface HiveChatMessage {
  id: string;
  sender: 'operator' | 'orchestrator' | 'system' | 'process_agent' | 'hvac_agent' | 'chiller_agent' | 'electrical_agent' | string;
  senderName: string;
  avatar: string;
  text: string;
  timestamp: string;
  nodeId?: string;
  status?: 'sent' | 'delivered' | 'read';
  cypherQuery?: string;
  cypherResultsSummary?: string;
  delegatedToAnalyst?: boolean;
  graphData?: {
    nodes: SubgraphNode[];
    edges: SubgraphEdge[];
  };
  actionButtons?: Array<{
    id: string;
    label: string;
    prompt: string;
    variant?: 'primary' | 'secondary' | 'amber' | 'emerald';
  }>;
}

export interface LangGraphTraceStep {
  id: string;
  nodeId: string;
  label: string;
  type?: string;
  timestamp: string;
  status: 'active' | 'completed' | 'waiting';
  detail?: string;
  mode?: string;
  decision?: string;
  reasoning?: string;
  cypher?: string;
  actionSummary?: string;
  nextTarget?: string;
}

export interface LangGraphExecutionState {
  activeNodeId: string | null;
  activeEdgeId: string | null;
  isRunning: boolean;
  stepMessage: string;
  totalTurns: number;
  nodeTrace?: LangGraphTraceStep[];
}
