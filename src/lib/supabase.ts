import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Conversation, Message, UserSettings } from "../types";

let cachedClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedKey = "";

export function getSupabaseClient(settings?: Partial<UserSettings>): SupabaseClient | null {
  const url =
    settings?.supabaseUrl ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    import.meta.env.VITE_SUPABASE_URL ||
    "";
  const key =
    settings?.supabaseAnonKey ||
    (typeof process !== "undefined" && process.env?.SUPABASE_ANON_KEY) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) return null;

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: { persistSession: true },
    });
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.warn("Supabase initialization error:", err);
    return null;
  }
}

export async function fetchConversationsFromSupabase(
  settings?: Partial<UserSettings>
): Promise<Conversation[] | null> {
  const client = getSupabaseClient(settings);
  if (!client) return null;

  try {
    // 1. Fetch conversations
    const { data: convRows, error: convError } = await client
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (convError || !convRows) {
      console.warn("Supabase fetch conversations error:", convError);
      return null;
    }

    // 2. Fetch all messages for these conversations
    const convIds = convRows.map((c: any) => c.id);
    if (convIds.length === 0) return [];

    const { data: msgRows, error: msgError } = await client
      .from("messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("timestamp", { ascending: true });

    if (msgError) {
      console.warn("Supabase fetch messages error:", msgError);
    }

    const messagesByConv = new Map<string, Message[]>();
    (msgRows || []).forEach((m: any) => {
      const list = messagesByConv.get(m.conversation_id) || [];
      list.push({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: Number(m.timestamp) || Date.now(),
        model: m.model,
      });
      messagesByConv.set(m.conversation_id, list);
    });

    return convRows.map((r: any) => ({
      id: r.id,
      title: r.title || "Untitled Chat",
      createdAt: Number(r.created_at) || Date.now(),
      updatedAt: Number(r.updated_at) || Date.now(),
      isPinned: Boolean(r.is_pinned),
      modelId: r.model_id || "anthropic/claude-3.5-sonnet",
      messages: messagesByConv.get(r.id) || [],
    }));
  } catch (e) {
    console.warn("Failed fetching from Supabase:", e);
    return null;
  }
}

export async function saveConversationToSupabase(
  conv: Conversation,
  settings?: Partial<UserSettings>
): Promise<boolean> {
  const client = getSupabaseClient(settings);
  if (!client) return false;

  try {
    // Upsert conversation row
    const { error: convErr } = await client.from("conversations").upsert({
      id: conv.id,
      title: conv.title,
      model_id: conv.modelId,
      is_pinned: conv.isPinned,
      created_at: conv.createdAt,
      updated_at: conv.updatedAt || Date.now(),
    });

    if (convErr) {
      console.warn("Supabase upsert conversation error:", convErr);
      return false;
    }

    // Upsert all messages
    if (conv.messages && conv.messages.length > 0) {
      const formatted = conv.messages.map((m) => ({
        id: m.id,
        conversation_id: conv.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || Date.now(),
        model: m.model || conv.modelId,
      }));

      const { error: msgErr } = await client.from("messages").upsert(formatted);
      if (msgErr) {
        console.warn("Supabase upsert messages error:", msgErr);
      }
    }

    return true;
  } catch (e) {
    console.warn("Failed saving conversation to Supabase:", e);
    return false;
  }
}

export async function deleteConversationFromSupabase(
  id: string,
  settings?: Partial<UserSettings>
): Promise<boolean> {
  const client = getSupabaseClient(settings);
  if (!client) return false;

  try {
    const { error } = await client.from("conversations").delete().eq("id", id);
    return !error;
  } catch (e) {
    console.warn("Failed deleting conversation from Supabase:", e);
    return false;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Run this in your Supabase SQL Editor to initialize Groky AI tables:

create table if not exists public.conversations (
  id text primary key,
  title text not null default 'New Chat',
  model_id text not null default 'anthropic/claude-3.5-sonnet',
  is_pinned boolean not null default false,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  timestamp bigint not null default (extract(epoch from now()) * 1000)::bigint,
  model text
);

-- Enable Row Level Security (RLS) & Public access for API keys
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Allow all actions for anon" on public.conversations for all using (true) with check (true);
create policy "Allow all actions for anon" on public.messages for all using (true) with check (true);
`;
