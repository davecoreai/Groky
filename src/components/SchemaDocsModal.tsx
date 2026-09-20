import React, { useState } from "react";

interface SchemaDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaDocsModal: React.FC<SchemaDocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"sql" | "fastapi" | "architecture" | "setup">("setup");
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const SETUP_INSTRUCTIONS = `# Groky AI - Setup Instructions from Scratch

### 1. Prerequisites
- Node.js 20+ & npm / pnpm
- (Optional for Python backend) Python 3.10+ with FastAPI & Uvicorn
- (Optional for persistent DB) PostgreSQL 15+ or Supabase account with pgvector

### 2. Environment Variables (.env)
Create a \`.env\` file in the root directory:
\`\`\`bash
# OpenRouter API Key
OPENROUTER_API_KEY="sk-or-v1-..."

# (Optional) PostgreSQL / Supabase connection
DATABASE_URL="postgresql://user:password@localhost:5432/groky_db"
\`\`\`

### 3. Installation & Run (Node.js + Express + React + Vite)
\`\`\`bash
# Install dependencies
npm install

# Run full-stack dev server (starts Express on port 3000 with Vite middleware)
npm run dev

# Compile production bundle
npm run build

# Start production server
npm start
\`\`\`

### 4. Groky High-Performance Models
- Groky 5.2 Astra (z-ai/glm-5.2:free)
- Groky 4 Super [Beta] (google/gemma-4-31b-it:free)
- Groky 3.7 Flow [Beta] (google/gemma-4-26b-a4b-it:free)
- Groky 2.5 Flash (inclusionai/ling-3.0-flash-fin:free)
- Groky 3.5 Flash (nvidia/nemotron-3-ultra-550b-a55b:free)`;

  const ARCHITECTURE_TEXT = `# Modular Architecture Overview

### Abstraction Layers:
1. **Groky AI Gateway**:
   - Groky 5.2 Astra (\`z-ai/glm-5.2:free\`)
   - Groky 4 Super [Beta] (\`google/gemma-4-31b-it:free\`)
   - Groky 3.7 Flow [Beta] (\`google/gemma-4-26b-a4b-it:free\`)
   - Groky 2.5 Flash (\`inclusionai/ling-3.0-flash-fin:free\`)
   - Groky 3.5 Flash (\`nvidia/nemotron-3-ultra-550b-a55b:free\`)

2. **Real-Time Streaming Engine**:
   - Server-Sent Events (SSE) via \`/api/chat/stream\`
   - Token streaming with progressive chunk buffering and client-side reactive rendering

3. **Client Sandbox & Media Handling**:
   - Integrated media viewer with full-screen mode for image, video, and audio
   - Inlined preview capsules within chat prompt area

4. **Security & Guardrails**:
   - Strict server-side OpenRouter routing (API key protected from client)
   - Sliding-window IP rate limiter (60 requests/min) with Retry-After headers
   - Request size validation and input sanitization`;

  const SQL_SNIPPET = `-- Core PostgreSQL / Supabase Schema with pgvector
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    model VARCHAR(100) NOT NULL DEFAULT 'z-ai/glm-5.2:free',
    is_pinned BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    has_artifacts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Device & IP Address Logging Table for Visitor Tracking
CREATE TABLE device_logs (
    id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding vector(768)
);`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-3xl max-h-[85vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600/20 text-amber-500">
              <i className="fa-solid fa-book-open text-sm"></i>
            </div>
            <div>
              <h2 className="font-semibold text-stone-100 text-sm">System Architecture &amp; Database Schema</h2>
              <p className="text-xs text-stone-400">Complete setup guide, schema DDL, and API documentation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-800 hover:text-stone-200 cursor-pointer">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-6 gap-2 text-xs">
          <button
            onClick={() => setActiveTab("setup")}
            className={`py-3 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === "setup" ? "border-amber-500 text-amber-400" : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            Setup from Scratch
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`py-3 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === "architecture" ? "border-amber-500 text-amber-400" : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            Clean Architecture
          </button>
          <button
            onClick={() => setActiveTab("sql")}
            className={`py-3 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === "sql" ? "border-amber-500 text-amber-400" : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            PostgreSQL / Supabase Schema
          </button>
          <button
            onClick={() => setActiveTab("fastapi")}
            className={`py-3 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === "fastapi" ? "border-amber-500 text-amber-400" : "border-transparent text-stone-400 hover:text-stone-200"
            }`}
          >
            FastAPI Alternative
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed text-stone-300 bg-stone-950/30">
          {activeTab === "setup" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => copyToClipboard(SETUP_INSTRUCTIONS, "setup")}
                  className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  {copied === "setup" ? <i className="fa-solid fa-check text-emerald-400"></i> : <i className="fa-regular fa-copy"></i>}
                  <span>{copied === "setup" ? "Copied" : "Copy Instructions"}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap">{SETUP_INSTRUCTIONS}</pre>
            </div>
          )}

          {activeTab === "architecture" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => copyToClipboard(ARCHITECTURE_TEXT, "arch")}
                  className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  {copied === "arch" ? <i className="fa-solid fa-check text-emerald-400"></i> : <i className="fa-regular fa-copy"></i>}
                  <span>{copied === "arch" ? "Copied" : "Copy Architecture"}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap">{ARCHITECTURE_TEXT}</pre>
            </div>
          )}

          {activeTab === "sql" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => copyToClipboard(SQL_SNIPPET, "sql")}
                  className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  {copied === "sql" ? <i className="fa-solid fa-check text-emerald-400"></i> : <i className="fa-regular fa-copy"></i>}
                  <span>{copied === "sql" ? "Copied" : "Copy SQL Schema"}</span>
                </button>
              </div>
              <pre className="whitespace-pre-wrap">{SQL_SNIPPET}</pre>
            </div>
          )}

          {activeTab === "fastapi" && (
            <div className="space-y-2">
              <p className="text-stone-400 mb-2">
                A production-grade Python FastAPI backend module is included at <code className="text-amber-400">/docs/fastapi_backend_alternative.py</code>.
              </p>
              <pre className="text-[11px] text-stone-300 bg-stone-950 p-4 rounded-xl border border-stone-800 overflow-x-auto">{`from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI(title="Groky AI")

@app.post("/api/chat/stream")
async def chat_stream(request: StreamChatRequest):
    # Streams SSE tokens using Groky free models via OpenRouter
    return StreamingResponse(generate_stream(request), media_type="text/event-stream")`}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-stone-800 bg-stone-950/70">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
