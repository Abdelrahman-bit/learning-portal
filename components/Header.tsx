'use client';

import { Sun, Moon, Menu } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  onToggleSidebar?: () => void;
}

export default function Header({ theme, setTheme, onToggleSidebar }: HeaderProps) {
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header className="docs-header">
      <div className="mobile-header-left">
        {onToggleSidebar && (
          <button 
            className="mobile-menu-btn" 
            onClick={onToggleSidebar} 
            title="Open navigation"
          >
            <Menu size={20} />
          </button>
        )}
      </div>
      
      <div className="header-actions">
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle interface mode">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
