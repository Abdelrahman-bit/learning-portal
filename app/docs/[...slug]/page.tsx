import { getDocData, getAllDocsList } from '@/lib/docs';
import DocClientView from '@/components/DocClientView';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface DocPageProps {
  params: {
    slug: string[];
  };
}

// Statically pre-render all documentation pages at build time
export async function generateStaticParams() {
  const docs = getAllDocsList();
  
  return docs.map((doc) => ({
    slug: doc.slug.split('/'),
  }));
}

// Generate dynamic metadata for search engine optimization (SEO)
export async function generateMetadata({ params }: DocPageProps): Promise<Metadata> {
  const doc = getDocData(params.slug);
  if (!doc) {
    return {
      title: 'Document Not Found - Portal',
    };
  }
  return {
    title: `${doc.title} | Learning Portal`,
    description: doc.description || `Read document: ${doc.title}`,
    openGraph: {
      title: doc.title,
      description: doc.description || `Read document: ${doc.title}`,
    }
  };
}

export default function DocPage({ params }: DocPageProps) {
  const doc = getDocData(params.slug);
  
  if (!doc) {
    notFound();
  }

  return <DocClientView initialDoc={doc} />;
}
