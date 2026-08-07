import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken, setAuthCookie, signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['civil', 'criminal', 'family'] as const;
type Category = typeof VALID_CATEGORIES[number];

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { category } = await req.json();
    const cat = String(category || '').toLowerCase() as Category;

    if (!VALID_CATEGORIES.includes(cat)) {
      return NextResponse.json({ error: 'Invalid category. Must be civil, criminal, or family.' }, { status: 400 });
    }

    const userId = String(payload.userId);
    
    // Get user to see how many questions they need
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('question_limit, questions_completed')
      .eq('id', userId)
      .single();

    if (userError || !user) throw new Error('User not found');

    const limit = Number(user.question_limit || 0);

    // Admin hasn't configured a question limit for this user yet.
    // Return a clear error so the UI can show "please ask admin to set your limit".
    if (limit === 0) {
      return NextResponse.json(
        { error: 'Your account is approved but your administrator has not yet set your question limit. Please contact your administrator.' },
        { status: 400 }
      );
    }

    // Use lifetime-completed count from responses table for accuracy
    const { data: responsesData } = await supabase
      .from('responses')
      .select('question_id')
      .eq('user_id', userId);
    const lifetimeCompleted = new Set((responsesData || []).map((r: any) => r.question_id).filter(Boolean)).size;

    const remaining = Math.max(limit - lifetimeCompleted, 0);

    if (remaining > 0) {
      // Unassign any previously assigned questions from a different category
      // so we start fresh with the newly chosen category
      const { data: previouslyAssigned } = await supabase
        .from('questions')
        .select('id')
        .eq('assigned_to', userId)
        .eq('status', 'assigned');

      if (previouslyAssigned && previouslyAssigned.length > 0) {
        const prevIds = previouslyAssigned.map((q: any) => q.id);
        await supabase
          .from('questions')
          .update({ status: 'available', assigned_to: null, assigned_at: null })
          .in('id', prevIds);
      }

      // Assign questions from the chosen category
      const { data: available } = await supabase
        .from('questions')
        .select('id')
        .eq('status', 'available')
        .ilike('category', cat)
        .limit(remaining);

      const ids = (available || []).map((q: any) => q.id);
      if (ids.length > 0) {
        const { error: assignError } = await supabase
          .from('questions')
          .update({
            status: 'assigned',
            assigned_to: userId,
            assigned_at: new Date().toISOString(),
          })
          .in('id', ids);

        if (assignError) throw new Error(assignError.message);
      }

      if (ids.length === 0) {
        return NextResponse.json(
          { error: `No questions available in the "${cat}" category at this time. Please choose a different category or contact your administrator.` },
          { status: 400 }
        );
      }
    }

    // Re-issue token (category is no longer persisted in users table, so we just sign a standard user token)
    const newToken = await signToken({ userId: payload.userId, email: payload.email, role: 'user' });
    await setAuthCookie(newToken);

    return NextResponse.json({ success: true, redirect: '/review' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
