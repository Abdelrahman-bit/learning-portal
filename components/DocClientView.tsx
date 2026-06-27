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
  const [activeId, setActiveId] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle URL edit state trigger (disabled)
  useEffect(() => {
    setIsEditing(false);
  }, [searchParams]);

  // Sync state if initialDoc changes (e.g. route transitions)
  useEffect(() => {
    setDoc(initialDoc);
    
    // Track recently viewed docs in localStorage
    try {
      const MAX_RECENT = 10;
      const recentDocsStr = localStorage.getItem('recent_docs') || '[]';
      let recentDocs: string[] = JSON.parse(recentDocsStr);
      
      // Remove it if it's already in the list so we can move it to the top
      recentDocs = recentDocs.filter(slug => slug !== initialDoc.slug);
      
      // Add to the front
      recentDocs.unshift(initialDoc.slug);
      
      // Keep only top max
      if (recentDocs.length > MAX_RECENT) {
        recentDocs = recentDocs.slice(0, MAX_RECENT);
      }
      
      localStorage.setItem('recent_docs', JSON.stringify(recentDocs));
    } catch (e) {
      console.error('Failed to update recent docs tracking', e);
    }
  }, [initialDoc]);

  // Parse headers from markdown content to build Table of Contents
  useEffect(() => {
    if (isEditing) return;

    const lines = doc.content.split(/\r?\n/);
    const items: TocItem[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(#|##|###)\s+(.+)$/);
      if (match) {
        const level = match[1].length; // 1 for h1, 2 for h2, 3 for h3
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

  // IntersectionObserver to highlight active section in TOC
  useEffect(() => {
    if (toc.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Track the most recently intersected entry
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        // Trigger when the header is within the top 40% of the screen, accounting for a fixed navbar
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
      }
    );

    const observedIds = new Set<string>();
    
    // Poll to ensure ReactMarkdown has finished rendering the DOM nodes
    const interval = setInterval(() => {
      toc.forEach(item => {
        if (!observedIds.has(item.id)) {
          const el = document.getElementById(item.id);
          if (el) {
            observer.observe(el);
            observedIds.add(item.id);
          }
        }
      });
      
      // Stop polling once all elements are found
      if (observedIds.size === toc.length) {
        clearInterval(interval);
      }
    }, 250);

    // Safety timeout to clear interval just in case an ID was completely malformed
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [toc]);

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
                className={`toc-item level-${item.level} transition-colors ${activeId === item.id ? 'text-blue-500 font-semibold border-l-2 border-blue-500 pl-3' : 'text-gray-400 hover:text-gray-200 pl-4 border-l-2 border-transparent'}`}
                style={{ paddingLeft: `${(item.level - 1) * 12 + 16}px` }}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    // Update URL without jumping
                    window.history.pushState(null, '', `#${item.id}`);
                    setActiveId(item.id);
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
