import { NextResponse } from 'next/server';
import { getAllDocsList, createNewDoc } from '@/lib/docs';

export async function GET() {
  try {
    const docs = getAllDocsList();
    return NextResponse.json(docs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Page creation is disabled.' },
    { status: 403 }
  );
}
