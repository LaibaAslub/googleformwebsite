import { NextResponse } from 'next/server';
import { listPendingQuestionRequests, resolveQuestionRequest } from '@/lib/question-requests';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const requests = await listPendingQuestionRequests();

    // Enrich with user data (name, current limit)
    const userIds = [...new Set(requests.map(r => r.user_id).filter(Boolean))];
    let usersMap: Record<string, { full_name: string; question_limit: number; questions_completed: number }> = {};

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, question_limit, questions_completed')
        .in('id', userIds);

      (users || []).forEach(u => {
        usersMap[u.id] = {
          full_name: u.full_name || 'Unknown',
          question_limit: Number(u.question_limit || 0),
          questions_completed: Number(u.questions_completed || 0),
        };
      });
    }

    const enriched = requests.map(r => ({
      ...r,
      user_name: usersMap[r.user_id]?.full_name ?? 'Unknown',
      current_limit: usersMap[r.user_id]?.question_limit ?? 0,
      questions_completed: usersMap[r.user_id]?.questions_completed ?? 0,
    }));

    return NextResponse.json({ requests: enriched });
  } catch (error: any) {
    console.error('[admin/question-requests] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requestId, action, approvedCount } = body;

    if (!requestId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await resolveQuestionRequest({
      requestId,
      action: action as 'approve' | 'reject',
      approvedCount: approvedCount !== undefined ? Number(approvedCount) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[admin/question-requests] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
