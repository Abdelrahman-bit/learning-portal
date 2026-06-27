'use client';

import { useEffect, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid configurations
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
      fontFamily: 'var(--font-sans, "Inter", sans-serif)',
      primaryColor: '#00f2fe',
      primaryTextColor: '#fff',
      lineColor: '#5c6b73',
      secondaryColor: '#4f46e5',
      tertiaryColor: '#1e1b4b',
    }
  });
}

interface MermaidRendererProps {
  chart: string;
  theme?: 'dark' | 'light';
}

export default function MermaidRenderer({ chart, theme = 'dark' }: MermaidRendererProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;
    const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 11)}`;

    // Re-initialize theme dynamically based on system/app theme
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    });

    const renderChart = async () => {
      try {
        setError(null);
        // Clean the chart input of excess empty space/lines
        const cleanChart = chart.trim();
        if (!cleanChart) return;

        const { svg: renderedSvg } = await mermaid.render(uniqueId, cleanChart);
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.warn('Mermaid rendering error: ', err);
        if (isMounted) {
          setError('Could not render diagram. Please verify Mermaid syntax.');
        }
        
        // Remove the temporary element created by mermaid renderer in the document body
        const tempEl = document.getElementById(uniqueId);
        if (tempEl) {
          tempEl.remove();
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, theme, isClient]);

  if (!isClient) {
    return (
      <div className="mermaid-placeholder animate-pulse">
        Loading Diagram...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mermaid-error">
        <p className="error-title">⚠️ Mermaid Render Error</p>
        <pre className="error-code">{error}</pre>
        <pre className="raw-chart">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-placeholder">
        Compiling Diagram...
      </div>
    );
  }

  return (
    <div 
      className="mermaid-svg-container"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
}
