import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  DEFAULT_MODELS,
} from "./lib/storage";
import {
  getSupabaseClient,
  fetchConversationsFromSupabase,
  saveConversationToSupabase,
  deleteConversationFromSupabase,
} from "./lib/supabase";
import { Conversation, Message, AttachedFile, UserSettings, Artifact } from "./types";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { ArtifactViewer } from "./components/ArtifactViewer";
import { ThreeCanvas } from "./components/ThreeCanvas";
import { SchemaDocsModal } from "./components/SchemaDocsModal";
import { DocumentPreviewModal } from "./components/DocumentPreviewModal";

// Helper to extract clean conversation topic title from user prompt
function extractTopicTitle(prompt: string, files?: AttachedFile[]): string {
  if (!prompt.trim() && files && files.length > 0) {
    const ext = files[0].extension ? `.${files[0].extension}` : "";
    const baseName = files[0].name.replace(/\.[^/.]+$/, "");
    return `${baseName.slice(0, 24)}${ext}`;
  }

  let text = prompt.trim();
  // Remove filler conversational prefixes in Indonesian and English
  text = text.replace(/^(tolong|buatkan|buat|bikin|tuliskan|jelaskan|apa itu|bagaimana cara|help me|can you|please|write|create|explain|how to|what is|tell me about)\s+/i, "");
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

  // Take up to 36 characters cleanly
  if (text.length > 36) {
    const truncated = text.slice(0, 36);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > 18 ? `${truncated.slice(0, lastSpace)}...` : `${truncated}...`;
  }

  return text || "Groky Chat";
}

export default function App() {
  // Requirement 2: Saat refresh halaman AUTO MASUK KE NEW CHAT
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = loadConversations();
    const freshId = `conv-${Date.now()}`;
    const freshChat: Conversation = {
      id: freshId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      modelId: "z-ai/glm-5.2:free",
      messages: [],
    };
    return [freshChat, ...saved.filter((c) => c.messages.length > 0)];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    return conversations[0]?.id || `conv-${Date.now()}`;
  });

  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isArtifactPanelOpen, setIsArtifactPanelOpen] = useState(false);
  const [isSchemaDocsOpen, setIsSchemaDocsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textBufferQueueRef = useRef<string[]>([]);
  const currentAccumulatedTextRef = useRef<string>("");

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

  // Responsive mobile detector
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
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

  // New Chat (Previous streaming keeps running in the background)
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPinned: false,
      modelId: settings.preferredModel || "z-ai/glm-5.2:free",
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
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, modelId } : c))
    );
    handleSaveSettings({ ...settings, preferredModel: modelId });
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    // Flush remaining buffer immediately
    if (textBufferQueueRef.current.length > 0) {
      currentAccumulatedTextRef.current += textBufferQueueRef.current.join("");
      textBufferQueueRef.current = [];
    }
    setIsStreaming(false);
  };

  // Smooth Character Streaming Engine with High-Speed Adaptive Flow for Code Generation
  const startTypewriterLoop = (targetConvId: string, assistantMessageId: string) => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
    }

    // High frequency 10ms tick for ultra-smooth 60-100fps fluid flow
    typewriterTimerRef.current = setInterval(() => {
      const queue = textBufferQueueRef.current;
      if (queue.length === 0) return;

      const currentText = currentAccumulatedTextRef.current;
      // Detect if currently writing inside a code block (odd count of ``` backticks)
      const tripleBacktickMatches = currentText.match(/```/g);
      const isInsideCode = Boolean(tripleBacktickMatches && tripleBacktickMatches.length % 2 === 1);

      let chunkSize: number;
      if (isInsideCode) {
        // High-velocity, ultra-smooth character flow tailored specifically for code blocks
        chunkSize = Math.max(4, Math.min(18, Math.ceil(queue.length / 5)));
      } else {
        // Smooth, elegant cadence for normal conversational text
        chunkSize = Math.max(1, Math.min(6, Math.ceil(queue.length / 12)));
      }

      const charsToAppend = queue.splice(0, chunkSize).join("");
      currentAccumulatedTextRef.current += charsToAppend;

      const fullText = currentAccumulatedTextRef.current;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: fullText } : m
                ),
              }
            : c
        )
      );
    }, 10);
  };

  // Send Message with OpenRouter & Supabase Integration
  const handleSendMessage = async (userPrompt: string, files: AttachedFile[] = []) => {
    if ((!userPrompt.trim() && files.length === 0) || isStreaming) return;

    const targetConvId = activeConversation.id;
    const targetModelId = activeConversation.modelId || "z-ai/glm-5.2:free";
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
    textBufferQueueRef.current = [];
    startTypewriterLoop(targetConvId, assistantMessageId);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const payloadMessages = updatedMessages
        .slice(0, -1)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: payloadMessages,
          model: targetModelId,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          files,
          customConfig: {
            openRouterApiKey: settings.openRouterApiKey,
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                // Push characters into smooth typewriter queue
                const chars = Array.from(data.text as string);
                textBufferQueueRef.current.push(...chars);
              }
            } catch (err) {
              // chunk boundary
            }
          }
        }
      }

      // Wait briefly for typewriter buffer to finish unspooling smoothly
      await new Promise<void>((resolve) => {
        const checkDone = setInterval(() => {
          if (textBufferQueueRef.current.length === 0) {
            clearInterval(checkDone);
            resolve();
          }
        }, 30);
      });

      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
      }

      const finalContent = currentAccumulatedTextRef.current;

      // Finalize assistant message and sync to Supabase
      setConversations((prev) => {
        const nextConvs = prev.map((c) => {
          if (c.id === targetConvId) {
            const updatedConv: Conversation = {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId ? { ...m, content: finalContent, isStreaming: false } : m
              ),
            };
            saveConversationToSupabase(updatedConv, settings).catch(() => {});
            return updatedConv;
          }
          return c;
        });
        return nextConvs;
      });

      // REQUIREMENT 7: DO NOT auto enter preview mode!
      // (Preview is strictly manual when user clicks "Preview" button on HTML code)
    } catch (err: any) {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
        typewriterTimerRef.current = null;
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

  return (
    <div
      id="groky-app-root"
      className="flex h-screen w-screen overflow-hidden bg-[#FAF8F5] dark:bg-stone-950 font-sans-clean transition-colors duration-200 relative"
    >
      {/* 3D Ambient Visual Canvas */}
      <ThreeCanvas isDark={isDark} enabled={settings.enable3DBackground} />

      {/* Responsive Sidebar (Smooth transitions, no close button) */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => {
          setActiveId(id);
          if (isMobile) setSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onTogglePinConversation={handleTogglePinConversation}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
      />

      {/* Central Chat Arena (Minimalist Claude design) */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <ChatArea
          messages={activeConversation?.messages || []}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          onEditMessage={handleEditMessage}
          models={DEFAULT_MODELS}
          selectedModelId={activeConversation?.modelId || "z-ai/glm-5.2:free"}
          onSelectModel={handleSelectModel}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenArtifact={handleOpenArtifact}
          onPreviewDocument={(file) => setPreviewFile(file)}
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
