export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  updatedAt: number;
}

export type Role = "user" | "assistant" | "system";

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  dataUrl?: string;
  extension?: string;
  lineCount?: number;
  tokenCount?: number;
}

export interface Artifact {
  id: string;
  title: string;
  language: string;
  code: string;
  type: "html" | "react" | "svg" | "code" | "markdown";
  createdAt: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  model?: string;
  files?: AttachedFile[];
  artifacts?: Artifact[];
  isStreaming?: boolean;
  error?: string;
  reasoningTimeMs?: number;
  // Multi-Agent Orchestrator metadata
  agentPlan?: MultiAgentOrchestrationPlan;
  activeAgentId?: string;
  delegations?: AgentDelegationStep[];
  selectedAgent?: string;
}

// MCP (Model Context Protocol) & Agent Gateway Types
export type AgentPermission =
  | "read_context"
  | "execute_code"
  | "network_search"
  | "filesystem_access"
  | "delegate_task";

export interface MCPToolParameter {
  type: string;
  description: string;
  enum?: string[];
  default?: any;
}

export interface MCPToolDefinition {
  name: string;
  displayName: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, MCPToolParameter>;
    required?: string[];
  };
  permissionRequired: AgentPermission;
  agentId: string;
}

export interface MCPAgent {
  id: string;
  name: string;
  role: string;
  category: "orchestrator" | "coding" | "reasoning" | "data" | "security";
  avatar: string;
  icon: string;
  badge: string;
  status: "online" | "busy" | "idle" | "standby";
  endpoint: string;
  description: string;
  capabilities: string[];
  tools: MCPToolDefinition[];
  grantedPermissions: AgentPermission[];
  version: string;
  latencyMs?: number;
  totalExecutions: number;
}

export interface AgentDelegationStep {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  subtask: string;
  status: "queued" | "running" | "calling_tool" | "completed" | "error";
  toolCalled?: {
    toolName: string;
    params?: any;
    result?: any;
    status: "executing" | "success" | "denied" | "failed";
  };
  interAgentMessage?: {
    fromAgentId: string;
    toAgentId: string;
    message: string;
  };
  outputSnippet?: string;
  error?: string;
  durationMs?: number;
}

export interface MultiAgentOrchestrationPlan {
  primaryAgentId: string;
  autoOrchestrate: boolean;
  intentDetected?: "code_engineering" | "deep_research" | "data_analysis" | "general_orchestration";
  confidenceScore?: number;
  steps: AgentDelegationStep[];
  activeAgentId?: string;
  interAgentDialogues: Array<{
    from: string;
    to: string;
    content: string;
    timestamp: number;
  }>;
}

export interface SharedAgentContext {
  id: string;
  sessionId: string;
  lastUpdated: number;
  environment: {
    platform: string;
    timezone: string;
    language: string;
  };
  globalVariables: Record<string, any>;
  interAgentMemory: Array<{
    sourceAgent: string;
    key: string;
    value: string;
    timestamp: number;
  }>;
  recentToolCalls: Array<{
    toolName: string;
    agentId: string;
    timestamp: number;
    status: string;
  }>;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isArchived?: boolean;
  messages: Message[];
  modelId: string;
  systemPrompt?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  badge: string;
  description: string;
  maxTokens: number;
  isLocked?: boolean;
  isCustom?: boolean;
  supportsVision?: boolean;
  supportsCodeArtifacts?: boolean;
}

export interface UserSettings {
  preferredModel: string;
  theme: "light" | "dark" | "system";
  temperature: number;
  systemPrompt: string;
  enable3DBackground: boolean;
  autoOpenArtifacts: boolean;
  codeFontSize: number;
  groqApiKey?: string;
  geminiApiKey?: string;
  openRouterApiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  customEndpoint?: string;
  customApiKey?: string;
  toneStyle?: "Default" | "Ramah" | "Profesional";
  customInstructions?: string;
  selectedFont?: string;
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export interface UserAuth {
  isLoggedIn: boolean;
  name?: string;
  email?: string;
  avatarUrl?: string;
  provider?: "google" | "email";
}
