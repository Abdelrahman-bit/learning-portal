import Link from 'next/link';
import { getAllDocsList } from '@/lib/docs';
import { FolderOpen, ArrowRight, FileText, Settings, PenTool, Sparkles } from 'lucide-react';
import PixelBlast from '@/components/PixelBlast';

export default function HomePage() {
  const docs = getAllDocsList();

  // Group by category to show totals
  const categoriesMap: Record<string, number> = {};
  docs.forEach((d) => {
    const cat = d.category || 'General';
    categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
  });

  const categories = Object.entries(categoriesMap);

  return (
    <div className="home-dashboard" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.65, pointerEvents: 'none' }}>
        <PixelBlast 
          variant="square"
          pixelSize={6}
          color="#B497CF"
          patternScale={2.5}
          patternDensity={1.8}
          speed={0.3}
          edgeFade={0.4}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero Welcome banner */}
        <section className="dashboard-hero">
          <div className="hero-content">
            <h1>Knowledge Center</h1>
            <p>
              Welcome to your documentation portal. Fully integrated with markdown editing, 
              interactive Mermaid compile runtimes, and local Git-ready folder syncing.
            </p>
            <div className="hero-ctas">
              {docs.length > 0 ? (
                <Link href={`/docs/${docs[0].slug}`} className="hero-btn btn-primary">
                  <span>Start Reading</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <div className="no-docs-warning">Create a page in the sidebar to get started!</div>
              )}
            </div>
          </div>
        </section>

        {/* Main Grid: Categories & Recents */}
        <div className="dashboard-layout-grid">
        {/* Categories Section */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Browse Categories</h2>
          </div>
          {categories.length === 0 ? (
            <div className="empty-section-card">
              <p>No categories defined. Frontmatter fields will auto-group files here.</p>
            </div>
          ) : (
            <div className="categories-grid">
              {categories.map(([name, count]) => {
                const sampleDoc = docs.find((d) => d.category === name);
                return (
                  <Link 
                    key={name} 
                    href={sampleDoc ? `/docs/${sampleDoc.slug}` : '#'} 
                    className="category-card"
                  >
                    <div className="cat-card-header">
                      <FolderOpen className="cat-folder-icon" size={20} />
                      <span className="cat-count-badge">{count} {count === 1 ? 'page' : 'pages'}</span>
                    </div>
                    <h3>{name}</h3>
                    <p>Explore technical documentations organized under {name}.</p>
                    <div className="cat-card-footer">
                      <span>Open category</span>
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Pages Section */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>Recent Documents</h2>
          </div>
          {docs.length === 0 ? (
            <div className="empty-section-card">
              <p>No documents found on disk.</p>
            </div>
          ) : (
            <div className="recents-list">
              {docs.slice(0, 5).map((doc) => (
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
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
