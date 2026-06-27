'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { DocMetadata } from '@/lib/docs';

interface RecentDocumentsProps {
  allDocs: DocMetadata[];
}

export default function RecentDocuments({ allDocs }: RecentDocumentsProps) {
  const [recentDocs, setRecentDocs] = useState<DocMetadata[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const recentSlugsStr = localStorage.getItem('recent_docs');
      if (recentSlugsStr) {
        const recentSlugs: string[] = JSON.parse(recentSlugsStr);
        
        // Map slugs back to document metadata objects in the exact order they were viewed
        const resolvedDocs: DocMetadata[] = [];
        recentSlugs.forEach(slug => {
          const doc = allDocs.find(d => d.slug === slug);
          if (doc) resolvedDocs.push(doc);
        });
        
        if (resolvedDocs.length > 0) {
          setRecentDocs(resolvedDocs.slice(0, 5));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse recent docs', e);
    }
    
    // Fallback: If no history, show top priority documents
    setRecentDocs(allDocs.slice(0, 5));
  }, [allDocs]);

  // Avoid hydration mismatch by rendering a skeleton or placeholder before mount
  if (!mounted) {
    return (
      <div className="recents-list" style={{ opacity: 0.5 }}>
        {allDocs.slice(0, 5).map((doc) => (
          <div key={doc.slug} className="recent-item-row pointer-events-none">
            <div className="item-icon-wrapper"><FileText size={18} /></div>
            <div className="item-details">
              <h4>{doc.title}</h4>
              <p>{doc.description || 'Loading...'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recentDocs.length === 0) {
    return (
      <div className="empty-section-card">
        <p>No documents found.</p>
      </div>
    );
  }

  return (
    <div className="recents-list">
      {recentDocs.map((doc) => (
        <Link 
          key={doc.slug} 
          href={`/docs/${doc.slug}`} 
          className="recent-item-row"
        >
          <div className="item-icon-wrapper">
            <FileText size={18} />
          </div>
          <div className="item-details">
            <h4>{doc.title}</h4>
            <p>{doc.description || 'No description provided.'}</p>
          </div>
          <div className="item-tag">{doc.category}</div>
          <ArrowRight size={16} className="row-arrow" />
        </Link>
      ))}
    </div>
  );
}
