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
  openRouterApiKey?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  customEndpoint?: string;
  customApiKey?: string;
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetSeconds: number;
}
