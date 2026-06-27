'use client';

import { useState } from 'react';
import { DocData } from '@/lib/docs';
import MarkdownRenderer from './MarkdownRenderer';
import { Save, X, Eye, Edit3, Loader2 } from 'lucide-react';

interface EditorProps {
  initialData: DocData;
  onSave: (updatedData: DocData) => Promise<void>;
  onCancel: () => void;
  theme?: 'dark' | 'light';
}

export default function Editor({ initialData, onSave, onCancel, theme = 'dark' }: EditorProps) {
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description || '');
  const [category, setCategory] = useState(initialData.category || 'General');
  const [order, setOrder] = useState(initialData.order);
  const [content, setContent] = useState(initialData.content);
  
  const [activeTab, setActiveTab] = useState<'split' | 'edit' | 'preview'>('split');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required!');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({
        ...initialData,
        title,
        description,
        category,
        order: Number(order),
        content,
      });
    } catch (err) {
      console.error('Error saving document:', err);
      alert('Failed to save document. Please check server logs.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="editor-container" onSubmit={handleSubmit}>
      <div className="editor-header">
        <div className="editor-title-area">
          <span className="editor-badge">Editing Page</span>
          <h2>{initialData.slug}</h2>
        </div>
        <div className="editor-actions">
          <button 
            type="button" 
            className="editor-btn btn-secondary" 
            onClick={onCancel}
            disabled={isSaving}
          >
            <X size={16} />
            <span>Cancel</span>
          </button>
          <button 
            type="submit" 
            className="editor-btn btn-primary" 
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="editor-metadata-grid">
        <div className="form-group">
          <label>Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Getting Started"
            required
          />
        </div>
        <div className="form-group">
          <label>Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Introduction"
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of this page..."
          />
        </div>
        <div className="form-group">
          <label>Sort Order</label>
          <input
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            placeholder="0"
          />
        </div>
      </div>

      <div className="editor-layout-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'split' ? 'active' : ''}`}
          onClick={() => setActiveTab('split')}
        >
          <Edit3 size={14} />
          <span>Split Screen</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          <Edit3 size={14} />
          <span>Edit Only</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={14} />
          <span>Preview Only</span>
        </button>
      </div>

      <div className={`editor-content-workspace mode-${activeTab}`}>
        {(activeTab === 'split' || activeTab === 'edit') && (
          <div className="editor-textarea-pane">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Write Markdown here..."
            />
          </div>
        )}

        {(activeTab === 'split' || activeTab === 'preview') && (
          <div className="editor-preview-pane">
            <div className="preview-banner">Live Rendering</div>
            <div className="preview-contents">
              <MarkdownRenderer content={content} theme={theme} />
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
