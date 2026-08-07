import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getPendingRequestForUser } from '@/lib/question-requests';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getLifetimeCompletedQuestions(userId: string) {
  const { data } = await supabase
    .from('responses')
    .select('question_id')
    .eq('user_id', userId);

  return new Set((data || []).map(r => r.question_id).filter(Boolean)).size;
}


export async function GET() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = String(payload.userId);

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('status, expiry_date, questions_completed, question_limit, has_submitted')
    .eq('id', userId)
    .single();
    
  if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

  const lifetimeCompleted = await getLifetimeCompletedQuestions(userId);
  let questionsCompleted = lifetimeCompleted;
  const questionLimit = Number(user.question_limit || 0);
  if (questionsCompleted !== Number(user.questions_completed || 0) || questionLimit !== Number(user.question_limit || 0)) {
    await supabase
      .from('users')
      .update({
        questions_completed: questionsCompleted,
        question_limit: questionLimit,
        has_submitted: questionLimit > 0 && questionsCompleted >= questionLimit,
      })
      .eq('id', userId);
  }

  const debugBase = {
    userId,
    status: user.status,
    expiry_date: user.expiry_date,
    question_limit: questionLimit,
    questions_completed: questionsCompleted,
    has_submitted: user.has_submitted,
  };

  if (user.status !== 'approved') {
    console.log('[review questions decision]', { ...debugBase, assignedQuestions: 0, destination: 'blocked: not approved' });
    return NextResponse.json({ error: 'Not approved' }, { status: 401 });
  }
  if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
    console.log('[review questions decision]', { ...debugBase, assignedQuestions: 0, destination: 'blocked: expired' });
    return NextResponse.json({ error: 'Account expired' }, { status: 401 });
  }


  let { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, existing_answer, category, reference')
    .eq('assigned_to', userId)
    .eq('status', 'assigned')
    .order('id', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const assignedQuestions = questions || [];
  const remainingQuestions = Math.max(questionLimit - questionsCompleted, 0);

  const isComplete = questionLimit > 0 && questionsCompleted >= questionLimit;
  
  let hasPendingRequest = false;
  if (isComplete) {
    const pendingReq = await getPendingRequestForUser(userId);
    hasPendingRequest = !!pendingReq;
  }

  if (assignedQuestions.length === 0 && isComplete) {
    console.log('[review questions decision]', {
      ...debugBase,
      questions_completed: questionsCompleted,
      assignedQuestions: 0,
      destination: 'thank-you',
    });
    return NextResponse.json(
      {
        completed: true,
        questions: [],
        progress: {
          status: user.status,
          expiry_date: user.expiry_date,
          questionsCompleted,
          questionLimit,
          hasSubmitted: true,
          hasPendingRequest,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
  
  const { data: progressData } = await supabase
    .from('review_progress')
    .select('*')
    .eq('user_id', userId);

  const savedProgress = progressData || [];
  
  // Redirect to category selection when:
  //  1. User has no assigned questions currently AND
  //  2. They have NOT yet completed their quota (including brand-new users where questionLimit === 0)
  // This covers first-time users (questionLimit=0 → remainingQuestions=0 but isComplete is also false)
  // and returning users whose assigned batch was cleared after a new request.
  if (!isComplete && assignedQuestions.length === 0) {
    console.log('[review questions decision]', {
      ...debugBase,
      questions_completed: questionsCompleted,
      assignedQuestions: 0,
      destination: 'select-category (needsCategory)',
    });
    return NextResponse.json(
      { needsCategory: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const destination = assignedQuestions.length > 0 ? 'questions' : 'no-questions-assigned';
  console.log('[review questions decision]', {
    ...debugBase,
    questions_completed: questionsCompleted,
    assignedQuestions: assignedQuestions.length,
    destination,
  });

  return NextResponse.json(
    {
      questions: assignedQuestions,
      savedProgress,
      completed: false,
      progress: {
        status: user.status,
        expiry_date: user.expiry_date,
        questionsCompleted,
        questionLimit,
        hasSubmitted: questionLimit > 0 && questionsCompleted >= questionLimit,
        hasPendingRequest,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}