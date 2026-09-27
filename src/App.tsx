import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  DEFAULT_MODELS,
  loadDeviceMemory,
  addMemoryItem,
  removeMemoryItem,
  clearDeviceMemory,
  getFormattedDeviceMemoryContext,
  applyAppFont,
  getDeviceId,
} from "./lib/storage";
import {
  getSupabaseClient,
  fetchConversationsFromSupabase,
  saveConversationToSupabase,
  deleteConversationFromSupabase,
  logDeviceVisitorToSupabase,
} from "./lib/supabase";
import { Conversation, Message, AttachedFile, UserSettings, Artifact, MemoryItem, UserAuth } from "./types";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ArtifactViewer } from "./components/ArtifactViewer";
import { ThreeCanvas } from "./components/ThreeCanvas";
import { SchemaDocsModal } from "./components/SchemaDocsModal";
import { DocumentPreviewModal } from "./components/DocumentPreviewModal";
import { DeviceMemoryModal } from "./components/DeviceMemoryModal";
import { Settings } from "./components/Settings";

// Helper to extract clean conversation topic title from user prompt
function extractTopicTitle(prompt: string, files?: AttachedFile[]): string {
  if (!prompt.trim() && files && files.length > 0) {
    const ext = files[0].extension ? `.${files[0].extension}` : "";
    const baseName = files[0].name.replace(/\.[^/.]+$/, "");
    return `${baseName.slice(0, 24)}${ext}`;
  }

  let text = prompt.trim();
  // Remove filler conversational prefixes in Indonesian and English
  text = text.replace(
    /^(halo|hai|hey|tolong|buatkan|buat|bikin|tuliskan|jelaskan|apa itu|bagaimana cara|gimana cara|apakah|bisa|coba|help me|can you|please|write|create|explain|how to|what is|tell me about)\s+/gi,
    ""
  );
  // Replace newlines and excessive spaces
  text = text.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ");
  // Strip trailing punctuation
  text = text.replace(/[?.!,:;]+$/, "").trim();

  if (!text) {
    text = prompt.trim().replace(/[\r\n\t]+/g, " ");
  }

  // Capitalize first letter of topic
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  // Take 2 to 5 words for a clean topic phrase
  const words = text.split(" ");
  if (words.length > 4) {
    return words.slice(0, 4).join(" ");
  }

  return text || "Groky Chat";
}

export default function App() {
  const FREE_DEFAULT_MODEL = DEFAULT_MODELS.find((m) => !m.isLocked)?.id || "thinkingmachines/inkling:free";

  // Requirement: Saat baru masuk / refresh halaman, default model selector ke model gratis
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = loadConversations();
    const freshId = `conv-${Date.now()}`;
    const freshChat: Conversation = {
      id: freshId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      modelId: FREE_DEFAULT_MODEL,
      messages: [],
    };
    // Ensure any loaded empty or locked conversations fall back to free model if locked
    const sanitizedSaved = saved.map((c) => {
      const modelObj = DEFAULT_MODELS.find((m) => m.id === c.modelId);
      if (!c.modelId || modelObj?.isLocked) {
        return { ...c, modelId: FREE_DEFAULT_MODEL };
      }
      return c;
    });
    return [freshChat, ...sanitizedSaved.filter((c) => c.messages.length > 0)];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    return conversations[0]?.id || `conv-${Date.now()}`;
  });

  const [userAuth, setUserAuth] = useState<UserAuth | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const devId = getDeviceId();
        const saved = localStorage.getItem(`groky_user_auth_${devId}`) || localStorage.getItem("groky_user_auth");
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [viewMode, setViewMode] = useState<"chat" | "settings">("chat");

  // Apply UI font on mount & setting change
  useEffect(() => {
    if (settings.selectedFont) {
      applyAppFont(settings.selectedFont);
    }
  }, [settings.selectedFont]);

  // Automatically save viewMode state and visited flag to localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const devId = getDeviceId();
        localStorage.setItem(`groky_has_visited_${devId}`, "true");
        localStorage.setItem(`groky_last_view_mode_${devId}`, viewMode);
      }
    } catch {}
  }, [viewMode]);

  // Log visitor device name and IP address to Supabase database on mount
  useEffect(() => {
    logDeviceVisitorToSupabase(settings).catch((err) => {
      console.log("Device logging background notice:", err);
    });
  }, []);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [isSchemaDocsOpen, setIsSchemaDocsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [isDeviceMemoryOpen, setIsDeviceMemoryOpen] = useState(false);
  const [deviceMemories, setDeviceMemories] = useState<MemoryItem[]>(() => loadDeviceMemory());

  const abortControllerRef = useRef<AbortController | null>(null);
  const rafRenderIdRef = useRef<number | null>(null);
  const currentAccumulatedTextRef = useRef<string>("");

  // Fetch Supabase configuration from backend and sync it to settings
  useEffect(() => {
    fetch("/api/config/supabase")
      .then((res) => res.json())
      .then((data) => {
        if (data.isConfigured && data.supabaseUrl && data.supabaseAnonKey) {
          setSettings((prev) => ({
            ...prev,
            supabaseUrl: data.supabaseUrl,
            supabaseAnonKey: data.supabaseAnonKey,
          }));
        }
      })
      .catch((err) => console.warn("Error loading Supabase configuration from backend:", err));
  }, []);

  // Initialize Supabase if configured
  useEffect(() => {
    if (settings.supabaseUrl && settings.supabaseAnonKey) {
      getSupabaseClient(settings);
      fetchConversationsFromSupabase(settings)
        .then((remoteConvs) => {
          if (remoteConvs && remoteConvs.length > 0) {
            setConversations((prev) => {
              const activeConv = prev.find((c) => c.id === activeId);
              const merged = [...remoteConvs];
              if (activeConv && !merged.find((m) => m.id === activeConv.id)) {
                merged.unshift(activeConv);
              }
              return merged;
            });
          }
        })
        .catch((err) => console.log("Supabase initial sync:", err));
    }
  }, [settings.supabaseUrl, settings.supabaseAnonKey, activeId, settings]);

  // Global Supabase auth state change and session sync listener
  useEffect(() => {
    const client = getSupabaseClient(settings);
    if (!client) return;

    // Check existing active session (e.g. after Google OAuth redirect)
    client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userName = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User";
        const avatar = session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email || "")}`;
        const provider = session.user.app_metadata?.provider || "google";
        const authObj: UserAuth = {
          isLoggedIn: true,
          name: userName,
          email: session.user.email || "",
          avatarUrl: avatar,
          provider: provider as "google" | "email",
        };
        setUserAuth(authObj);
        try {
          const devId = getDeviceId();
          localStorage.setItem(`groky_user_auth_${devId}`, JSON.stringify(authObj));
        } catch {}
        setViewMode("chat");
      }
    });

    // Listen to real-time auth events
    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        const userName = session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User";
        const avatar = session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(session.user.email || "")}`;
        const provider = session.user.app_metadata?.provider || "google";
        const authObj: UserAuth = {
          isLoggedIn: true,
          name: userName,
          email: session.user.email || "",
          avatarUrl: avatar,
          provider: provider as "google" | "email",
        };
        setUserAuth(authObj);
        try {
          const devId = getDeviceId();
          localStorage.setItem(`groky_user_auth_${devId}`, JSON.stringify(authObj));
        } catch {}
        setViewMode("chat");
      } else if (event === "SIGNED_OUT") {
        setUserAuth(null);
        try {
          const devId = getDeviceId();
          localStorage.removeItem(`groky_user_auth_${devId}`);
          localStorage.removeItem("groky_user_auth");
        } catch {}
        setViewMode("chat");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [settings]);

  // Dynamic document title update based on conversation topic
  // Before chat begins / empty: "Groky AI"
  // After chat begins: "{Topik Chat} - Groky AI"
  useEffect(() => {
    const activeConv = conversations.find((c) => c.id === activeId);
    const hasUserMessage = activeConv && activeConv.messages.some((m) => m.role === "user");

    if (hasUserMessage && activeConv?.title && activeConv.title !== "Obrolan Baru") {
      document.title = `${activeConv.title} - Groky AI`;
    } else {
      document.title = "Groky AI";
    }
  }, [activeId, conversations]);

  // Responsive mobile detector & visual viewport sync for mobile keyboard
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);

      if (typeof window !== "undefined") {
        const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        setViewportHeight(currentHeight);
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewport);
      window.visualViewport.addEventListener("scroll", updateViewport);
    }

    return () => {
      window.removeEventListener("resize", updateViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateViewport);
        window.visualViewport.removeEventListener("scroll", updateViewport);
      }
    };
  }, []);

  // Theme resolution (light / dark / system)
  const isDark = useMemo(() => {
    if (settings.theme === "dark") return true;
    if (settings.theme === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, [settings.theme]);

  // Sync dark class on document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  // Active Conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) || conversations[0];
  }, [conversations, activeId]);

  // Persist conversations to LocalStorage & Supabase
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Persist settings
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleToggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    handleSaveSettings({ ...settings, theme: nextTheme });
  };

  // New Chat (Preserves the user's currently selected model from active conversation or settings)
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const preservedModel =
      activeConversation?.modelId ||
      settings.preferredModel ||
      DEFAULT_MODELS.find((m) => !m.isLocked)?.id ||
      "thinkingmachines/inkling:free";

    const newConv: Conversation = {
      id: newId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      modelId: preservedModel,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newId);
    setActiveArtifact(null);
    setIsArtifactPanelOpen(false);
    if (isMobile) setSidebarOpen(false);
  };

  // Rename Conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, title: newTitle, updatedAt: Date.now() };
          saveConversationToSupabase(updated, settings).catch(() => {});
          return updated;
        }
        return c;
      })
    );
  };

  // Delete Conversation
  const handleDeleteConversation = (id: string) => {
    deleteConversationFromSupabase(id, settings).catch(() => {});
    if (conversations.length <= 1) {
      handleNewChat();
      return;
    }
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      setActiveId(remaining[0].id);
    }
  };

  // Pin / Unpin Conversation
  const handleTogglePinConversation = (id: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, isPinned: !c.isPinned };
          saveConversationToSupabase(updated, settings).catch(() => {});
          return updated;
        }
        return c;
      })
    );
  };

  // Select Model
  const handleSelectModel = (modelId: string) => {
    const chosenModel = DEFAULT_MODELS.find((m) => m.id === modelId);
    if (chosenModel?.isLocked) {
      console.warn("Attempted to select locked model:", chosenModel.name);
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, modelId } : c))
    );
    handleSaveSettings({ ...settings, preferredModel: modelId });
  };

  // Instant Real-Time RAF Streaming Renderer
  const scheduleFastRender = (targetConvId: string, assistantMessageId: string) => {
    if (rafRenderIdRef.current) return;
    rafRenderIdRef.current = requestAnimationFrame(() => {
      rafRenderIdRef.current = null;
      const text = currentAccumulatedTextRef.current;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: text } : m
                ),
              }
            : c
        )
      );
    });
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafRenderIdRef.current) {
      cancelAnimationFrame(rafRenderIdRef.current);
      rafRenderIdRef.current = null;
    }
    setIsStreaming(false);

    // Clean up empty assistant placeholder (removes Thinking...) and set 'Gagal mengirim pesan' on the user bubble
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeId) {
          const msgs = [...c.messages];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === "assistant" && (!lastMsg.content || !lastMsg.content.trim())) {
            // Remove empty assistant thinking placeholder
            msgs.pop();
          } else if (lastMsg && lastMsg.role === "assistant") {
            // Keep partial text if any, but mark streaming as done
            msgs[msgs.length - 1] = { ...lastMsg, isStreaming: false };
          }

          // Mark the last user message with statusSubtitle: "Gagal mengirim pesan"
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === "user") {
              msgs[i] = { ...msgs[i], statusSubtitle: "Gagal mengirim pesan" };
              break;
            }
          }

          return { ...c, messages: msgs };
        }
        return c;
      })
    );
  };

  // Send Message with OpenRouter & Supabase Integration & Multi-Agent Orchestration
  const handleSendMessage = async (userPrompt: string, files: AttachedFile[] = []) => {
    if ((!userPrompt.trim() && files.length === 0) || isStreaming) return;

    const targetConvId = activeConversation.id;
    let targetModelId = activeConversation.modelId || "thinkingmachines/inkling:free";

    // Guard: Check if model is locked
    const activeModelObj = DEFAULT_MODELS.find((m) => m.id === targetModelId);
    if (activeModelObj?.isLocked) {
      const freeModel = DEFAULT_MODELS.find((m) => !m.isLocked)?.id || "thinkingmachines/inkling:free";
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: userPrompt,
        timestamp: Date.now(),
        files,
      };
      const lockedWarning: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: `🔒 **Model ${activeModelObj.name} Terkunci (${activeModelObj.badge})**\n\nModel ini sedang tidak dapat diakses. Sesi chat dialihkan ke model standar **Groky 3.0 Mini**.`,
        timestamp: Date.now() + 1,
        model: freeModel,
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                modelId: freeModel,
                messages: [...c.messages, userMessage, lockedWarning],
              }
            : c
        )
      );
      return;
    }
    const userMessageId = `msg-${Date.now()}`;
    const assistantMessageId = `msg-${Date.now() + 1}`;

    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: userPrompt,
      timestamp: Date.now(),
      files,
    };

    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now() + 1,
      isStreaming: true,
      model: targetModelId,
    };

    const updatedMessages = [...(activeConversation?.messages || []), userMessage, assistantPlaceholder];

    // Compute title for new conversation based on conversation topic
    let computedTitle = activeConversation.title;
    if (computedTitle === "New Chat") {
      computedTitle = extractTopicTitle(userPrompt, files);
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetConvId
          ? {
              ...c,
              title: computedTitle,
              updatedAt: Date.now(),
              messages: updatedMessages,
            }
          : c
      )
    );

    setIsStreaming(true);
    currentAccumulatedTextRef.current = "";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const payloadMessages = updatedMessages
        .slice(0, -1)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const memoryCtx = getFormattedDeviceMemoryContext();
      let fullSystemPrompt = settings.systemPrompt;

      if (memoryCtx) {
        fullSystemPrompt += `\n\n[Persistent Device Memory (Facts & preferences for this device)]:\n${memoryCtx}`;
      }

      if (settings.toneStyle === "Ramah") {
        fullSystemPrompt += "\n\n[Gaya & Nada Bicara AI]: Berbicaralah dengan nada yang sangat ramah, hangat, sopan, dan penuh empati serta dalam Bahasa Indonesia yang komunikatif.";
      } else if (settings.toneStyle === "Profesional") {
        fullSystemPrompt += "\n\n[Gaya & Nada Bicara AI]: Berbicaralah dengan nada formal, profesional, lugas, ringkas, terstruktur, dan menggunakan Bahasa Indonesia yang baik dan benar.";
      }

      if (settings.customInstructions && settings.customInstructions.trim()) {
        fullSystemPrompt += `\n\n[Instruksi Khusus dari Pengguna]:\n${settings.customInstructions.trim()}`;
      }

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: payloadMessages,
          model: targetModelId,
          systemPrompt: fullSystemPrompt,
          temperature: settings.temperature,
          files,
          customConfig: {
            openRouterApiKey: settings.openRouterApiKey,
            groqApiKey: settings.groqApiKey,
            geminiApiKey: settings.geminiApiKey,
            apiKey: settings.customApiKey,
            baseUrl: settings.customEndpoint,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body available for streaming");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        // Retain any incomplete partial line in the buffer
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed === "data: [DONE]") {
            break;
          }
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.modelSwitched && data.modelId) {
                // Auto switch model on rate limit: synchronize conversation model
                setConversations((prev) =>
                  prev.map((c) =>
                    c.id === targetConvId ? { ...c, modelId: data.modelId } : c
                  )
                );
              }
              if (data.text) {
                // Direct real-time RAF stream rendering: zero artificial delay
                currentAccumulatedTextRef.current += data.text;
                scheduleFastRender(targetConvId, assistantMessageId);
              }
            } catch (err) {
              // Ignore invalid JSON chunk
            }
          }
        }
      }

      // Flush any trailing line in sseBuffer
      if (sseBuffer.trim().startsWith("data: ")) {
        try {
          const data = JSON.parse(sseBuffer.trim().slice(6).trim());
          if (data.text) {
            currentAccumulatedTextRef.current += data.text;
            scheduleFastRender(targetConvId, assistantMessageId);
          }
        } catch {}
      }

      // Cancel any pending RAF and finalize immediately
      if (rafRenderIdRef.current) {
        cancelAnimationFrame(rafRenderIdRef.current);
        rafRenderIdRef.current = null;
      }

      let finalContent = currentAccumulatedTextRef.current;

      // Automatically parse AI memory tag if emitted
      const memMatch = finalContent.match(/\[MEMORY_SAVE:\s*(.*?)\s*\|\s*(.*?)\s*\]/i);
      if (memMatch) {
        const memKey = memMatch[1];
        const memVal = memMatch[2];
        if (memKey && memVal) {
          const updatedMems = addMemoryItem(memKey, memVal);
          setDeviceMemories(updatedMems);
        }
        finalContent = finalContent.replace(/\[MEMORY_SAVE:\s*(.*?)\s*\|\s*(.*?)\s*\]/gi, "").trim();
      }

      // Finalize assistant message and sync to Supabase
      setConversations((prev) => {
        const nextConvs = prev.map((c) => {
          if (c.id === targetConvId) {
            const hasText = Boolean(finalContent && finalContent.trim().length > 0);
            const updatedConv: Conversation = {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: finalContent,
                      isStreaming: false,
                      error: hasText
                        ? undefined
                        : "Tidak ada respon yang diterima dari model AI. Silakan periksa pengaturan API key atau coba model lain.",
                    }
                  : m
              ),
            };
            if (hasText) {
              saveConversationToSupabase(updatedConv, settings).catch(() => {});

              // Auto-refine title using AI topic summarizer if this was the first exchange
              if (c.messages.filter((m) => m.role === "user").length <= 1) {
                fetch("/api/chat/generate-title", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prompt: userPrompt, response: finalContent }),
                })
                  .then((res) => (res.ok ? res.json() : null))
                  .then((data) => {
                    if (data?.title) {
                      setConversations((latest) =>
                        latest.map((conv) => {
                          if (conv.id === targetConvId) {
                            const refined = { ...conv, title: data.title };
                            saveConversationToSupabase(refined, settings).catch(() => {});
                            return refined;
                          }
                          return conv;
                        })
                      );
                    }
                  })
                  .catch(() => {});
              }
            }
            return updatedConv;
          }
          return c;
        });
        return nextConvs;
      });

      // REQUIREMENT 7: DO NOT auto enter preview mode!
      // (Preview is strictly manual when user clicks "Preview" button on HTML code)
    } catch (err: any) {
      if (rafRenderIdRef.current) {
        cancelAnimationFrame(rafRenderIdRef.current);
        rafRenderIdRef.current = null;
      }

      if (err.name === "AbortError") {
        console.log("Streaming manually stopped by user");
      } else {
        console.error("Streaming error:", err);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetConvId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          error: err.message || "An error occurred during response generation.",
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Edit User Message & Resubmit
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!activeConversation || isStreaming) return;
    const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = activeConversation.messages[msgIndex];
    const pruned = activeConversation.messages.slice(0, msgIndex);

    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: pruned } : c))
    );

    handleSendMessage(newContent, targetMsg.files || []);
  };

  // Requirement 6: Preview khusus HANYA untuk HTML saja
  const handleOpenArtifact = (code: string, language: string, title?: string) => {
    const cleanLang = (language || "html").toLowerCase();
    if (!["html", "htm"].includes(cleanLang)) {
      return;
    }

    setActiveArtifact({
      id: `manual-art-${Date.now()}`,
      title: title || "Interactive HTML Preview",
      language: "html",
      code,
      type: "html",
      createdAt: Date.now(),
    });
    setIsArtifactPanelOpen(true);
  };

  // Delete all conversations handler for Kontrol Data menu
  const handleDeleteAllConversations = () => {
    const freshId = `conv-${Date.now()}`;
    const freshChat: Conversation = {
      id: freshId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      modelId: FREE_DEFAULT_MODEL,
      messages: [],
    };
    setConversations([freshChat]);
    setActiveId(freshId);
    try {
      localStorage.setItem("groky_conversations", JSON.stringify([freshChat]));
    } catch {}
  };

  // Export conversations handler
  const handleExportAllData = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(conversations, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `groky-chat-history-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export failed", e);
    }
  };

  if (viewMode === "settings") {
    return (
      <Settings
        settings={settings}
        onUpdateSettings={handleSaveSettings}
        onClose={() => setViewMode("chat")}
        onDeleteHistory={handleDeleteAllConversations}
        onClearMemory={() => {
          clearDeviceMemory();
          setDeviceMemories([]);
        }}
        onExportData={handleExportAllData}
      />
    );
  }

  return (
    <div
      id="groky-app-root"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : "100dvh",
        maxHeight: viewportHeight ? `${viewportHeight}px` : "100dvh",
      }}
      className="flex w-full overflow-hidden bg-white dark:bg-stone-950 font-sans-clean transition-colors duration-200 relative"
    >
      {/* 3D Ambient Visual Canvas */}
      <ThreeCanvas isDark={isDark} enabled={settings.enable3DBackground} />

      {/* Responsive Sidebar (Smooth transitions, no close button) */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => {
          setActiveId(id);
          setViewMode("chat");
          if (isMobile) setSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          setViewMode("chat");
        }}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onTogglePinConversation={handleTogglePinConversation}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
        onOpenLanding={() => handleNewChat()}
        onOpenDeviceMemory={() => setIsDeviceMemoryOpen(true)}
        onOpenSettings={() => setViewMode("settings")}
        userAuth={userAuth}
        onLogout={() => {
          setUserAuth(null);
          try {
            const devId = getDeviceId();
            localStorage.removeItem(`groky_user_auth_${devId}`);
            localStorage.removeItem("groky_user_auth");
          } catch {}
        }}
      />

      {/* Central Chat Arena (Minimalist Claude design with Multi-Agent support) */}
      <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative z-10">
        <ChatArea
          messages={activeConversation?.messages || []}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          onEditMessage={handleEditMessage}
          models={DEFAULT_MODELS}
          selectedModelId={activeConversation?.modelId || FREE_DEFAULT_MODEL}
          onSelectModel={handleSelectModel}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenArtifact={handleOpenArtifact}
          onPreviewDocument={(file) => setPreviewFile(file)}
          onOpenLanding={() => handleNewChat()}
          onOpenDeviceMemory={() => setIsDeviceMemoryOpen(true)}
        />
      </main>

      {/* HTML Only Artifact Sandbox Modal / Panel */}
      {isArtifactPanelOpen && activeArtifact && (
        <ArtifactViewer
          artifact={activeArtifact}
          onClose={() => setIsArtifactPanelOpen(false)}
          isMobile={isMobile}
        />
      )}

      {/* Device Memory Manager Modal */}
      <DeviceMemoryModal
        isOpen={isDeviceMemoryOpen}
        onClose={() => setIsDeviceMemoryOpen(false)}
        memories={deviceMemories}
        onAddMemory={(key, val) => {
          const updated = addMemoryItem(key, val);
          setDeviceMemories(updated);
        }}
        onRemoveMemory={(id) => {
          const updated = removeMemoryItem(id);
          setDeviceMemories(updated);
        }}
        onClearMemory={() => {
          clearDeviceMemory();
          setDeviceMemories([]);
        }}
      />

      {/* Supabase & Architecture Docs Modal */}
      <SchemaDocsModal
        isOpen={isSchemaDocsOpen}
        onClose={() => setIsSchemaDocsOpen(false)}
      />

      {/* Document Inspection Modal */}
      <DocumentPreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
