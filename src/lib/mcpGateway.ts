import { MCPAgent, MCPToolDefinition, AgentPermission, SharedAgentContext } from "../types";

export const DEFAULT_MCP_AGENTS: MCPAgent[] = [
  {
    id: "groky-orchestrator",
    name: "Groky Orchestrator",
    role: "Master AI Orchestrator & Task Planner",
    category: "orchestrator",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=groky-master&backgroundColor=f59e0b",
    icon: "fa-solid fa-sitemap",
    badge: "Core Master",
    status: "online",
    endpoint: "mcp://gateway.groky.internal/orchestrator",
    description: "Evaluates incoming requests, decomposes complex prompts, automatically selects specialized agents, verifies permissions, and synthesizes inter-agent outputs.",
    capabilities: [
      "Task Decomposition & Subtask Planning",
      "Dynamic Agent Discovery & Routing",
      "Context Synchronization",
      "Result Synthesis & Safety Verification",
    ],
    grantedPermissions: ["read_context", "execute_code", "network_search", "delegate_task"],
    version: "v3.0.0",
    latencyMs: 14,
    totalExecutions: 4820,
    tools: [
      {
        name: "orchestrator_route_intent",
        displayName: "Route Intent",
        description: "Classifies intent into code, research, math, or creative writing and assigns the optimal agent.",
        parameters: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "The original user prompt" },
            targetDomain: {
              type: "string",
              description: "Estimated target domain",
              enum: ["coding", "research", "data", "general"],
            },
          },
          required: ["prompt"],
        },
        permissionRequired: "delegate_task",
        agentId: "groky-orchestrator",
      },
      {
        name: "orchestrator_synthesize_results",
        displayName: "Synthesize Results",
        description: "Aggregates multi-agent step outputs into a single coherent, refined response.",
        parameters: {
          type: "object",
          properties: {
            stepResults: { type: "string", description: "JSON stringified intermediate outputs" },
          },
          required: ["stepResults"],
        },
        permissionRequired: "read_context",
        agentId: "groky-orchestrator",
      },
    ],
  },
  {
    id: "opencode-agent",
    name: "OpenCode Agent",
    role: "Full-Stack Software Engineering & AST Specialist",
    category: "coding",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=opencode-core&backgroundColor=3b82f6",
    icon: "fa-solid fa-code",
    badge: "External MCP",
    status: "online",
    endpoint: "mcp://opencode.agent.gateway:8080/v1",
    description: "External specialized coding agent built on OpenCode MCP standard. Generates production-ready code, refactors architectural patterns, inspects AST, and drafts test suites.",
    capabilities: [
      "Multi-File Architecture & Refactoring",
      "Clean UI & Interactive Component Synthesis",
      "Syntax Verification & Bug Remediation",
      "Unit Test & Integration Suite Generation",
    ],
    grantedPermissions: ["read_context", "execute_code", "filesystem_access"],
    version: "v2.8.4",
    latencyMs: 38,
    totalExecutions: 2914,
    tools: [
      {
        name: "opencode_generate_code",
        displayName: "Generate Code",
        description: "Generates high-craft, fully runnable code with specified language, framework, and styles.",
        parameters: {
          type: "object",
          properties: {
            language: { type: "string", description: "Target programming language or framework" },
            specification: { type: "string", description: "Functional requirements and constraints" },
            includeTests: { type: "string", description: "Boolean flag to bundle unit tests" },
          },
          required: ["language", "specification"],
        },
        permissionRequired: "execute_code",
        agentId: "opencode-agent",
      },
      {
        name: "opencode_analyze_ast",
        displayName: "Analyze AST & Security",
        description: "Performs static syntax tree analysis, audits security anti-patterns, and calculates complexity.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "Source code to analyze" },
            language: { type: "string", description: "Language syntax parser" },
          },
          required: ["code"],
        },
        permissionRequired: "read_context",
        agentId: "opencode-agent",
      },
      {
        name: "opencode_refactor",
        displayName: "Refactor Logic",
        description: "Optimizes algorithmic time complexity, modularity, and readable structure.",
        parameters: {
          type: "object",
          properties: {
            sourceCode: { type: "string", description: "Target code block" },
            optimizationGoal: { type: "string", description: "E.g. performance, readability, typing" },
          },
          required: ["sourceCode"],
        },
        permissionRequired: "execute_code",
        agentId: "opencode-agent",
      },
    ],
  },
  {
    id: "hermes-agent",
    name: "Hermes Agent",
    role: "Autonomous Multi-Step Reasoning & Deep Research",
    category: "reasoning",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=hermes-ai&backgroundColor=10b981",
    icon: "fa-solid fa-brain",
    badge: "External MCP",
    status: "online",
    endpoint: "mcp://hermes.agent.cloud/rpc",
    description: "External autonomous research agent based on Hermes function calling. Excels in complex multi-step reasoning, hypothesis formulation, fact verification, and knowledge search.",
    capabilities: [
      "Multi-Hop Knowledge Graph Search",
      "Hypothesis Formulation & Critical Evaluation",
      "Logical Consistency Auditing",
      "Fact-checking & Source Grounding",
    ],
    grantedPermissions: ["read_context", "network_search"],
    version: "v4.1.2",
    latencyMs: 44,
    totalExecutions: 1980,
    tools: [
      {
        name: "hermes_deep_reason",
        displayName: "Deep Reason",
        description: "Performs tree-of-thought breakdown of complex scientific, business, or mathematical problems.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The underlying problem" },
            depth: { type: "string", description: "Reasoning depth: normal, high, maximum" },
          },
          required: ["query"],
        },
        permissionRequired: "read_context",
        agentId: "hermes-agent",
      },
      {
        name: "hermes_knowledge_search",
        displayName: "Knowledge Search",
        description: "Queries curated academic knowledge bases and verified documentation.",
        parameters: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Search query or domain concept" },
            maxResults: { type: "string", description: "Number of citations to retrieve" },
          },
          required: ["topic"],
        },
        permissionRequired: "network_search",
        agentId: "hermes-agent",
      },
    ],
  },
  {
    id: "dataweaver-agent",
    name: "DataWeaver Agent",
    role: "Quantitative Analytics, Tables & Statistical Modeling",
    category: "data",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=data-weaver&backgroundColor=8b5cf6",
    icon: "fa-solid fa-chart-line",
    badge: "MCP Tool",
    status: "online",
    endpoint: "mcp://gateway.groky.internal/dataweaver",
    description: "Specialized in tabular datasets, CSV/JSON parsing, statistical regressions, and charting configurations.",
    capabilities: [
      "Tabular Data Structuring",
      "Statistical Formula Evaluation",
      "Data Normalization & Cleaning",
    ],
    grantedPermissions: ["read_context", "execute_code"],
    version: "v1.9.0",
    latencyMs: 22,
    totalExecutions: 1240,
    tools: [
      {
        name: "dataweaver_calc_stats",
        displayName: "Calculate Statistics",
        description: "Calculates statistical distributions, means, medians, variance, or trend forecasts.",
        parameters: {
          type: "object",
          properties: {
            dataPoints: { type: "string", description: "Comma-separated numbers or JSON array" },
            operation: { type: "string", description: "statistical operation desired" },
          },
          required: ["dataPoints"],
        },
        permissionRequired: "execute_code",
        agentId: "dataweaver-agent",
      },
    ],
  },
  {
    id: "sentinel-agent",
    name: "Sentinel Guardian",
    role: "Security Auditing, Permissions & Prompt Guardrails",
    category: "security",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=sentinel-shield&backgroundColor=ef4444",
    icon: "fa-solid fa-shield-halved",
    badge: "Core Security",
    status: "online",
    endpoint: "mcp://gateway.groky.internal/sentinel",
    description: "Guarantees system safety, verifies tool execution policies, prevents prompt injection, and monitors agent token budgets.",
    capabilities: [
      "Tool Permission Enforcement",
      "Prompt Injection Shielding",
      "Credential Masking (Zero-Leak Policy)",
      "Agent Activity Audit Logging",
    ],
    grantedPermissions: ["read_context", "delegate_task"],
    version: "v2.1.0",
    latencyMs: 8,
    totalExecutions: 6150,
    tools: [
      {
        name: "sentinel_audit_safety",
        displayName: "Audit Safety & Guardrails",
        description: "Checks prompt and tool execution payloads for potential exploits or permission violations.",
        parameters: {
          type: "object",
          properties: {
            targetTool: { type: "string", description: "Tool name to invoke" },
            payloadSummary: { type: "string", description: "Payload excerpt" },
          },
          required: ["targetTool"],
        },
        permissionRequired: "read_context",
        agentId: "sentinel-agent",
      },
    ],
  },
];

// LocalStorage helpers for persistent context and agent permissions
const STORAGE_MCP_PERMISSIONS = "groky_mcp_agent_permissions";
const STORAGE_MCP_SHARED_CONTEXT = "groky_mcp_shared_context";

export function loadSavedAgentPermissions(): Record<string, AgentPermission[]> {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_MCP_PERMISSIONS);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  // Default grants
  const defaults: Record<string, AgentPermission[]> = {};
  DEFAULT_MCP_AGENTS.forEach((a) => {
    defaults[a.id] = a.grantedPermissions;
  });
  return defaults;
}

export function saveAgentPermissions(agentId: string, permissions: AgentPermission[]): void {
  try {
    if (typeof window !== "undefined") {
      const current = loadSavedAgentPermissions();
      current[agentId] = permissions;
      localStorage.setItem(STORAGE_MCP_PERMISSIONS, JSON.stringify(current));
    }
  } catch {}
}

export function loadPersistentSharedContext(): SharedAgentContext {
  const defaultCtx: SharedAgentContext = {
    id: "ctx-main",
    sessionId: `session-${Date.now()}`,
    lastUpdated: Date.now(),
    environment: {
      platform: "Groky Orchestrator Cloud",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      language: "id-ID / en-US",
    },
    globalVariables: {
      activeAgentOrchestrator: "groky-orchestrator",
      mcpProtocolVersion: "2024-11-05",
      sandboxSafeMode: true,
    },
    interAgentMemory: [
      {
        sourceAgent: "sentinel-agent",
        key: "zero_leak_policy",
        value: "All server-side credentials and API keys are strictly protected and isolated.",
        timestamp: Date.now() - 3600000,
      },
      {
        sourceAgent: "opencode-agent",
        key: "preferred_styling",
        value: "Tailwind CSS v4 with clean typography and zero emojis in UI buttons/code.",
        timestamp: Date.now() - 1800000,
      },
    ],
    recentToolCalls: [],
  };

  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(STORAGE_MCP_SHARED_CONTEXT);
      if (raw) return { ...defaultCtx, ...JSON.parse(raw) };
    }
  } catch {}

  return defaultCtx;
}

export function savePersistentSharedContext(ctx: SharedAgentContext): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_MCP_SHARED_CONTEXT, JSON.stringify(ctx));
    }
  } catch {}
}

export const fetchMCPAgents = fetchDiscoveredAgents;
export const fetchSharedContext = async (): Promise<SharedAgentContext> => loadPersistentSharedContext();
export const updateSharedContext = savePersistentSharedContext;

// Fetch discovered agents from Backend MCP Gateway
export async function fetchDiscoveredAgents(): Promise<MCPAgent[]> {
  try {
    const res = await fetch("/api/mcp/agents");
    if (res.ok) {
      const data = await res.json();
      if (data.agents && Array.isArray(data.agents)) {
        const savedPerms = loadSavedAgentPermissions();
        return data.agents.map((agent: MCPAgent) => ({
          ...agent,
          grantedPermissions: savedPerms[agent.id] || agent.grantedPermissions,
        }));
      }
    }
  } catch {
    // Graceful fallback to client default catalog
  }

  const savedPerms = loadSavedAgentPermissions();
  return DEFAULT_MCP_AGENTS.map((agent) => ({
    ...agent,
    grantedPermissions: savedPerms[agent.id] || agent.grantedPermissions,
  }));
}

// Execute an MCP tool via backend gateway
export async function executeMCPToolCall(
  agentId: string,
  toolName: string,
  params: Record<string, any>
): Promise<{ success: boolean; result?: any; error?: string; executionTimeMs?: number }> {
  try {
    const res = await fetch("/api/mcp/tools/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, toolName, params }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to communicate with MCP Agent Gateway",
    };
  }
}
