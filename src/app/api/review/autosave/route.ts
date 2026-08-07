import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { questionId, category, rating, comment, newAnswer } = await req.json();

  if (!questionId) {
    return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });
  }

  // Upsert into review_progress
  const { error } = await supabase
    .from('review_progress')
    .upsert({
      user_id: payload.userId,
      question_id: questionId,
      category: category || null,
      rating: rating || null,
      user_comment: comment || '',
      new_answer: newAnswer || '',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,question_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
