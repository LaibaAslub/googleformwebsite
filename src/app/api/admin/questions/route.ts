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

// POST: Create new question
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { question_text, existing_answer, category, reference } = await req.json();
  if (!question_text || !existing_answer) {
    return NextResponse.json({ error: 'question_text and existing_answer are required' }, { status: 400 });
  }

  const { error } = await supabase.from('questions').insert({
    question_text,
    existing_answer,
    category: category || 'General Law',
    reference: reference || null,
    status: 'available',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PUT: Update existing question
export async function PUT(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, question_text, existing_answer, category, reference } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('questions').update({
    question_text, existing_answer, category, reference
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE: Delete a question
export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // Reset assigned user's question tracking if needed
  await supabase.from('review_progress').delete().eq('question_id', id);
  
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
