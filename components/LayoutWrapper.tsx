'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { X, Loader2, Sparkles } from 'lucide-react';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Create document form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Initialize theme from system preference or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const handleSetTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory.trim() || 'General',
          description: newDesc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsModalOpen(false);
        setNewTitle('');
        setNewCategory('');
        setNewDesc('');
        // Trigger sidebar list refresh
        setRefreshTrigger((prev) => prev + 1);
        // Direct user to edit the newly created document
        router.push(`/docs/${data.slug}?edit=true`);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create document'}`);
      }
    } catch (err) {
      console.error('Error creating doc:', err);
      alert('Network error. Failed to create page.');
    } finally {
      setIsCreating(false);
    }
  };

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className={`portal-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar navigation */}
      <Sidebar 
        onNewDocClick={() => {}} 
        refreshTrigger={refreshTrigger}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Dimmed backdrop overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="mobile-sidebar-overlay" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <div className="portal-main-area">
        {/* Top search & theme header */}
        <Header 
          theme={theme} 
          setTheme={handleSetTheme} 
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        {/* Scrollable page body */}
        <main className="portal-page-body">
          <div className="portal-main-content">
            {children}
          </div>
          <footer className="portal-footer">
            <span>
              Made with <span className="heart">❤️</span> by{' '}
              <a 
                href="https://abdelrahman-dev-ten.vercel.app/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="portfolio-link"
              >
                Abdelrahman Mohamed
              </a>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
