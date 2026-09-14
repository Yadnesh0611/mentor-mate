"use client";

import React, { useState, useEffect } from 'react';
import { api, ChatMessageOut, ResourceItem, ConversationOut } from '@/lib/api';
import { MathRenderer } from '@/components/MathRenderer';
import {
  Sparkles,
  Send,
  AlertCircle,
  BookOpen,
  Loader2,
  Quote,
  ChevronDown,
  ChevronUp,
  History,
  MessageSquare,
  Plus,
  ChevronRight,
  Trash2,
  Edit2,
  Tag,
  Check,
  X
} from 'lucide-react';

interface Props {
  initialResourceId?: string;
  initialFolderId?: string;
}

export function ResourceAiChatView({ initialResourceId, initialFolderId }: Props) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>(() => {
    if (initialFolderId) return `folder:${initialFolderId}`;
    if (initialResourceId) return `res:${initialResourceId}`;
    return 'all';
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; evidence_sufficient?: boolean; citations?: any[] }>>([]);
  const [conversations, setConversations] = useState<ConversationOut[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  // Group filter state: 'all' or specific group tag
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Edit session state
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGroupTag, setEditGroupTag] = useState('');

  // Citations visibility toggle (persisted in localStorage)
  const [showCitations, setShowCitations] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mentormate_show_citations');
      return saved !== null ? saved === 'true' : false;
    }
    return false;
  });

  // Individual message collapse/expand state
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});

  const toggleShowCitations = () => {
    setShowCitations(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mentormate_show_citations', String(next));
      }
      return next;
    });
  };

  const toggleMessageCitation = (index: number) => {
    setExpandedCitations(prev => ({
      ...prev,
      [index]: prev[index] === undefined ? !showCitations : !prev[index]
    }));
  };

  // Strip raw brackets like [Source 1 | ... | Section: ...] from answer body
  const formatAssistantContent = (raw: string) => {
    return raw.replace(/\[Source\s*\d+[^\]]*\]/gi, '').trim();
  };

  useEffect(() => {
    Promise.all([
      api.listResources(),
      api.listFolders(),
      api.getResourceConversations()
    ]).then(([resList, folderList, convList]) => {
      setResources(resList);
      setFolders(folderList);
      setConversations(convList);
      if (!initialFolderId && !initialResourceId && resList.length > 0) {
        setSelectedScope('all');
      }
      if (convList.length > 0 && !activeConversationId) {
        selectConversation(convList[0].id);
      }
    }).catch(console.error);
  }, [initialFolderId, initialResourceId]);

  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setShowHistorySidebar(false);
    try {
      setLoading(true);
      const msgs = await api.getResourceMessages(convId);
      setMessages(msgs.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        evidence_sufficient: m.evidence_sufficient,
        citations: m.citations
      })));
    } catch (err) {
      console.error("Failed to load note inquiry messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = () => {
    setActiveConversationId(null);
    setMessages([]);
    setShowHistorySidebar(false);
  };

  const handleStartEdit = (conv: ConversationOut, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditTitle(conv.title);
    setEditGroupTag(conv.group_tag || '');
  };

  const handleSaveEdit = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.updateResourceConversation(convId, {
        title: editTitle.trim() || undefined,
        group_tag: editGroupTag.trim() || ''
      });
      setConversations(prev => prev.map(c => c.id === convId ? updated : c));
      setEditingConvId(null);
    } catch (err) {
      console.error("Failed to update inquiry:", err);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(null);
  };

  const handleDeleteSession = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this study session? This will remove all its saved messages.")) return;
    try {
      await api.deleteResourceConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        startNewSession();
      }
    } catch (err) {
      console.error("Failed to delete inquiry session:", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const queryText = input;
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: queryText }]);

    let resource_id: string | undefined = undefined;
    let folder_id: string | undefined = undefined;

    if (selectedScope.startsWith('res:')) {
      resource_id = selectedScope.replace('res:', '');
    } else if (selectedScope.startsWith('folder:')) {
      folder_id = selectedScope.replace('folder:', '');
    }

    try {
      const res = await api.queryResourceAI({
        message: queryText,
        resource_id,
        folder_id,
        conversation_id: activeConversationId || undefined
      });

      if (res.conversation_id && res.conversation_id !== activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.content,
        evidence_sufficient: res.evidence_sufficient,
        citations: res.citations
      }]);

      api.getResourceConversations().then(setConversations).catch(() => {});
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Notice: ${err.message || 'Unable to query the notes right now. Please try again in a moment.'}`,
          evidence_sufficient: false,
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Distinct groups for filtering
  const allGroups = Array.from(
    new Set(conversations.map(c => c.group_tag).filter(Boolean))
  ) as string[];

  const filteredConversations = conversations.filter(c => {
    if (selectedGroupFilter === 'all') return true;
    if (selectedGroupFilter === 'ungrouped') return !c.group_tag;
    return c.group_tag === selectedGroupFilter;
  });

  return (
    <div className="flex flex-col h-[75vh] rounded-2xl border border-stone-200/90 bg-white shadow-2xs overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-stone-200/80 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white border border-stone-200 text-stone-800 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-900">Ask Your Notes & Study Units</h2>
            <p className="text-[11px] text-stone-500">Authentic formula rendering with direct citations from your uploaded materials</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* History / Sessions Button */}
          <button
            type="button"
            onClick={() => setShowHistorySidebar(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs ${
              showHistorySidebar
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Past Inquiries ({conversations.length})</span>
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={startNewSession}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition-all shadow-2xs"
            title="Start a new note question session"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Question</span>
          </button>

          {/* Toggle Citations Button */}
          <button
            type="button"
            onClick={toggleShowCitations}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs ${
              showCitations
                ? 'bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100'
                : 'bg-white border-stone-200 text-stone-600 hover:text-stone-800 hover:bg-stone-50'
            }`}
            title="Toggle whether source citation cards are shown"
          >
            <Quote className="w-3.5 h-3.5 text-stone-400" />
            <span>Show Citations</span>
            <span className={`w-2 h-2 rounded-full transition-colors ${showCitations ? 'bg-amber-500' : 'bg-stone-300'}`} />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium hidden md:inline">Scope:</span>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-800 text-xs focus:outline-none focus:border-stone-400 shadow-2xs max-w-[200px] truncate"
            >
              <option value="all">All Study Materials</option>
              {folders.length > 0 && (
                <optgroup label="Study Units / Folders">
                  {folders.map(f => {
                    const count = resources.filter(r => r.folder_id === f.id).length;
                    return (
                      <option key={f.id} value={`folder:${f.id}`}>
                        📁 {f.name} ({count} items)
                      </option>
                    );
                  })}
                </optgroup>
              )}
              {resources.length > 0 && (
                <optgroup label="Individual Documents">
                  {resources.map(r => (
                    <option key={r.id} value={`res:${r.id}`}>
                      📄 {r.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* History Sidebar Overlay with Grouping and Editing */}
      {showHistorySidebar && (
        <div className="absolute top-[65px] bottom-[60px] left-0 w-88 max-w-[90vw] bg-white/95 backdrop-blur-md border-r border-stone-200 z-20 flex flex-col shadow-lg animate-in slide-in-from-left duration-150">
          <div className="p-3.5 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/80">
            <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-stone-600" />
              Saved Note Inquiries
            </span>
            <button
              onClick={startNewSession}
              className="text-[11px] font-medium text-stone-700 hover:text-stone-900 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>

          {/* Group Filter Bar */}
          <div className="p-2.5 border-b border-stone-200/60 bg-stone-50/50 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-stone-400 font-medium pl-1 text-[10px]">Group:</span>
            <button
              onClick={() => setSelectedGroupFilter('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                selectedGroupFilter === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              All ({conversations.length})
            </button>
            {allGroups.map(grp => (
              <button
                key={grp}
                onClick={() => setSelectedGroupFilter(grp)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  selectedGroupFilter === grp
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-200/60'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {grp}
              </button>
            ))}
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-stone-400 text-xs">
                No past inquiries found in this group. Ask a question about your uploaded materials to start.
              </div>
            ) : (
              filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`group relative w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                    conv.id === activeConversationId
                      ? 'bg-stone-900 text-white font-medium border-stone-900 shadow-2xs'
                      : 'border-transparent hover:bg-stone-100/80 text-stone-700'
                  }`}
                >
                  {editingConvId === conv.id ? (
                    <div className="space-y-2 p-1 bg-white text-stone-900 rounded-lg border border-stone-300 shadow-xs" onClick={e => e.stopPropagation()}>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1 text-xs border rounded border-stone-200 focus:outline-none focus:border-stone-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Group / Topic Tag</label>
                        <input
                          type="text"
                          value={editGroupTag}
                          placeholder="e.g. Unit 1, Midterms, Lab"
                          onChange={e => setEditGroupTag(e.target.value)}
                          className="w-full px-2 py-1 text-xs border rounded border-stone-200 focus:outline-none focus:border-stone-400"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="p-1 text-stone-500 hover:text-stone-800 text-[11px] rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSaveEdit(conv.id, e)}
                          className="px-2 py-1 bg-stone-900 text-white rounded text-[11px] font-medium flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <p className="truncate font-medium">{conv.title || 'Note Inquiry'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] ${conv.id === activeConversationId ? 'text-stone-300' : 'text-stone-400'}`}>
                            {new Date(conv.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          {conv.group_tag && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                              conv.id === activeConversationId
                                ? 'bg-stone-800 text-stone-200'
                                : 'bg-stone-200/70 text-stone-600'
                            }`}>
                              <Tag className="w-2.5 h-2.5" />
                              {conv.group_tag}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons (Edit & Delete) */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleStartEdit(conv, e)}
                          title="Rename or group inquiry"
                          className={`p-1 rounded transition-colors ${
                            conv.id === activeConversationId
                              ? 'hover:bg-stone-800 text-stone-300'
                              : 'hover:bg-stone-200 text-stone-400 hover:text-stone-700'
                          }`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(conv.id, e)}
                          title="Delete inquiry"
                          className={`p-1 rounded transition-colors ${
                            conv.id === activeConversationId
                              ? 'hover:bg-red-900 text-red-300'
                              : 'hover:bg-red-100 text-stone-400 hover:text-red-600'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400">
            <BookOpen className="w-10 h-10 text-stone-300 mb-3" />
            <h4 className="text-xs font-semibold text-stone-700">What would you like to look up?</h4>
            <p className="text-[11px] text-stone-500 max-w-sm mt-1 leading-relaxed">
              Ask any question about your lectures, readings, or slides. Answers will be saved as continuous study sessions and quote the exact page and section from your notes.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className="space-y-3">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-stone-900 text-white p-3.5 text-xs shadow-2xs leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl bg-stone-50/90 border border-stone-200/80 p-4 text-xs space-y-3 shadow-2xs">
                    <MathRenderer content={formatAssistantContent(msg.content)} className="text-stone-800" />

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2.5 border-t border-stone-200/70 space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleMessageCitation(idx)}
                          className="flex items-center justify-between w-full text-left text-[11px] font-medium text-stone-500 hover:text-stone-800 transition-colors py-1 px-1 rounded hover:bg-stone-100/60"
                        >
                          <span className="flex items-center gap-1.5">
                            <Quote className="w-3 h-3 text-stone-400" />
                            <span>
                              {msg.citations.length} {msg.citations.length === 1 ? 'source citation' : 'source citations'} available
                            </span>
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-stone-400">
                            {(expandedCitations[idx] ?? showCitations) ? (
                              <><span>Hide</span><ChevronUp className="w-3 h-3" /></>
                            ) : (
                              <><span>View sources</span><ChevronDown className="w-3 h-3" /></>
                            )}
                          </span>
                        </button>

                        {(expandedCitations[idx] ?? showCitations) && (
                          <div className="space-y-1.5 pt-1">
                            {msg.citations.map((cit, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-2.5 rounded-lg bg-white border border-stone-200/80 text-[11px] shadow-2xs"
                              >
                                <div className="flex items-center justify-between text-stone-800 font-medium text-[11px]">
                                  <span>{cit.document_name} {cit.page_number ? `(Page ${cit.page_number})` : ''}</span>
                                </div>
                                <p className="text-stone-600 mt-1 italic text-[11px] line-clamp-2 leading-relaxed">
                                  "{cit.excerpt}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {msg.evidence_sufficient === false && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>This topic does not appear to be covered in your uploaded documents.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-stone-200/80 bg-white flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your uploaded materials..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white transition-all shadow-xs"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
