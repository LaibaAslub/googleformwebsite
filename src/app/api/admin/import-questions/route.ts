import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

async function requireAdmin() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// POST: import CSV/XLSX file
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

  const qIdx = headers.indexOf('question') !== -1 ? headers.indexOf('question') : headers.indexOf('question_text');
  const aIdx = headers.indexOf('answer') !== -1 ? headers.indexOf('answer') : headers.indexOf('existing_answer');
  const catIdx = headers.indexOf('category');
  const refIdx = headers.indexOf('reference') !== -1 ? headers.indexOf('reference') : headers.indexOf('references');

  if (qIdx === -1 || aIdx === -1) {
    return NextResponse.json({ error: 'CSV must have Question and Answer columns' }, { status: 400 });
  }

  const questionsToInsert = lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === ',' && !inQuotes) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());

    return {
      question_text: cols[qIdx]?.replace(/^"|"$/g, '') || '',
      existing_answer: cols[aIdx]?.replace(/^"|"$/g, '') || '',
      category: catIdx !== -1 ? (cols[catIdx]?.replace(/^"|"$/g, '') || 'General Law') : 'General Law',
      reference: refIdx !== -1 ? (cols[refIdx]?.replace(/^"|"$/g, '') || null) : null,
      status: 'available',
    };
  }).filter(q => q.question_text && q.existing_answer);

  if (questionsToInsert.length === 0) {
    return NextResponse.json({ error: 'No valid questions found in file' }, { status: 400 });
  }

  const { error } = await supabase.from('questions').insert(questionsToInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('notifications').insert([{
    type: 'import_completed',
    message: `Imported ${questionsToInsert.length} questions successfully.`
  }]);

  return NextResponse.json({ success: true, imported: questionsToInsert.length });
}
