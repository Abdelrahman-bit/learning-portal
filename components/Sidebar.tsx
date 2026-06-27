'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DocMetadata } from '@/lib/docs';
import { Folder, FileText, Plus, ChevronDown, ChevronRight, Loader2, Home, Trash2, X } from 'lucide-react';

interface SidebarProps {
  onNewDocClick: () => void;
  refreshTrigger?: number;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export default function Sidebar({ 
  onNewDocClick, 
  refreshTrigger = 0,
  sidebarOpen = false,
  setSidebarOpen
}: SidebarProps) {
  const [docs, setDocs] = useState<DocMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const router = useRouter();

  // Load document directory listing
  useEffect(() => {
    async function fetchDocs() {
      try {
        setLoading(true);
        const res = await fetch('/api/docs');
        if (res.ok) {
          const data = await res.json();
          setDocs(data);
        }
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, [refreshTrigger]);

  // Group docs by category
  const categories: Record<string, DocMetadata[]> = {};
  docs.forEach((doc) => {
    const cat = doc.category || 'General';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(doc);
  });

  const toggleCategory = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const getDocPath = (slug: string) => `/docs/${slug}`;

  // Automatically expand category containing the active document
  useEffect(() => {
    if (!pathname) return;
    const currentSlug = pathname.replace('/docs/', '');
    const activeDoc = docs.find((d) => d.slug === currentSlug);
    if (activeDoc && activeDoc.category) {
      setCollapsedCategories((prev) => ({
        ...prev,
        [activeDoc.category]: false, // False means open
      }));
    }
  }, [pathname, docs]);

  const handleDelete = async (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm(`Are you sure you want to delete this document: "${slug}"?`)) {
      try {
        const res = await fetch(`/api/docs/${slug}`, { method: 'DELETE' });
        if (res.ok) {
          // Direct users to home if deleting active page
          if (pathname === getDocPath(slug)) {
            router.push('/');
          } else {
            router.refresh();
            // Force local reload by triggering pathname reload or setting local state
            setDocs((prev) => prev.filter((d) => d.slug !== slug));
          }
        } else {
          alert('Failed to delete document.');
        }
      } catch (err) {
        console.error('Error deleting doc:', err);
      }
    }
  };

  return (
    <aside className="docs-sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <span className="logo-text">Learning Portal</span>
        </Link>
        {setSidebarOpen && (
          <button 
            className="mobile-close-btn" 
            onClick={() => setSidebarOpen(false)}
            title="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <Link href="/" className={`sidebar-nav-item ${pathname === '/' ? 'active' : ''}`}>
          <Home size={16} className="nav-item-icon" />
          <span>Home Overview</span>
        </Link>

        <div className="sidebar-section-title">Documentation</div>

        {loading ? (
          <div className="sidebar-loading">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading docs index...</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="sidebar-empty">No documents found.</div>
        ) : (
          Object.keys(categories).map((catName) => {
            const isCollapsed = collapsedCategories[catName] ?? false;
            const items = categories[catName];

            return (
              <div key={catName} className="sidebar-category-group">
                <button className="sidebar-category-title" onClick={() => toggleCategory(catName)}>
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  <Folder size={14} className="cat-icon" />
                  <span className="cat-name">{catName}</span>
                  <span className="cat-badge">{items.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="sidebar-category-items">
                    {items.map((doc) => {
                      const docUrl = getDocPath(doc.slug);
                      const isActive = pathname === docUrl;
                      
                      return (
                        <Link 
                          key={doc.slug} 
                          href={docUrl} 
                          className={`sidebar-nav-subitem ${isActive ? 'active' : ''}`}
                        >
                          <FileText size={14} className="doc-icon" />
                          <span className="doc-title" title={doc.title}>{doc.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
