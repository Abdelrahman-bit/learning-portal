'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light';
import materialDark from 'react-syntax-highlighter/dist/esm/styles/prism/material-dark';
import materialLight from 'react-syntax-highlighter/dist/esm/styles/prism/material-light';
import dynamic from 'next/dynamic';

const MermaidRenderer = dynamic(() => import('./MermaidRenderer'), {
  ssr: false,
  loading: () => <div className="mermaid-placeholder animate-pulse" style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>Loading Diagram Engine...</div>
});
import { useState } from 'react';
import ZoomModal from './ZoomModal';

import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('python', python);

interface MarkdownRendererProps {
  content: string;
  theme?: 'dark' | 'light';
}

const extractText = (node: React.ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = node.props as { children?: React.ReactNode };
    if (props.children) return extractText(props.children);
  }
  return '';
};

export default function MarkdownRenderer({ content, theme = 'dark' }: MarkdownRendererProps) {
  const [zoomContent, setZoomContent] = useState<React.ReactNode | null>(null);

  // Pre-process custom highlights: ==word== to <mark class="accent-highlight">word</mark>
  const processedContent = content.replace(/==([^=]+)==/g, '<mark class="accent-highlight">$1</mark>');

  const highlightStyle = theme === 'dark' ? materialDark : materialLight;

  return (
    <div className={`markdown-body-custom theme-${theme}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (language === 'mermaid') {
              return (
                <div className="mermaid-wrapper-block">
                  <MermaidRenderer chart={codeString} theme={theme} />
                </div>
              );
            }

            return match ? (
              <div className="code-syntax-wrapper">
                <div className="code-header">
                  <span className="code-lang">{language}</span>
                  <button 
                    className="copy-code-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(codeString);
                      alert('Code copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
                <SyntaxHighlighter
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  {...(props as any)}
                  style={highlightStyle}
                  language={language}
                  PreTag="div"
                  className="syntax-highlighter-block"
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="inline-code-custom" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="table-responsive-wrapper">
                <table className="table-custom">{children}</table>
              </div>
            );
          },
          a({ href, children }) {
            let parsedHref = href || '';
            if (parsedHref.endsWith('.md')) {
              parsedHref = parsedHref.replace(/\.md$/, '').replace(/^\.\/?/, '');
              parsedHref = `/docs/${parsedHref}`;
            }
            return (
              <a href={parsedHref} className="link-custom">
                {children}
              </a>
            );
          },
          h1({ children, ...props }) {
            const text = extractText(children);
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return <h1 id={id} style={{ scrollMarginTop: '100px' }} {...props}>{children}</h1>;
          },
          h2({ children, ...props }) {
            const text = extractText(children);
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return <h2 id={id} style={{ scrollMarginTop: '100px' }} {...props}>{children}</h2>;
          },
          h3({ children, ...props }) {
            const text = extractText(children);
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return <h3 id={id} style={{ scrollMarginTop: '100px' }} {...props}>{children}</h3>;
          },
          img({ src, alt }) {
            const cleanSrc = src === '/docs/placeholder.jpg' ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' : src;
            return (
              <span 
                className="img-container-custom cursor-pointer transition-transform hover:scale-[1.01] hover:shadow-lg relative group block"
                onClick={() => setZoomContent(<img src={cleanSrc} alt={alt || 'Zoomed Image'} className="w-full h-auto object-contain rounded-lg shadow-2xl" />)}
                title="Click to enlarge image"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur z-10 pointer-events-none">
                  Click to Zoom
                </div>
                <img src={cleanSrc} alt={alt || 'Image Documentation'} className="img-custom" />
                {alt && <span className="img-caption">{alt}</span>}
              </span>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
      
      <ZoomModal isOpen={!!zoomContent} onClose={() => setZoomContent(null)}>
        {zoomContent}
      </ZoomModal>
    </div>
  );
}
