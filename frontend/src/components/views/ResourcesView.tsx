"use client";

import React, { useEffect, useState, useRef } from 'react';
import { api, ResourceItem, StudyFolder, ResourceChunkEdit, ConversationOut, ChatMessageOut } from '@/lib/api';
import { MathRenderer } from '@/components/MathRenderer';
import {
  Upload, FileText, Image as ImageIcon, Trash2, Eye, RefreshCw,
  MessageSquare, FolderPlus, Folder, CheckCircle2, AlertCircle,
  X, Check, Edit3, Plus, ArrowRight, BookOpen, Layers,
  Sparkles, Send, Loader2, Quote, ChevronDown, ChevronUp,
  History, ChevronRight, Edit2, Tag, ArrowUpRight, HelpCircle,
  CheckCircle, FileQuestion, BookMarked
} from 'lucide-react';

interface Props {
  initialTab?: 'materials' | 'solutions';
  initialResourceId?: string;
  initialFolderId?: string;
  onNavigateToMentor?: () => void;
  onAskResource?: (resourceId: string, folderId?: string) => void;
}

export function ResourcesView({
  initialTab = 'materials',
  initialResourceId,
  initialFolderId,
  onNavigateToMentor,
  onAskResource
}: Props) {
  // Tab state: 'materials' | 'solutions'
  const [activeTab, setActiveTab] = useState<'materials' | 'solutions'>(initialTab);

  // Common study material state
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [folders, setFolders] = useState<StudyFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | 'all' | 'unassigned'>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Folder creation modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderSubject, setFolderSubject] = useState('Physics');
  const [folderDesc, setFolderDesc] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Verification & Preview modal state
  const [inspectingResource, setInspectingResource] = useState<ResourceItem | null>(null);
  const [editableChunks, setEditableChunks] = useState<ResourceChunkEdit[]>([]);
  const [savingChunks, setSavingChunks] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Chat & Solutions state
  const [selectedScope, setSelectedScope] = useState<string>(() => {
    if (initialFolderId) return `folder:${initialFolderId}`;
    if (initialResourceId) return `res:${initialResourceId}`;
    return 'all';
  });
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    evidence_sufficient?: boolean;
    citations?: any[];
  }>>([]);
  const [conversations, setConversations] = useState<ConversationOut[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Edit conversation title/tag
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGroupTag, setEditGroupTag] = useState('');

  // Citations toggle & expand
  const [showCitations, setShowCitations] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mentormate_show_citations');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [expandedCitations, setExpandedCitations] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial props
  useEffect(() => {
    if (initialResourceId) {
      setSelectedScope(`res:${initialResourceId}`);
      setActiveTab('solutions');
    } else if (initialFolderId) {
      setSelectedScope(`folder:${initialFolderId}`);
      setActiveTab('solutions');
    }
  }, [initialResourceId, initialFolderId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resList, folderList, convList] = await Promise.all([
        api.listResources(),
        api.listFolders(),
        api.getResourceConversations().catch(() => [] as ConversationOut[])
      ]);
      setResources(resList);
      setFolders(folderList);
      setConversations(convList);
      if (convList.length > 0 && !activeConversationId) {
        selectConversation(convList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load study library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'solutions') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const targetFolderId = activeFolderId !== 'all' && activeFolderId !== 'unassigned' ? activeFolderId : undefined;
      const uploaded = await api.uploadResource(file, undefined, undefined, targetFolderId);
      await fetchData();
      // Open inspection modal for newly uploaded notes
      handleOpenInspect(uploaded.id);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    try {
      setCreatingFolder(true);
      const newFolder = await api.createFolder({
        name: folderName.trim(),
        subject: folderSubject.trim() || 'General',
        description: folderDesc.trim() || undefined
      });
      setShowFolderModal(false);
      setFolderName('');
      setFolderDesc('');
      await fetchData();
      setActiveFolderId(newFolder.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create study unit');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this study unit? Your documents will stay in your library under Unorganized.')) return;
    try {
      await api.deleteFolder(folderId);
      if (activeFolderId === folderId) setActiveFolderId('all');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete study unit');
    }
  };

  const handleAssignFolder = async (resourceId: string, folderId: string | null) => {
    try {
      await api.assignResourceFolder(resourceId, folderId);
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, folder_id: folderId } : r));
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to update folder assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this document from your library?')) return;
    try {
      await api.deleteResource(id);
      if (inspectingResource?.id === id) setInspectingResource(null);
      if (selectedScope === `res:${id}`) setSelectedScope('all');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleOpenInspect = async (id: string) => {
    try {
      const full: any = await api.getResource(id);
      const resItem: ResourceItem = full.resource ? { ...full.resource, chunks: full.chunks } : full;
      setInspectingResource(resItem);
      const rawChunks = resItem.chunks || full.chunks || [];
      const chunks = rawChunks.map((c: any, idx: number) => ({
        id: c.id,
        chunk_index: c.chunk_index ?? idx,
        page_number: c.page_number,
        slide_number: c.slide_number,
        section_title: c.section_title || `Page ${c.page_number || idx + 1}`,
        content: c.content
      }));
      setEditableChunks(chunks);
      setSaveSuccess(false);
    } catch (err: any) {
      setError(err.message || 'Failed to open preview');
    }
  };

  const handleSaveChunks = async () => {
    if (!inspectingResource) return;
    try {
      setSavingChunks(true);
      await api.updateResourceChunks(inspectingResource.id, editableChunks);
      setSaveSuccess(true);
      setInspectingResource(prev => prev ? { ...prev, is_verified: true } : null);
      await fetchData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save verified notes');
    } finally {
      setSavingChunks(false);
    }
  };

  const handleChunkChange = (index: number, field: 'section_title' | 'content', value: string) => {
    setEditableChunks(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddChunk = () => {
    setEditableChunks(prev => [
      ...prev,
      {
        chunk_index: prev.length,
        section_title: `Section ${prev.length + 1}`,
        content: ''
      }
    ]);
  };

  const handleRemoveChunk = (index: number) => {
    setEditableChunks(prev => prev.filter((_, i) => i !== index));
  };

  // Quick switch from material card directly to AI Solutions tab
  const handleLaunchSolutionChat = (resourceId?: string, folderId?: string) => {
    if (resourceId) {
      setSelectedScope(`res:${resourceId}`);
    } else if (folderId) {
      setSelectedScope(`folder:${folderId}`);
    } else {
      setSelectedScope('all');
    }
    setActiveTab('solutions');
    if (onAskResource && resourceId) {
      onAskResource(resourceId, folderId);
    }
  };

  // Chat conversation handling
  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setShowHistorySidebar(false);
    try {
      setChatLoading(true);
      const msgs = await api.getResourceMessages(convId);
      setMessages(msgs.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        evidence_sufficient: m.evidence_sufficient,
        citations: m.citations
      })));
    } catch (err) {
      console.error("Failed to load inquiry messages:", err);
    } finally {
      setChatLoading(false);
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

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this inquiry history?')) return;
    try {
      await api.deleteResourceConversation(convId);
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        startNewSession();
      }
    } catch (err) {
      console.error("Failed to delete inquiry:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || chatLoading) return;

    if (!textToSend) setInput('');
    setError(null);

    // Optimistically append user message
    const newMessages = [...messages, { role: 'user' as const, content: messageContent }];
    setMessages(newMessages);
    setChatLoading(true);

    try {
      let targetResId: string | undefined = undefined;
      let targetFoldId: string | undefined = undefined;

      if (selectedScope.startsWith('res:')) {
        targetResId = selectedScope.replace('res:', '');
      } else if (selectedScope.startsWith('folder:')) {
        targetFoldId = selectedScope.replace('folder:', '');
      }

      const response: ChatMessageOut = await api.queryResourceAI({
        message: messageContent,
        resource_id: targetResId,
        folder_id: targetFoldId,
        conversation_id: activeConversationId || undefined
      });

      if (!activeConversationId && response.conversation_id) {
        setActiveConversationId(response.conversation_id);
        const convList = await api.getResourceConversations().catch(() => []);
        setConversations(convList);
      }

      setMessages([...newMessages, {
        role: 'assistant',
        content: response.content,
        evidence_sufficient: response.evidence_sufficient,
        citations: response.citations
      }]);
    } catch (err: any) {
      setError(err.message || 'Failed to get answer from your study notes');
      setMessages([...newMessages, {
        role: 'assistant',
        content: '⚠️ Failed to connect to the notes assistant. Please ensure your notes are uploaded and try again.',
        evidence_sufficient: false
      }]);
    } finally {
      setChatLoading(false);
    }
  };

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

  const formatAssistantContent = (raw: string) => {
    return raw.replace(/\[Source\s*\d+[^\]]*\]/gi, '').trim();
  };

  // Filter resources by folder
  const filteredResources = resources.filter(res => {
    if (activeFolderId === 'all') return true;
    if (activeFolderId === 'unassigned') return !res.folder_id;
    return res.folder_id === activeFolderId;
  });

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const isImageFile = (type?: string | null) => Boolean(type && ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(type.toLowerCase()));

  // Active Scope Label for Chat
  const getScopeLabel = () => {
    if (selectedScope === 'all') return `All Uploaded Materials (${resources.length})`;
    if (selectedScope.startsWith('folder:')) {
      const fId = selectedScope.replace('folder:', '');
      const f = folders.find(x => x.id === fId);
      return f ? `Unit: ${f.name}` : 'Selected Study Unit';
    }
    if (selectedScope.startsWith('res:')) {
      const rId = selectedScope.replace('res:', '');
      const r = resources.find(x => x.id === rId);
      return r ? `Document: ${r.title}` : 'Selected Document';
    }
    return 'All Materials';
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & INTEGRATED SUB-TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-stone-900 text-white shadow-2xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-stone-900">Study Notes & Solutions</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
              Grounded AI
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Upload your course materials, verify extracted textbook notes, and get step-by-step solutions strictly grounded in your syllabus.
          </p>
        </div>

        {/* View Mode Switcher + Upload Action */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Segmented Mode Button */}
          <div className="p-1 bg-stone-100 rounded-xl flex items-center border border-stone-200/80">
            <button
              onClick={() => setActiveTab('materials')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'materials'
                  ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-stone-600" />
              <span>Materials</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                {resources.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('solutions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'solutions'
                  ? 'bg-stone-900 text-white shadow-2xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'solutions' ? 'text-amber-300' : 'text-stone-500'}`} />
              <span>Ask & Solve</span>
            </button>
          </div>

          {/* New Unit Button */}
          {activeTab === 'materials' && (
            <button
              onClick={() => setShowFolderModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">New Unit</span>
            </button>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.webp,.bmp,.jfif,image/*,application/pdf"
            className="hidden"
          />

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-1.5"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reading & OCR...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Material</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: STUDY MATERIALS & UPLOADS */}
      {/* ========================================================================= */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          {/* Study Units / Folder Navigation Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-200/80 scrollbar-none">
            <button
              onClick={() => setActiveFolderId('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeFolderId === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Materials</span>
              <span className="ml-1 text-[10px] opacity-75">({resources.length})</span>
            </button>

            {folders.map(folder => {
              const count = resources.filter(r => r.folder_id === folder.id).length;
              return (
                <div key={folder.id} className="relative group shrink-0">
                  <button
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      activeFolderId === folder.id
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    <span className="truncate max-w-[150px]">{folder.name}</span>
                    <span className="ml-1 text-[10px] opacity-75">({count})</span>
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => setActiveFolderId('unassigned')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                activeFolderId === 'unassigned'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/80'
              }`}
            >
              <span>Unorganized</span>
              <span className="ml-1 text-[10px] opacity-75">
                ({resources.filter(r => !r.folder_id).length})
              </span>
            </button>
          </div>

          {/* Active Folder Banner */}
          {activeFolder && (
            <div className="p-4 rounded-xl bg-white border border-stone-200/90 flex items-center justify-between gap-4 shadow-2xs">
              <div>
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-semibold text-stone-900">{activeFolder.name}</h2>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-600">
                    {activeFolder.subject}
                  </span>
                </div>
                {activeFolder.description && (
                  <p className="text-xs text-stone-500 mt-1">{activeFolder.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleLaunchSolutionChat(undefined, activeFolder.id)}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ask Entire Unit</span>
                </button>
                <button
                  onClick={() => handleDeleteFolder(activeFolder.id)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete Study Unit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Documents Grid / Empty State */}
          {loading ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              Loading your study library...
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-stone-200 bg-white p-8 shadow-2xs">
              <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-stone-900">
                {activeFolderId === 'all' ? 'No Study Materials Uploaded Yet' : 'No Materials in this Study Unit'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                Upload lecture notes, handwritten summaries, textbook chapters, or question banks to get instant solutions.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium transition-all shadow-xs hover:bg-stone-800"
              >
                Upload Material Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((res) => {
                const isImg = isImageFile(res.file_type);

                return (
                  <div
                    key={res.id}
                    className="p-4 rounded-xl bg-white border border-stone-200/90 hover:border-stone-300 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-2 rounded-lg bg-stone-100 text-stone-600 shrink-0">
                            {isImg ? <ImageIcon className="w-4 h-4 text-sky-600" /> : <FileText className="w-4 h-4 text-stone-600" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-stone-900 truncate" title={res.title}>
                              {res.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-stone-100 border border-stone-200 uppercase text-stone-600">
                                {res.file_type ? res.file_type.toUpperCase() : 'DOC'}
                              </span>
                              <span className="text-[11px] text-stone-400">•</span>
                              <span className="text-[11px] text-stone-500">{(res.file_size_bytes / 1024).toFixed(0)} KB</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(res.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Verification Status & Unit Tag */}
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
                        {res.is_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenInspect(res.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md hover:bg-amber-100 transition-colors"
                            title="Review and verify OCR transcription"
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>Verify Text</span>
                          </button>
                        )}

                        <span className="text-[11px] text-stone-500">
                          {res.chunk_count} {res.chunk_count === 1 ? 'section' : 'sections'}
                        </span>
                      </div>

                      {/* Folder Selector Dropdown */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-stone-400 font-medium shrink-0">Study Unit:</span>
                        <select
                          value={res.folder_id || ''}
                          onChange={(e) => handleAssignFolder(res.id, e.target.value || null)}
                          className="text-[11px] bg-stone-50 border border-stone-200 rounded px-2 py-0.5 text-stone-700 focus:outline-none focus:border-stone-400 truncate max-w-[170px]"
                        >
                          <option value="">Unorganized</option>
                          {folders.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                      <button
                        onClick={() => handleOpenInspect(res.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview & Edit</span>
                      </button>

                      <button
                        onClick={() => handleLaunchSolutionChat(res.id)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Ask & Solve</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NOTES AI & SOLUTIONS CHAT WORKSPACE */}
      {/* ========================================================================= */}
      {activeTab === 'solutions' && (
        <div className="space-y-4">
          {/* Top Control Bar: Scope Selector + History Toggle + Strict Grounding Badge */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-stone-500">Target Material:</span>
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-50 border border-stone-200 text-stone-800 focus:outline-none focus:border-stone-400 max-w-[280px] truncate"
                >
                  <option value="all">📚 All Uploaded Materials ({resources.length})</option>
                  {folders.length > 0 && (
                    <optgroup label="Study Units">
                      {folders.map(f => (
                        <option key={f.id} value={`folder:${f.id}`}>📁 Unit: {f.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {resources.length > 0 && (
                    <optgroup label="Specific Documents">
                      {resources.map(r => (
                        <option key={r.id} value={`res:${r.id}`}>📄 {r.title}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <button
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                  showHistorySidebar
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({conversations.length})</span>
              </button>

              <button
                onClick={startNewSession}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Question</span>
              </button>
            </div>

            {/* Strict Grounding & Study Mentor Redirect Notice */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900">
                <span className="font-semibold">🔒 Grounded:</span>
                <span>Sticks strictly to your notes.</span>
                {onNavigateToMentor && (
                  <button
                    onClick={onNavigateToMentor}
                    className="ml-1 text-amber-800 underline font-semibold hover:text-amber-950 inline-flex items-center gap-0.5"
                  >
                    <span>General doubts? Go to Study Mentor</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <button
                onClick={toggleShowCitations}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  showCitations
                    ? 'bg-stone-100 text-stone-800 border-stone-300'
                    : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                }`}
                title="Toggle evidence source citations"
              >
                <Quote className="w-3.5 h-3.5 inline mr-1" />
                <span>Citations {showCitations ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Main Chat Layout (with optional Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[560px]">
            {/* History Sidebar */}
            {showHistorySidebar && (
              <div className="lg:col-span-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Inquiry History</h3>
                  <button onClick={() => setShowHistorySidebar(false)} className="text-stone-400 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-stone-400 py-4 text-center">No past inquiries recorded yet.</p>
                  ) : (
                    conversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => selectConversation(conv.id)}
                        className={`p-2.5 rounded-xl cursor-pointer text-xs transition-all border ${
                          activeConversationId === conv.id
                            ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                            : 'bg-stone-50/70 hover:bg-stone-100 text-stone-800 border-stone-200/60'
                        }`}
                      >
                        {editingConvId === conv.id ? (
                          <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded bg-white text-stone-900 border border-stone-300"
                              placeholder="Session title"
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={e => handleSaveEdit(conv.id, e)}
                                className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px]"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingConvId(null)}
                                className="px-2 py-0.5 rounded bg-stone-300 text-stone-800 text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium truncate">{conv.title}</span>
                            <div className="flex items-center gap-1 shrink-0 opacity-70 hover:opacity-100">
                              <button
                                onClick={e => handleStartEdit(conv, e)}
                                className="p-1 hover:text-amber-300"
                                title="Rename"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => handleDeleteConversation(conv.id, e)}
                                className="p-1 hover:text-rose-400"
                                title="Delete"
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

            {/* Chat Body & Input */}
            <div className={`${showHistorySidebar ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col rounded-2xl bg-white border border-stone-200/90 shadow-2xs overflow-hidden`}>
              {/* Messages Area */}
              <div className="flex-1 p-5 overflow-y-auto max-h-[520px] min-h-[380px] space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
                      <Sparkles className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-stone-900">
                        Ask Questions & Get Step-by-Step Solutions
                      </h3>
                      <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
                        Currently analyzing: <span className="font-semibold text-stone-800">{getScopeLabel()}</span>.
                        Ask for solutions to exercise questions, derivations, or concept explanations.
                      </p>
                    </div>

                    {/* Quick Action Chips */}
                    <div className="flex flex-wrap gap-2 justify-center max-w-lg pt-2">
                      {[
                        "⚡ Solve the exercise problems step-by-step from this material",
                        "📝 Summarize key definitions and core concepts",
                        "📐 List all formulas, variables, and governing equations",
                        "❓ Give a clear conceptual breakdown of the primary topic"
                      ].map((promptText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(promptText)}
                          className="px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-stone-700 text-xs text-left transition-all hover:border-stone-300"
                        >
                          {promptText}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isExpanded = expandedCitations[idx] !== undefined ? expandedCitations[idx] : showCitations;

                    return (
                      <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 shadow-2xs ${
                            isUser
                              ? 'bg-stone-900 text-white rounded-br-xs'
                              : 'bg-stone-50 text-stone-900 border border-stone-200/80 rounded-bl-xs'
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                          ) : (
                            <div className="space-y-3">
                              {/* Math & Solution Renderer */}
                              <div className="prose prose-stone max-w-none text-xs leading-relaxed">
                                <MathRenderer content={formatAssistantContent(msg.content)} />
                              </div>

                              {/* Out-of-topic alert if ungrounded */}
                              {msg.evidence_sufficient === false && (
                                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between gap-2 mt-2">
                                  <span>Need broader academic help outside these notes?</span>
                                  {onNavigateToMentor && (
                                    <button
                                      onClick={onNavigateToMentor}
                                      className="px-2.5 py-1 rounded-lg bg-amber-900 text-white font-medium hover:bg-amber-950 transition-colors shrink-0"
                                    >
                                      Open Study Mentor
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Citations block */}
                              {msg.citations && msg.citations.length > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-stone-200/70">
                                  <button
                                    onClick={() => toggleMessageCitation(idx)}
                                    className="flex items-center gap-1.5 text-[10px] font-semibold text-stone-500 hover:text-stone-800 transition-colors"
                                  >
                                    <Quote className="w-3 h-3 text-stone-400" />
                                    <span>{msg.citations.length} Grounded Excerpt {msg.citations.length === 1 ? 'Source' : 'Sources'}</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  {isExpanded && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                      {msg.citations.map((cit, cIdx) => (
                                        <div
                                          key={cIdx}
                                          className="p-2.5 rounded-xl bg-white border border-stone-200 text-[10px] space-y-1"
                                        >
                                          <div className="flex items-center justify-between font-semibold text-stone-800 truncate">
                                            <span className="truncate">{cit.document_name}</span>
                                            {cit.page_number && <span className="text-stone-400 shrink-0 ml-1">P.{cit.page_number}</span>}
                                          </div>
                                          {cit.section_title && (
                                            <div className="text-[9px] text-amber-800 font-medium">{cit.section_title}</div>
                                          )}
                                          <p className="text-stone-500 italic line-clamp-3">"{cit.excerpt}"</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center gap-2 shadow-2xs">
                      <Loader2 className="w-4 h-4 animate-spin text-stone-800" />
                      <span>Synthesizing grounded solution from your study notes...</span>
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3.5 bg-stone-50 border-t border-stone-200/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask a question or solve a problem from ${getScopeLabel()}...`}
                    disabled={chatLoading}
                    className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-stone-500 disabled:opacity-50 text-stone-900 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || chatLoading}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ask</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE STUDY UNIT */}
      {/* ========================================================================= */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-stone-800" />
                <h3 className="text-sm font-bold text-stone-900">Create Study Unit</h3>
              </div>
              <button
                onClick={() => setShowFolderModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Group notes, syllabus documents, and question banks of the same unit together so the AI can search across all of them at once.
            </p>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Unit / Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Unit 1: Ray Optics & Wave Motion"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g., Physics, Chemistry, Mathematics"
                  value={folderSubject}
                  onChange={(e) => setFolderSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of chapters covered..."
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !folderName.trim()}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium shadow-xs"
                >
                  {creatingFolder ? 'Creating...' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VERIFY & PREVIEW EXTRACTED OCR CHUNKS */}
      {/* ========================================================================= */}
      {inspectingResource && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-stone-900 text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-stone-900 truncate">
                    {inspectingResource.title}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Review and verify OCR-extracted text sections to ensure 100% grounded AI accuracy.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingResource(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Editable Chunks */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Notes verified and saved successfully!</span>
                </div>
              )}

              <div className="space-y-3">
                {editableChunks.map((chunk, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={chunk.section_title || ''}
                        onChange={(e) => handleChunkChange(idx, 'section_title', e.target.value)}
                        placeholder={`Section ${idx + 1} Title`}
                        className="text-xs font-semibold px-2 py-1 rounded bg-white border border-stone-200 text-stone-900 flex-1"
                      />
                      <button
                        onClick={() => handleRemoveChunk(idx)}
                        className="p-1 text-stone-400 hover:text-rose-600"
                        title="Remove section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      value={chunk.content}
                      onChange={(e) => handleChunkChange(idx, 'content', e.target.value)}
                      placeholder="Extracted text content..."
                      className="w-full text-xs p-2.5 rounded-lg bg-white border border-stone-200 font-mono text-stone-800 leading-relaxed focus:outline-none focus:border-stone-400"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddChunk}
                className="w-full py-2.5 rounded-xl border border-dashed border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Extra Note Section</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50/70 flex items-center justify-between">
              <button
                onClick={() => {
                  const rId = inspectingResource.id;
                  setInspectingResource(null);
                  handleLaunchSolutionChat(rId);
                }}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Ask Notes directly</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectingResource(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-200/60 text-xs font-medium"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveChunks}
                  disabled={savingChunks}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs"
                >
                  {savingChunks ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify & Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
