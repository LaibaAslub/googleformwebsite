import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function getLifetimeCompletedQuestions(userId: string) {
  const { data } = await supabase
    .from('responses')
    .select('question_id')
    .eq('user_id', userId);

  return new Set((data || []).map(r => r.question_id).filter(Boolean)).size;
}
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { responses } = await req.json();
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const userId = String(payload.userId);

    const { data: user } = await supabase
      .from('users')
      .select('email, questions_completed, question_limit')
      .eq('id', userId)
      .single();

    const userEmail = user?.email || payload.email || 'unknown@company.com';

    const responsesToInsert = responses.map((r: any) => ({
      user_id: userId,
      user_email: userEmail,
      question_id: r.question_id,
      question_text: r.question_text,
      original_answer: r.original_answer,
      reference: r.reference || null,
      category: r.category || null,
      user_comment: r.user_comment,
      rating: r.rating,
      new_answer: r.new_answer,
    }));

    const { error: insertError } = await supabase
      .from('responses')
      .insert(responsesToInsert);

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    const questionIds = responses.map((r: any) => r.question_id);
    if (questionIds.length > 0) {
      await supabase
        .from('questions')
        .update({ status: 'completed' })
        .in('id', questionIds);
    }

    const lifetimeCompleted = await getLifetimeCompletedQuestions(userId);
    const nextCompleted = lifetimeCompleted;
    const questionLimit = Number(user?.question_limit || 0);

    await supabase
      .from('users')
      .update({
        questions_completed: nextCompleted,
        has_submitted: questionLimit > 0 && nextCompleted >= questionLimit,
      })
      .eq('id', userId);

    await supabase
      .from('review_progress')
      .delete()
      .eq('user_id', userId);

    await supabase.from('notifications').insert([
      { type: 'review_submission', message: `Review submitted by ${userEmail} (${responses.length} questions)` },
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}