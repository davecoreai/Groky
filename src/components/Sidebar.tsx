import React, { useState } from "react";
import { Conversation } from "../types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onTogglePinConversation: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isMobile: boolean;
  onOpenLanding?: () => void;
  onOpenDeviceMemory?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  isOpen,
  onToggleOpen,
  isMobile,
  onOpenLanding,
  onOpenDeviceMemory,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const submitRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeId;
    const isEditing = editingId === conv.id;
    const isMenuOpen = menuOpenId === conv.id;

    return (
      <div
        key={conv.id}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-150 cursor-pointer ${
          isActive
            ? "bg-amber-500/10 text-amber-950 dark:bg-amber-500/15 dark:text-amber-200 font-medium"
            : "text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60"
        }`}
        onClick={() => {
          if (!isEditing) {
            onSelectConversation(conv.id);
            if (isMobile) onToggleOpen();
          }
        }}
      >
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRename(conv.id);
            }}
            className="w-full flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => submitRename(conv.id)}
              autoFocus
              className="w-full text-xs px-2 py-1 rounded-md border border-amber-500 bg-white dark:bg-stone-900 focus:outline-none"
            />
          </form>
        ) : (
          <div className="flex items-center gap-2.5 truncate pr-6 w-full">
            <i className="fa-regular fa-message text-[11px] text-stone-400 shrink-0"></i>
            <span className="truncate text-xs">{conv.title}</span>
          </div>
        )}

        {/* Action icons on hover */}
        {!isEditing && (
          <div
            className={`absolute right-2 flex items-center gap-1 ${
              isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            } transition-opacity`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                onClick={() => setMenuOpenId(isMenuOpen ? null : conv.id)}
                className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                title="Options"
              >
                <i className="fa-solid fa-ellipsis-vertical text-xs"></i>
              </button>

              {/* Context Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-32 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => startRename(conv)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 text-left cursor-pointer"
                  >
                    <i className="fa-solid fa-pen text-[10px]"></i>
                    <span>Rename</span>
                  </button>
                  <button
                    onClick={() => {
                      onDeleteConversation(conv.id);
                      setMenuOpenId(null);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left cursor-pointer"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FAF8F5] dark:bg-stone-900 border-r border-stone-200/80 dark:border-stone-800 select-none text-stone-800 dark:text-stone-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-stone-200/60 dark:border-stone-800/60">
        <div
          onClick={onOpenLanding}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          title="Buka Landing Page Groky AI"
        >
          <img
            src="https://i.imgur.com/0J9yC8T.jpeg"
            alt="Groky AI"
            className="h-8 w-8 rounded-xl object-cover shadow-xs border border-stone-200/60 dark:border-stone-700/60"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="font-serif-editorial text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              Groky AI
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: New Chat & Landing Page */}
      <div className="p-3 space-y-1.5">
        <button
          id="new-chat-button"
          onClick={onNewChat}
          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-stone-900 dark:bg-amber-600 text-white hover:bg-stone-800 dark:hover:bg-amber-500 shadow-sm transition-all duration-150 group text-xs font-medium cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-plus text-xs"></i>
            <span>New Chat</span>
          </span>
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-700/50 dark:bg-amber-700/60 text-stone-300 dark:text-amber-100">
            ⌘N
          </kbd>
        </button>
      </div>

      {/* Conversations List - Only show chats that have messages */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 text-xs">
        <div className="px-2.5 py-1 text-[11px] font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
          <span>Riwayat Chat</span>
        </div>
        {(() => {
          const historyConvs = conversations.filter(
            (c) => c.messages && c.messages.length > 0
          );
          if (historyConvs.length === 0) {
            return (
              <div className="px-3 py-6 text-center text-stone-400 text-xs">
                Belum ada riwayat chat
              </div>
            );
          }
          return historyConvs.map((conv) => renderConversationItem(conv));
        })()}
      </div>
    </div>
  );

  // Mobile Drawer Backdrop & Drawer with Smooth CSS Transitions
  if (isMobile) {
    return (
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out"
          onClick={onToggleOpen}
        />
        <div
          className={`relative w-72 max-w-[85vw] h-full shadow-2xl z-10 bg-[#FAF8F5] dark:bg-stone-900 transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    );
  }

  // Desktop Smooth Collapsible Sidebar
  return (
    <aside
      className={`relative h-full shrink-0 z-20 transition-all duration-300 ease-in-out select-none overflow-hidden ${
        isOpen ? "w-64 xl:w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
      }`}
    >
      <div className="w-64 xl:w-72 h-full flex flex-col">
        {sidebarContent}
      </div>
    </aside>
  );
};
