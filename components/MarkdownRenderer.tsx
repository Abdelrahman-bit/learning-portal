'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MermaidRenderer from './MermaidRenderer';
import { useEffect, useState } from 'react';

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

export default function MarkdownRenderer({ content, theme = 'dark' }: MarkdownRendererProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-process custom highlights: ==word== to <mark class="accent-highlight">word</mark>
  const processedContent = content.replace(/==([^=]+)==/g, '<mark class="accent-highlight">$1</mark>');

  if (!mounted) {
    return <div className="loading-markdown">Loading documentation...</div>;
  }

  const highlightStyle = theme === 'dark' ? materialDark : materialLight;

  return (
    <div className={`markdown-body-custom theme-${theme}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, className, children, ...props }) {
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
            // Handle documentation link routing mapping (e.g. ./getting-started.md -> /getting-started)
            let parsedHref = href || '';
            if (parsedHref.endsWith('.md')) {
              parsedHref = parsedHref.replace(/\.md$/, '').replace(/^\.\/?/, '');
              // Prefix with docs root
              parsedHref = `/docs/${parsedHref}`;
            }
            return (
              <a href={parsedHref} className="link-custom">
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            // Fallback for placeholder image or clean rendering
            const cleanSrc = src === '/docs/placeholder.jpg' ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' : src;
            return (
              <span className="img-container-custom">
                <img src={cleanSrc} alt={alt || 'Image Documentation'} className="img-custom" />
                {alt && <span className="img-caption">{alt}</span>}
              </span>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
