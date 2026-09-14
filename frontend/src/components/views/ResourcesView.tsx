"use client";

import React, { useEffect, useState, useRef } from 'react';
import { api, ResourceItem, StudyFolder, ResourceChunkEdit } from '@/lib/api';
import {
  Upload, FileText, Image as ImageIcon, Trash2, Eye, RefreshCw,
  MessageSquare, FolderPlus, Folder, CheckCircle2, AlertCircle,
  X, Check, Edit3, Plus, ArrowRight, BookOpen, Layers
} from 'lucide-react';

interface Props {
  onAskResource: (resourceId: string, folderId?: string) => void;
}

export function ResourcesView({ onAskResource }: Props) {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resList, folderList] = await Promise.all([
        api.listResources(),
        api.listFolders()
      ]);
      setResources(resList);
      setFolders(folderList);
    } catch (err: any) {
      setError(err.message || 'Failed to load study library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const targetFolderId = activeFolderId !== 'all' && activeFolderId !== 'unassigned' ? activeFolderId : undefined;
      const uploaded = await api.uploadResource(file, undefined, undefined, targetFolderId);
      await fetchData();
      // Prompt student to inspect and verify newly extracted file
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
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleOpenInspect = async (id: string) => {
    try {
      const full: any = await api.getResource(id);
      // Support both { resource: {...}, chunks: [...] } and flat { id, title, chunks: [...] }
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

  // Filter resources by active folder tab
  const filteredResources = resources.filter(res => {
    if (activeFolderId === 'all') return true;
    if (activeFolderId === 'unassigned') return !res.folder_id;
    return res.folder_id === activeFolderId;
  });

  const activeFolder = folders.find(f => f.id === activeFolderId);
  const isImageFile = (type?: string | null) => Boolean(type && ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(type.toLowerCase()));
  const isPdfFile = (type?: string | null) => Boolean(type && type.toLowerCase() === 'pdf');

  return (

    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Study Materials & Units</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Organize lecture slides, textbook chapters, and handwritten notes into study units. Verify extracted text for accurate search.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-stone-600" />
            <span>New Study Unit</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.webp,.bmp,.jfif,image/*,application/pdf"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-2"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reading notes & OCR...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Material</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Study Units / Folder Tabs */}
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

      {/* Active Folder Banner if specific unit selected */}
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
              onClick={() => onAskResource('', activeFolder.id)}
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
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

      {/* Documents Grid / List */}
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
            Upload lecture notes, handwritten summaries, textbook chapters, or question banks.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-all"
          >
            Upload Material Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((res) => {
            const isImg = isImageFile(res.file_type);
            const parentFolder = folders.find(f => f.id === res.folder_id);

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
                    onClick={() => onAskResource(res.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask Notes</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: New Study Unit */}
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
                <label className="text-xs font-medium text-stone-700 block mb-1">Subject / Course</label>
                <input
                  type="text"
                  placeholder="e.g., Physics"
                  value={folderSubject}
                  onChange={(e) => setFolderSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Textbook chapter, handwritten class notes, and PYQs."
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !folderName.trim()}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-xs"
                >
                  {creatingFolder ? 'Creating...' : 'Create Study Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Interactive OCR Verification & Preview */}
      {inspectingResource && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-3 md:p-6">
          <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl border border-stone-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-200/80 bg-stone-50/70 flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white border border-stone-200 text-stone-800 shadow-2xs shrink-0">
                  {isImageFile(inspectingResource.file_type) ? (
                    <ImageIcon className="w-4 h-4 text-sky-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-stone-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900 truncate">
                      {inspectingResource.title}
                    </h3>
                    {inspectingResource.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        <AlertCircle className="w-3 h-3" />
                        <span>Awaiting Verification</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                    Review extracted notes side-by-side with your original material and make any corrections.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setInspectingResource(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two Columns (Original Preview vs. Editable Extracted Text) */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200">
              {/* Left Column: Original Material Preview */}
              <div className="h-full flex flex-col bg-stone-50/50 overflow-hidden">
                <div className="p-3 border-b border-stone-200/80 bg-white flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>Original Document / Image</span>
                  </span>
                  <a
                    href={api.getResourceFileUrl(inspectingResource.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-stone-500 hover:text-stone-900 underline"
                  >
                    Open Full Size ↗
                  </a>
                </div>

                <div className={`flex-1 overflow-hidden flex flex-col ${isPdfFile(inspectingResource.file_type) ? 'p-2' : 'p-4 items-center justify-center overflow-auto'}`}>
                  {isImageFile(inspectingResource.file_type) ? (
                    <img
                      src={api.getResourceFileUrl(inspectingResource.id)}
                      alt={inspectingResource.title}
                      className="max-w-full max-h-[62vh] object-contain rounded-lg border border-stone-200 shadow-2xs"
                    />
                  ) : isPdfFile(inspectingResource.file_type) ? (
                    <iframe
                      src={`${api.getResourceFileUrl(inspectingResource.id)}#toolbar=1&navpanes=0`}
                      title={inspectingResource.title}
                      className="w-full h-full min-h-[62vh] rounded-lg border border-stone-200 bg-white shadow-2xs"
                    />
                  ) : (
                    <div className="text-center p-8 text-stone-500 text-xs">
                      <FileText className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                      <p className="font-medium text-stone-800">{inspectingResource.file_name}</p>
                      <p className="text-[11px] text-stone-400 mt-1">Text-based course material</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Editable Extracted Text */}
              <div className="h-full flex flex-col bg-white overflow-hidden">
                <div className="p-3 border-b border-stone-200/80 bg-stone-50/30 flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                    <span>Extracted Content ({editableChunks.length} sections)</span>
                  </span>
                  <button
                    onClick={handleAddChunk}
                    className="text-[11px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Section</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {editableChunks.map((chunk, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/40 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={chunk.section_title || ''}
                          onChange={(e) => handleChunkChange(idx, 'section_title', e.target.value)}
                          placeholder={`Section ${idx + 1}`}
                          className="font-medium text-xs text-stone-900 bg-white px-2 py-1 rounded border border-stone-200 focus:outline-none focus:border-stone-400 flex-1"
                        />
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {chunk.page_number ? `Page ${chunk.page_number}` : ''}
                        </span>
                        <button
                          onClick={() => handleRemoveChunk(idx)}
                          className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                          title="Remove section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        value={chunk.content}
                        onChange={(e) => handleChunkChange(idx, 'content', e.target.value)}
                        placeholder="Transcribed text or notes for this section..."
                        className="w-full text-xs font-mono bg-white p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:border-stone-400 text-stone-800 leading-relaxed resize-y"
                      />
                    </div>
                  ))}

                  {editableChunks.length === 0 && (
                    <div className="text-center py-12 text-stone-400 text-xs">
                      No sections extracted yet. Click "Add Section" to transcribe your notes.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-stone-200 bg-stone-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    <span>Saved & re-indexed into knowledge base!</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingResource(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveChunks}
                  disabled={savingChunks}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-2"
                >
                  {savingChunks ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Knowledge Index...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save & Verify Notes</span>
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

