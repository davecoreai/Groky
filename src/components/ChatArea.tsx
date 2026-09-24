import React, { useState, useRef, useEffect } from "react";
import katex from "katex";
import { Message, AttachedFile, ModelOption } from "../types";
import { CodeBlock } from "./CodeBlock";
import { ModelSelector } from "./ModelSelector";

const SOUNDWAVE_BARS = [
  6, 12, 18, 24, 16, 22, 28, 20, 26, 14, 20, 26, 30, 24, 18, 26,
  22, 16, 24, 28, 20, 14, 18, 12, 8, 6, 6, 8, 6, 4, 4, 6
];

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  onSendMessage: (content: string, files: AttachedFile[]) => void;
  onStopStreaming: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  models: ModelOption[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onToggleSidebar: () => void;
  onOpenArtifact: (code: string, language: string, title?: string) => void;
  onPreviewDocument: (file: AttachedFile) => void;
  onOpenLanding?: () => void;
  onOpenDeviceMemory?: () => void;
}

// KaTeX LaTeX formula renderer
function renderKaTeX(formula: string, displayMode: boolean): string {
  try {
    return katex.renderToString(formula.trim(), {
      displayMode,
      throwOnError: false,
      output: "htmlAndMathml",
    });
  } catch (err) {
    return `<span class="font-mono text-xs text-amber-700 dark:text-amber-400">${formula}</span>`;
  }
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onEditMessage,
  models,
  selectedModelId,
  onSelectModel,
  onToggleSidebar,
  onOpenArtifact,
  onPreviewDocument,
  onOpenLanding,
  onOpenDeviceMemory,
}) => {
  const [inputText, setInputText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<AttachedFile | null>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  // Web Speech API Voice-to-Text state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const initialPrefixRef = useRef("");
  const finalTranscriptRef = useRef("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const prevMessageCountRef = useRef(messages.length);
  const scrollRafRef = useRef<number | null>(null);

  // Web Speech API browser compatibility check
  const isSpeechSupported =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startRecognition = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError("Browser tidak mendukung Web Speech API.");
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Sistem otomatis menentukan bahasa berdasarkan sistem perangkat / browser
      // Mendukung semua bahasa termasuk Basa Jawa (jv-ID), Indonesia (id-ID), dsb.
      let systemLang = "id-ID";
      if (typeof navigator !== "undefined") {
        systemLang = navigator.language || (navigator as any).userLanguage || "id-ID";
        if (navigator.languages && navigator.languages.length > 0) {
          const regionalMatch = navigator.languages.find(
            (l) => l.startsWith("jv") || l.startsWith("id") || l.startsWith("su")
          );
          if (regionalMatch) systemLang = regionalMatch;
        }
      }
      try {
        const saved = localStorage.getItem("groky_voice_lang");
        if (saved) systemLang = saved;
      } catch {}
      recognition.lang = systemLang;

      initialPrefixRef.current = inputText;
      finalTranscriptRef.current = "";
      setInterimText("");

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = "";
        let interimTrans = "";

        // Recompute across all result chunks from index 0 to prevent repeating transcript bug on mobile
        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalTrans += text + " ";
          } else {
            interimTrans += text;
          }
        }

        const trimmedFinal = finalTrans.trim();
        const trimmedInterim = interimTrans.trim();

        finalTranscriptRef.current = trimmedFinal;
        setInterimText(trimmedInterim);

        // Merge cleanly without duplicate words or extra spaces
        const speechCombined = [trimmedFinal, trimmedInterim].filter(Boolean).join(" ");
        const base = initialPrefixRef.current.trim();
        const combined = base ? (speechCombined ? `${base} ${speechCombined}` : base) : speechCombined;
        setInputText(combined);
      };

      recognition.onerror = (event: any) => {
        console.warn("[Web Speech API] Error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setSpeechError("Akses mikrofon ditolak oleh setelan browser.");
        } else if (event.error !== "no-speech") {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
        setInterimText("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error("[Web Speech API] Failed to initialize:", err);
      setSpeechError("Gagal memulai mikrofon.");
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText("");
    if (textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleCancelListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    setIsListening(false);
    setInterimText("");
    finalTranscriptRef.current = "";
    setInputText(initialPrefixRef.current);
  };

  const handleSendVoice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText("");
    const toSend = inputText.trim();
    if (toSend || attachedFiles.length > 0) {
      onSendMessage(toSend, attachedFiles);
      setInputText("");
      setAttachedFiles([]);
      initialPrefixRef.current = "";
      finalTranscriptRef.current = "";
    }
  };

  // Toggle Voice-to-Text Transcription via Web Speech API
  const toggleListening = async () => {
    if (isListening) {
      handleStopListening();
      return;
    }

    setSpeechError(null);

    // Try requesting audio stream via getUserMedia to prompt native browser permission dialog if not yet granted
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.warn("[Mic Permission] getUserMedia prompt error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setSpeechError("Akses mikrofon ditolak oleh browser.");
          return;
        }
      }
    }

    startRecognition();
  };

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Auto-dismiss speech error notification after 3.5 seconds
  useEffect(() => {
    if (speechError) {
      const timer = setTimeout(() => setSpeechError(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [speechError]);

  // Monitor user scrolling to avoid jerking screen if user is reading previous code
  const handleContainerScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    // Only pause auto-scroll if user scrolled far up (> 180px)
    isUserScrolledUpRef.current = distanceToBottom > 180;
  };

  // Silky Smooth Pin-to-Bottom Auto-Scroll that never gets stuck or disabled prematurely
  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (isNewMessage) {
      isUserScrolledUpRef.current = false;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (isStreaming && scrollContainerRef.current) {
      if (!isUserScrolledUpRef.current) {
        if (scrollRafRef.current) {
          cancelAnimationFrame(scrollRafRef.current);
        }
        scrollRafRef.current = requestAnimationFrame(() => {
          if (scrollContainerRef.current && !isUserScrolledUpRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      }
    }

    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [messages, isStreaming]);

  // Click outside listener for attachment dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setIsAttachMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dynamic textarea height with spacious minimum height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      const minH = 54;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, minH), 220)}px`;
    }
  }, [inputText]);

  // Close full screen on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreenMedia(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getClaudeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileClick = (file: AttachedFile) => {
    const isImg = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(file.extension || "");
    const isVid = file.type.startsWith("video/") || ["mp4", "webm", "ogg", "mov"].includes(file.extension || "");
    const isAud = file.type.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac"].includes(file.extension || "");

    if (isImg || isVid || isAud) {
      setFullscreenMedia(file);
    } else {
      onPreviewDocument(file);
    }
  };

  const handleSend = () => {
    if ((!inputText.trim() && attachedFiles.length === 0) || isStreaming) return;
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    }
    onSendMessage(inputText.trim(), attachedFiles);
    setInputText("");
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFiles = async (files: File[]) => {
    const newAttachments: AttachedFile[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImg = file.type.startsWith("image/");
      const isVid = file.type.startsWith("video/");
      const isAud = file.type.startsWith("audio/");

      if (isImg || isVid || isAud) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          extension: ext,
        });
      } else {
        const textContent = await file.text();
        const lines = textContent.split("\n").length;
        const estimatedTokens = Math.ceil(textContent.length / 4);

        newAttachments.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || "text/plain",
          content: textContent,
          extension: ext,
          lineCount: lines,
          tokenCount: estimatedTokens,
        });
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const submitEdit = (id: string) => {
    if (editContent.trim()) {
      onEditMessage(id, editContent.trim());
    }
    setEditingMessageId(null);
  };

  // Inline markdown & LaTeX math formatter
  const formatInlineMarkdown = (text: string): React.ReactNode => {
    // Splits by math $...$, code `...`, bold **...**, and italic *...*
    const tokenRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+\$|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = text.split(tokenRegex);

    return parts.map((seg, i) => {
      if (!seg) return null;
      if (seg.startsWith("$$") && seg.endsWith("$$")) {
        const math = seg.slice(2, -2);
        return (
          <span
            key={i}
            className="my-1.5 inline-block w-full text-center overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderKaTeX(math, true) }}
          />
        );
      }
      if (seg.startsWith("$") && seg.endsWith("$") && seg.length > 2) {
        const math = seg.slice(1, -1);
        return (
          <span
            key={i}
            className="inline-block px-1 align-baseline"
            dangerouslySetInnerHTML={{ __html: renderKaTeX(math, false) }}
          />
        );
      }
      if (seg.startsWith("`") && seg.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 text-amber-700 dark:text-amber-400 font-mono text-[11px]"
          >
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-stone-900 dark:text-stone-100">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      if (seg.startsWith("*") && seg.endsWith("*")) {
        return (
          <em key={i} className="italic text-stone-800 dark:text-stone-200">
            {seg.slice(1, -1)}
          </em>
        );
      }
      return seg;
    });
  };

  // Helper to render markdown parts with LaTeX, tables, headers, and code blocks
  const renderMessageContent = (content: string, messageId: string) => {
    // Regex matches closed code blocks and unclosed/streaming code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_\-.:/]+)?(?:\s+([^\n]+))?\n([\s\S]*?)(?:```|$)/g;

    const parts: { type: "code" | "text"; lang?: string; title?: string; code?: string; text?: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      let precedingText = "";
      if (match.index > lastIndex) {
        precedingText = content.slice(lastIndex, match.index);
        parts.push({
          type: "text",
          text: precedingText,
        });
      }

      const lang = match[1] || "text";
      let title = match[2];
      const code = match[3];

      // If no explicit title, try detecting filename from the preceding text (e.g. 3. script.js, **style.css**, etc.)
      if (!title && precedingText) {
        const fileMatch = precedingText.match(
          /(?:^|\s|\*|`|#|\d+\.\s*)([a-zA-Z0-9_\-]+\.(?:js|html|css|ts|tsx|jsx|py|json|sql|sh|php|java|cpp|c|go|rs|rb|md|svg))(?:\s|`|\*|:|$)/i
        );
        if (fileMatch && fileMatch[1]) {
          title = fileMatch[1];
        }
      }

      parts.push({
        type: "code",
        lang,
        title,
        code,
      });

      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) break;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        text: content.slice(lastIndex),
      });
    }

    return parts.map((part, index) => {
      if (part.type === "code") {
        return (
          <CodeBlock
            key={`code-${messageId}-${index}`}
            language={part.lang || "text"}
            code={part.code || ""}
            title={part.title}
            onOpenArtifact={onOpenArtifact}
          />
        );
      }

      const textContent = part.text || "";
      // Parse lines and group markdown tables
      const lines = textContent.split("\n");
      const renderedElements: React.ReactNode[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // Filter out / remove raw horizontal rule divider (---, ***, ___) as requested
        if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
          i++;
          continue;
        }

        // Check if table starts here
        const isTableLine = (l: string) => l.trim().startsWith("|") && l.trim().endsWith("|");
        const isDivider = (l: string) => /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(l.trim());

        if (isTableLine(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
          // Collect table rows
          const tableLines: string[] = [];
          while (i < lines.length && isTableLine(lines[i])) {
            tableLines.push(lines[i].trim());
            i++;
          }

          if (tableLines.length >= 2) {
            const parseRow = (rowLine: string) =>
              rowLine
                .replace(/^\|/, "")
                .replace(/\|$/, "")
                .split("|")
                .map((cell) => cell.trim());

            const headerCells = parseRow(tableLines[0]);
            const dataRows = tableLines.slice(2).map(parseRow);

            renderedElements.push(
              <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <table className="min-w-full divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                  <thead className="bg-stone-100/80 dark:bg-stone-800/60 font-semibold text-stone-900 dark:text-stone-100">
                    <tr>
                      {headerCells.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 text-left font-medium">
                          {formatInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60 bg-white/40 dark:bg-stone-900/40">
                    {dataRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-stone-700 dark:text-stone-300">
                            {formatInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }
        }

        // Standalone Math Block $$...$$
        if (line.trim().startsWith("$$") && line.trim().endsWith("$$") && line.trim().length > 2) {
          const math = line.trim().slice(2, -2);
          renderedElements.push(
            <div
              key={`mathblock-${i}`}
              className="my-3 overflow-x-auto py-2 text-center"
              dangerouslySetInnerHTML={{ __html: renderKaTeX(math, true) }}
            />
          );
          i++;
          continue;
        }

        // Heading lines: #####, ####, ###, ##, #
        if (/^#####\s+/.test(line)) {
          renderedElements.push(
            <h6 key={`h6-${i}`} className="text-xs font-semibold text-stone-900 dark:text-stone-100 pt-2 pb-0.5">
              {formatInlineMarkdown(line.replace(/^#####\s+/, ""))}
            </h6>
          );
          i++;
          continue;
        }
        if (/^####\s+/.test(line)) {
          renderedElements.push(
            <h5 key={`h5-${i}`} className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 pt-2 pb-0.5">
              {formatInlineMarkdown(line.replace(/^####\s+/, ""))}
            </h5>
          );
          i++;
          continue;
        }
        if (/^###\s+/.test(line)) {
          renderedElements.push(
            <h4 key={`h4-${i}`} className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 pt-2.5 pb-1">
              {formatInlineMarkdown(line.replace(/^###\s+/, ""))}
            </h4>
          );
          i++;
          continue;
        }
        if (/^##\s+/.test(line)) {
          renderedElements.push(
            <h3 key={`h3-${i}`} className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 pt-3 pb-1 border-b border-stone-200/50 dark:border-stone-800/50">
              {formatInlineMarkdown(line.replace(/^##\s+/, ""))}
            </h3>
          );
          i++;
          continue;
        }
        if (/^#\s+/.test(line)) {
          renderedElements.push(
            <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 pt-3 pb-1">
              {formatInlineMarkdown(line.replace(/^#\s+/, ""))}
            </h2>
          );
          i++;
          continue;
        }

        // Blockquotes
        if (line.startsWith("> ")) {
          renderedElements.push(
            <blockquote key={`quote-${i}`} className="pl-3 border-l-2 border-amber-500 text-stone-600 dark:text-stone-400 italic text-xs my-1">
              {formatInlineMarkdown(line.replace("> ", ""))}
            </blockquote>
          );
          i++;
          continue;
        }

        // Bullet Lists
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          renderedElements.push(
            <li key={`li-${i}`} className="ml-4 list-disc text-stone-800 dark:text-stone-200 text-xs my-0.5">
              {formatInlineMarkdown(line.trim().substring(2))}
            </li>
          );
          i++;
          continue;
        }

        // Numbered list
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          renderedElements.push(
            <div key={`num-${i}`} className="flex items-start gap-2 ml-1 text-xs my-0.5">
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{numMatch[1]}.</span>
              <span>{formatInlineMarkdown(numMatch[2])}</span>
            </div>
          );
          i++;
          continue;
        }

        if (!line.trim()) {
          renderedElements.push(<div key={`empty-${i}`} className="h-1.5" />);
          i++;
          continue;
        }

        renderedElements.push(
          <p key={`p-${i}`} className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
            {formatInlineMarkdown(line)}
          </p>
        );
        i++;
      }

      return (
        <div key={`text-${messageId}-${index}`} className="space-y-1 leading-relaxed">
          {renderedElements}
        </div>
      );
    });
  };

  // Inspiring starter prompt suggestions
  const STARTER_PROMPTS = [
    {
      icon: "fa-solid fa-code",
      title: "Write & Refactor Code",
      subtitle: "Build modern web apps, algorithms, and fix bugs",
      prompt: "Create a modern interactive responsive component with TypeScript and Tailwind CSS",
    },
    {
      icon: "fa-solid fa-pen-nib",
      title: "Draft & Brainstorm",
      subtitle: "Write essays, technical specs, and creative outlines",
      prompt: "Help me brainstorm architecture and design principles for an intelligent web application",
    },
    {
      icon: "fa-solid fa-bolt",
      title: "Analyze & Explain",
      subtitle: "Deep dive into algorithms, math, and architecture",
      prompt: "Explain how modern large language models handle attention mechanisms with intuitive analogies",
    },
    {
      icon: "fa-solid fa-laptop-code",
      title: "Interactive Canvas Artifact",
      subtitle: "Generate live runnable HTML5 canvas simulations",
      prompt: "Generate a standalone interactive HTML5 canvas particle simulation with mouse attraction",
    },
  ];

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Header Bar (Clean Minimal Header) */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 min-h-[50px] sm:min-h-[56px] bg-transparent z-10 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          {/* Smooth Sidebar Toggle with transparent background */}
          <button
            id="sidebar-toggle-btn"
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl bg-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer"
            title="Toggle Sidebar"
          >
            <i className="fa-solid fa-bars text-sm"></i>
          </button>
        </div>
      </header>

      {/* Drag & drop overlay indicator */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-amber-500/10 backdrop-blur-xs border-2 border-dashed border-amber-500 rounded-2xl m-4 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <i className="fa-solid fa-paperclip text-3xl text-amber-500 animate-bounce mb-2"></i>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Drop files here to analyze</p>
          <p className="text-xs text-stone-500">Supports code, markdown, JSON, audio, video, and images</p>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6 overscroll-contain"
      >
        {messages.length === 0 ? (
          /* Clean Minimal Empty Workspace matching mobile view */
          <div className="flex-1 flex flex-col items-center justify-center min-h-[40vh] text-center p-4">
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-3xl mx-auto w-full`}
              >
                {isUser ? (
                  /* User Message Bubble */
                  <div className="group relative max-w-[85%] space-y-2">
                    {/* User attachments if present */}
                    {msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {msg.files.map((file) => {
                          const isImg = file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(file.extension || "");
                          const isVid = file.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(file.extension || "");
                          const isAud = file.type.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(file.extension || "");
                          const isMedia = isImg || isVid || isAud;

                          return (
                            <button
                              key={file.id}
                              onClick={() => handleFileClick(file)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-200/70 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                              title={isMedia ? "Click to view full screen" : "View document"}
                            >
                              {isImg ? (
                                <i className="fa-solid fa-image text-amber-600 text-xs"></i>
                              ) : isVid ? (
                                <i className="fa-solid fa-video text-amber-600 text-xs"></i>
                              ) : isAud ? (
                                <i className="fa-solid fa-headphones text-purple-600 text-xs"></i>
                              ) : (
                                <i className="fa-solid fa-file-lines text-stone-500 text-xs"></i>
                              )}
                              <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="rounded-2xl px-4 py-2.5 bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm leading-relaxed">
                      {editingMessageId === msg.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-white dark:bg-stone-900 p-2 rounded-lg text-xs border border-amber-500 focus:outline-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-2 py-1 text-xs rounded text-stone-500 hover:text-stone-700 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => submitEdit(msg.id)}
                              className="px-2.5 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-500 font-medium cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </div>

                    {/* User action bar */}
                    <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-stone-400">
                      <button
                        onClick={() => startEdit(msg)}
                        className="hover:text-stone-600 dark:hover:text-stone-300 flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-pen text-[10px]"></i>
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Assistant Message (Claude Minimalist: NO Avatar, NO AI Name) */
                  <div className="w-full space-y-2">
                    {/* Error Banner if generation failed */}
                    {msg.error && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
                          <i className="fa-solid fa-triangle-exclamation text-xs shrink-0"></i>
                          <span>Generation Error</span>
                        </div>
                        <p className="text-rose-600 dark:text-rose-400 leading-normal pl-5">
                          {msg.error}
                        </p>
                      </div>
                    )}

                    {/* Assistant Message Body */}
                    {msg.content && (
                      <div className="text-stone-800 dark:text-stone-200 leading-relaxed">
                        {renderMessageContent(msg.content, msg.id)}
                      </div>
                    )}

                    {/* Thinking / Streaming Indicator */}
                    {msg.isStreaming && !msg.content && (
                      <div className="flex items-center gap-2 text-xs text-stone-400 animate-pulse py-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Thinking...</span>
                      </div>
                    )}

                    {/* Assistant message action bar (Copy only, NO Regenerate button) */}
                    {!msg.isStreaming && msg.content && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-400">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <i className="fa-solid fa-check text-xs text-emerald-500"></i>
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-regular fa-copy text-xs"></i>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Capsule (Claude-inspired minimal) */}
      <div
        id="chat-input-wrapper"
        className="px-3 sm:px-6 pb-2.5 sm:pb-4 pt-1 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-stone-950 dark:via-stone-950/90 shrink-0 z-20"
      >
        <div className="max-w-3xl mx-auto">
          {/* Capsule Container */}
          <div className="relative rounded-2xl border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-md focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all p-3 sm:p-3.5">
            {/* Merged File Preview row inside the placeholder capsule */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 pb-2.5 border-b border-stone-100 dark:border-stone-800">
                {attachedFiles.map((f) => {
                  const isImg = f.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(f.extension || "");
                  const isVid = f.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(f.extension || "");
                  const isAud = f.type.startsWith("audio/") || ["mp3", "wav", "ogg"].includes(f.extension || "");
                  const isMedia = isImg || isVid || isAud;

                  return (
                    <div
                      key={f.id}
                      onClick={() => handleFileClick(f)}
                      className="group relative flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs shadow-2xs hover:border-amber-500/60 transition-all cursor-pointer"
                    >
                      {isImg && f.dataUrl ? (
                        <img src={f.dataUrl} alt={f.name} className="w-7 h-7 rounded-md object-cover" />
                      ) : isVid ? (
                        <div className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-500 flex items-center justify-center">
                          <i className="fa-solid fa-video text-xs"></i>
                        </div>
                      ) : isAud ? (
                        <div className="w-7 h-7 rounded-md bg-purple-500/20 text-purple-500 flex items-center justify-center">
                          <i className="fa-solid fa-headphones text-xs"></i>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-500 flex items-center justify-center">
                          <i className="fa-solid fa-file-lines text-xs"></i>
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 pr-1">
                        <span className="truncate max-w-[130px] font-medium text-[11px]">{f.name}</span>
                        <span className="text-[9px] text-stone-400">
                          {isMedia ? "Click to view full screen" : formatFileSize(f.size)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachedFiles((prev) => prev.filter((item) => item.id !== f.id));
                        }}
                        className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 cursor-pointer"
                        title="Remove file"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Subtle Speech error notification (Clean, no giant guides or action buttons) */}
            {speechError && (
              <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-exclamation text-amber-600 text-xs"></i>
                  <span>{speechError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSpeechError(null)}
                  className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            )}

            {/* Conditional Rendering: If recording voice, render the animated soundwave visualizer capsule */}
            {isListening ? (
              <div className="flex items-center justify-between gap-2 sm:gap-3 py-1 min-h-[48px]">
                {/* Close / Cancel Button */}
                <button
                  type="button"
                  onClick={handleCancelListening}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
                  title="Batalkan suara"
                  aria-label="Batalkan"
                >
                  <i className="fa-solid fa-xmark text-sm sm:text-base"></i>
                </button>

                {/* Center Soundwave Equalizer with running animation */}
                <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2 select-none">
                  {/* Realtime voice transcription preview text */}
                  {(finalTranscriptRef.current || interimText) ? (
                    <div className="text-xs text-stone-800 dark:text-stone-200 font-sans-clean max-w-full truncate px-1 pb-1 animate-in fade-in duration-100">
                      <span>{finalTranscriptRef.current}</span>
                      {interimText && <span className="text-stone-400 dark:text-stone-500 italic ml-1">{interimText}</span>}
                    </div>
                  ) : null}

                  {/* Soundwave Bars Waveform Animation */}
                  <div className="flex items-center justify-center gap-[2.5px] sm:gap-[3.5px] h-8 w-full max-w-xs sm:max-w-sm overflow-hidden">
                    {SOUNDWAVE_BARS.map((baseH, idx) => (
                      <span
                        key={idx}
                        className="w-[2.5px] sm:w-[3px] rounded-full bg-stone-700 dark:bg-stone-300 animate-soundwave shrink-0"
                        style={{
                          height: `${baseH}px`,
                          animationDelay: `${(idx % 16) * 0.07}s`,
                          animationDuration: `${0.85 + (idx % 6) * 0.12}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Action Buttons: Stop (⏹️) and Send (⬆️) */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleStopListening}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer shadow-2xs"
                    title="Selesai bicara"
                    aria-label="Selesai bicara"
                  >
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-stone-700 dark:bg-stone-200"></span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendVoice}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:opacity-90 transition-all cursor-pointer shadow-sm"
                    title="Kirim pesan"
                    aria-label="Kirim"
                  >
                    <i className="fa-solid fa-arrow-up text-xs sm:text-sm"></i>
                  </button>
                </div>
              </div>
            ) : (
              /* Idle / Typing Mode: Textarea + Bottom Action Bar */
              <>
                <textarea
                  id="chat-textarea-input"
                  ref={textareaRef}
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setTimeout(() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 200);
                  }}
                  placeholder="Ask Groky AI"
                  className="w-full bg-transparent text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 placeholder-stone-400 focus:outline-none resize-none font-sans-clean min-h-[56px] sm:min-h-[64px] max-h-48 leading-relaxed py-1"
                />

                {/* Bottom Actions inside Capsule */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      className="hidden"
                    />

                    {/* Attachment Menu Popup with + Button */}
                    <div className="relative inline-block" ref={attachMenuRef}>
                      <button
                        id="attach-plus-btn"
                        type="button"
                        onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                        className="flex items-center justify-center w-7 h-7 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 transition-all cursor-pointer shadow-2xs"
                        title="Add attachments"
                      >
                        <i
                          className={`fa-solid fa-plus text-xs transition-transform duration-200 ${
                            isAttachMenuOpen ? "rotate-45" : ""
                          }`}
                        ></i>
                      </button>

                      {isAttachMenuOpen && (
                        <div className="absolute left-0 bottom-full mb-2.5 w-60 sm:w-68 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                          <div className="space-y-1">
                            <button
                              id="attach-file-option-btn"
                              type="button"
                              onClick={() => {
                                setIsAttachMenuOpen(false);
                                fileInputRef.current?.click();
                              }}
                              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/80 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 group-hover:bg-amber-500/15 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors shrink-0">
                                <i className="fa-solid fa-paperclip text-sm"></i>
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                                  File
                                </div>
                                <div className="text-[11px] text-stone-400 truncate">
                                  Upload documents, images, video & code
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-stone-400 dark:text-stone-500 bg-stone-50/50 dark:bg-stone-900/40 select-none">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-stone-100/70 dark:bg-stone-800/50 text-stone-400 dark:text-stone-500 shrink-0">
                                  <i className="fa-solid fa-puzzle-piece text-sm"></i>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                                    Plugin
                                  </div>
                                  <div className="text-[11px] text-stone-400/80 dark:text-stone-500/80 truncate">
                                    Custom tools & extensions
                                  </div>
                                </div>
                              </div>
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400 whitespace-nowrap shrink-0">
                                Coming soon
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Model Selector placed right beside Attachment button */}
                    <ModelSelector
                      models={models}
                      selectedModelId={selectedModelId}
                      onSelectModel={onSelectModel}
                      onOpenPricing={onOpenLanding}
                    />
                  </div>

                  {/* Actions on right: Mic Voice-to-Text Button + Circular Send Button */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Voice-to-Text Microphone Button using Web Speech API */}
                    <button
                      id="voice-mic-input-btn"
                      type="button"
                      onClick={toggleListening}
                      className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100 shadow-2xs transition-all cursor-pointer"
                      title={
                        !isSpeechSupported
                          ? "Voice input is not supported in this browser"
                          : "Mulai bicara (Input Suara)"
                      }
                      aria-label="Mulai bicara"
                    >
                      <i className="fa-solid fa-microphone text-xs sm:text-sm"></i>
                    </button>

                    {/* Circular Send / Stop Button */}
                    {isStreaming ? (
                      <button
                        id="stop-streaming-btn"
                        type="button"
                        onClick={onStopStreaming}
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm hover:opacity-90 transition-all cursor-pointer"
                        title="Stop generation"
                      >
                        <i className="fa-solid fa-square text-xs"></i>
                      </button>
                    ) : (
                      <button
                        id="send-message-btn"
                        type="button"
                        disabled={!inputText.trim() && attachedFiles.length === 0}
                        onClick={handleSend}
                        className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all cursor-pointer ${
                          inputText.trim() || attachedFiles.length > 0
                            ? "bg-amber-600 hover:bg-amber-500 text-white shadow-sm"
                            : "bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed"
                        }`}
                        title="Send message"
                      >
                        <i className="fa-solid fa-arrow-up text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Disclaimer Text below Textarea */}
          <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium text-center mt-2">
            Groky can make mistakes. Please verify important information.
          </p>
        </div>
      </div>

      {/* Full Screen Media Lightbox Modal (For Image, Video, Audio) */}
      {fullscreenMedia && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setFullscreenMedia(null)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
                {fullscreenMedia.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(fullscreenMedia.extension || "") ? (
                  <i className="fa-solid fa-image text-sm"></i>
                ) : fullscreenMedia.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(fullscreenMedia.extension || "") ? (
                  <i className="fa-solid fa-video text-sm"></i>
                ) : (
                  <i className="fa-solid fa-headphones text-sm"></i>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-100 truncate max-w-md">{fullscreenMedia.name}</h3>
                <span className="text-[11px] text-stone-400">{formatFileSize(fullscreenMedia.size)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {fullscreenMedia.dataUrl && (
                <a
                  href={fullscreenMedia.dataUrl}
                  download={fullscreenMedia.name}
                  className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                  title="Download file"
                >
                  <i className="fa-solid fa-download text-sm"></i>
                </a>
              )}
              <button
                onClick={() => setFullscreenMedia(null)}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors cursor-pointer"
                title="Close full screen (Esc)"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
          </div>

          {/* Media Container */}
          <div
            className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenMedia.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(fullscreenMedia.extension || "") ? (
              <img
                src={fullscreenMedia.dataUrl}
                alt={fullscreenMedia.name}
                className="max-h-[85vh] max-w-[92vw] object-contain rounded-xl shadow-2xl transition-transform"
              />
            ) : fullscreenMedia.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(fullscreenMedia.extension || "") ? (
              <video
                src={fullscreenMedia.dataUrl}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[92vw] rounded-xl shadow-2xl bg-black"
              />
            ) : fullscreenMedia.type.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac"].includes(fullscreenMedia.extension || "") ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center shadow-inner animate-pulse">
                  <i className="fa-solid fa-music text-4xl"></i>
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-white">{fullscreenMedia.name}</h4>
                  <p className="text-xs text-stone-400">Audio Playback</p>
                </div>
                <audio
                  src={fullscreenMedia.dataUrl}
                  controls
                  autoPlay
                  className="w-72 sm:w-96 rounded-lg"
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
