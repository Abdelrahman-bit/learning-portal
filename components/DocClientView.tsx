'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocData } from '@/lib/docs';
import MarkdownRenderer from './MarkdownRenderer';
import Editor from './Editor';
import { Edit3, Calendar, Folder, ArrowLeft, Menu } from 'lucide-react';
import Link from 'next/link';

interface DocClientViewProps {
  initialDoc: DocData;
}

interface TocItem {
  text: string;
  id: string;
  level: number;
}

export default function DocClientView({ initialDoc }: DocClientViewProps) {
  const [doc, setDoc] = useState<DocData>(initialDoc);
  const [isEditing, setIsEditing] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle URL edit state trigger (disabled)
  useEffect(() => {
    setIsEditing(false);
  }, [searchParams]);

  // Sync state if initialDoc changes (e.g. route transitions)
  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  // Parse headers from markdown content to build Table of Contents
  useEffect(() => {
    if (isEditing) return;

    const lines = doc.content.split('\n');
    const items: TocItem[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(##|###)\s+(.+)$/);
      if (match) {
        const level = match[1].length; // 2 for h2, 3 for h3
        const text = match[2].trim().replace(/[#*`_]/g, '');
        // Create an HTML anchor id from the text
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        items.push({ text, id, level });
      }
    });

    setToc(items);
  }, [doc.content, isEditing]);

  const handleSave = async (updatedData: DocData) => {
    // Disabled save handler
  };

  const handleCancel = () => {
    setIsEditing(false);
    router.push(`/docs/${doc.slug}`);
  };

  if (isEditing) {
    return (
      <Editor
        initialData={doc}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="doc-view-layout">
      {/* Central Markdown content */}
      <article className="doc-content-article">
        <div className="doc-meta-breadcrumbs">
          <Link href="/" className="back-link">
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
          <span className="crumb-separator">/</span>
          <span className="crumb-category">{doc.category}</span>
          <span className="crumb-separator">/</span>
          <span className="crumb-active">{doc.title}</span>
        </div>

        <div className="doc-view-header">
          <div className="doc-title-group">
            <span className="doc-view-category">
              <Folder size={14} className="cat-icon" />
              <span>{doc.category}</span>
            </span>
            <h1>{doc.title}</h1>
            {doc.description && <p className="doc-subtitle">{doc.description}</p>}
          </div>
        </div>

        <hr className="header-divider" />

        <div className="doc-body-wrapper">
          <MarkdownRenderer content={doc.content} />
        </div>
      </article>

      {/* Sticky Table of Contents (Outline) on the right */}
      {toc.length > 0 && (
        <aside className="doc-toc-sidebar">
          <div className="toc-header">
            <Menu size={14} />
            <span>On This Page</span>
          </div>
          <nav className="toc-list">
            {toc.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`toc-item level-${item.level}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}
