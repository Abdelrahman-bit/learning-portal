import { NextResponse } from 'next/server';
import { getDocData, saveDocData, deleteDocFile } from '@/lib/docs';

interface RouteParams {
  params: {
    slug: string[];
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const slugParts = params.slug;
    if (!slugParts || slugParts.length === 0) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    const doc = getDocData(slugParts);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch document' }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Page editing is disabled.' },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Page deletion is disabled.' },
    { status: 403 }
  );
}
