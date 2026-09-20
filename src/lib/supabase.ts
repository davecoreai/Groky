import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Conversation, Message, UserSettings, UserAuth } from "../types";

let cachedClient: SupabaseClient | null = null;
let cachedUrl = "";
let cachedKey = "";

export function getSupabaseClient(settings?: Partial<UserSettings>): SupabaseClient | null {
  const url =
    settings?.supabaseUrl ||
    (typeof window !== "undefined" && window.localStorage.getItem("backend_supabase_url")) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    import.meta.env.VITE_SUPABASE_URL ||
    "";
  const key =
    settings?.supabaseAnonKey ||
    (typeof window !== "undefined" && window.localStorage.getItem("backend_supabase_anon_key")) ||
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

export async function loadSupabaseConfigFromBackend(): Promise<boolean> {
  try {
    const res = await fetch("/api/config/supabase");
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("backend_supabase_url", data.supabaseUrl);
          window.localStorage.setItem("backend_supabase_anon_key", data.supabaseAnonKey);
        }
        cachedUrl = data.supabaseUrl;
        cachedKey = data.supabaseAnonKey;
        cachedClient = createClient(cachedUrl, cachedKey, {
          auth: { persistSession: true },
        });
        return true;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch Supabase config from backend:", err);
  }
  return false;
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

export function getDeviceName(): string {
  if (typeof window === "undefined" || !navigator) return "Unknown Device";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "Android Phone/Tablet";
  if (/iPhone/i.test(ua)) return "Apple iPhone";
  if (/iPad/i.test(ua)) return "Apple iPad";
  if (/Macintosh|Mac OS/i.test(ua)) return "Mac / macOS Device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux Workstation";
  return "Desktop / Mobile Web Browser";
}

export async function logDeviceVisitorToSupabase(
  settings?: Partial<UserSettings>
): Promise<void> {
  try {
    const deviceName = getDeviceName();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

    // 1. Call backend route to record IP address and device name
    let serverIp = "127.0.0.1";
    try {
      const res = await fetch("/api/visitor-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceName, userAgent }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ip) serverIp = data.ip;
      }
    } catch {
      // Fallback IP lookup
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.ip) serverIp = ipData.ip;
        }
      } catch {}
    }

    // 2. Also save to user's client-configured Supabase database if credentials present
    const client = getSupabaseClient(settings);
    if (client) {
      const { error } = await client.from("device_logs").insert([
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          device_name: deviceName,
          ip_address: serverIp,
          user_agent: userAgent,
          created_at: Date.now(),
        },
      ]);
      if (error) {
        console.warn("Supabase device_logs insert warning:", error.message);
      }
    }
  } catch (err) {
    console.warn("Failed logging visitor device to Supabase:", err);
  }
}

export async function registerUserToSupabase(
  user: { name: string; email: string; avatarUrl?: string; provider?: string },
  password?: string,
  settings?: Partial<UserSettings>
): Promise<{ success: boolean; user?: UserAuth; error?: string; message?: string }> {
  const client = getSupabaseClient(settings);
  const avatar = user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`;

  if (client) {
    try {
      if (!password) {
        return {
          success: false,
          error: "Password wajib diisi untuk pendaftaran.",
        };
      }

      // 1. Call Supabase Auth signUp API
      const { data: authData, error: authError } = await client.auth.signUp({
        email: user.email,
        password: password,
        options: {
          data: {
            name: user.name,
            avatar_url: avatar,
          },
        },
      });

      if (authError) {
        return {
          success: false,
          error: authError.message || "Gagal mendaftar ke Supabase Auth.",
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: "Gagal membuat pengguna di Supabase Auth.",
        };
      }

      // 2. Insert into public.users database table
      try {
        await client.from("users").upsert([
          {
            id: authData.user.id,
            email: authData.user.email || user.email,
            name: user.name,
            avatar_url: avatar,
            provider: user.provider || "email",
            created_at: Date.now(),
          },
        ]);
      } catch (dbErr) {
        console.warn("Supabase public.users insert notice:", dbErr);
      }

      const isEmailConfirmNeeded = !authData.session;
      const authUserName = authData.user.user_metadata?.name || user.name;

      return {
        success: true,
        message: isEmailConfirmNeeded
          ? `Akun berhasil terdaftar di Supabase! Tautan verifikasi telah dikirim ke ${user.email}.`
          : "Pendaftaran berhasil! Anda telah masuk.",
        user: {
          isLoggedIn: !isEmailConfirmNeeded,
          name: authUserName,
          email: authData.user.email || user.email,
          avatarUrl: avatar,
          provider: (user.provider as "google" | "email") || "email",
        },
      };
    } catch (err: any) {
      console.warn("Client Supabase signup error, trying backend endpoint...", err);
    }
  }

  // Fallback to Backend Server Auth API
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: user.name, email: user.email, password }),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Gagal terhubung ke server backend untuk pendaftaran.",
    };
  }
}

export async function loginUserWithSupabase(
  email: string,
  password?: string,
  settings?: Partial<UserSettings>
): Promise<{ success: boolean; user?: UserAuth; error?: string }> {
  const client = getSupabaseClient(settings);

  if (client && password) {
    try {
      // 1. Strict Supabase Auth signInWithPassword
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        const userName = data.user.user_metadata?.name || email.split("@")[0];
        const avatar = data.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`;

        // Sync to public.users table if missing
        try {
          await client.from("users").upsert([
            {
              id: data.user.id,
              email: data.user.email || email,
              name: userName,
              avatar_url: avatar,
              provider: "email",
              created_at: Date.now(),
            },
          ]);
        } catch {}

        return {
          success: true,
          user: {
            isLoggedIn: true,
            name: userName,
            email: data.user.email || email,
            avatarUrl: avatar,
            provider: "email",
          },
        };
      } else if (error) {
        return {
          success: false,
          error: error.message || "Email atau password salah di Supabase Auth.",
        };
      }
    } catch (err: any) {
      console.warn("Client Supabase login error, trying backend endpoint...", err);
    }
  }

  // Fallback to Backend Server Auth API
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Gagal terhubung ke server backend untuk masuk.",
    };
  }
}

export async function resetPasswordWithSupabase(
  email: string,
  settings?: Partial<UserSettings>
): Promise<{ success: boolean; error?: string; message?: string }> {
  const client = getSupabaseClient(settings);

  if (client) {
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      });

      if (!error) {
        return {
          success: true,
          message: `Tautan reset password Supabase telah dikirim ke ${email}. Silakan periksa pesan masuk Anda.`,
        };
      }
    } catch (err: any) {
      console.warn("Client Supabase reset password notice:", err);
    }
  }

  // Fallback to Backend Server Auth API
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "Gagal mengirimkan reset password via server.",
    };
  }
}

export async function signInWithSupabaseGoogle(
  settings?: Partial<UserSettings>
): Promise<{ success: boolean; error?: string; user?: UserAuth }> {
  const client = getSupabaseClient(settings);

  if (!client) {
    return {
      success: false,
      error: "Koneksi Supabase belum terkonfigurasi di server backend. Silakan periksa file .env Anda.",
    };
  }

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Gagal memulai Google OAuth di Supabase.",
    };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Run this in your Supabase SQL Editor to initialize Groky AI tables:

create table if not exists public.users (
  id text primary key,
  email text unique not null,
  name text,
  avatar_url text,
  provider text default 'email',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

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

create table if not exists public.device_logs (
  id text primary key,
  device_name text not null,
  ip_address text not null,
  user_agent text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

-- Enable Row Level Security (RLS) & Public access for anon API keys
alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.device_logs enable row level security;

create policy "Allow all actions for anon users" on public.users for all using (true) with check (true);
create policy "Allow all actions for anon conversations" on public.conversations for all using (true) with check (true);
create policy "Allow all actions for anon messages" on public.messages for all using (true) with check (true);
create policy "Allow all actions for anon device_logs" on public.device_logs for all using (true) with check (true);
`;
