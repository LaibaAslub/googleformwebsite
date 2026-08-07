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
    const completed = Number(user.questions_completed || 0);
    const remaining = Math.max(limit - completed, 0);

    if (remaining > 0) {
      // Check already assigned to not over-assign
      const { data: assigned } = await supabase
        .from('questions')
        .select('id')
        .eq('assigned_to', userId)
        .eq('status', 'assigned');
        
      const alreadyAssignedCount = assigned ? assigned.length : 0;
      const countToAssign = remaining - alreadyAssignedCount;
      
      if (countToAssign > 0) {
        // Assign available questions
        const { data: available } = await supabase
          .from('questions')
          .select('id')
          .eq('status', 'available')
          .ilike('category', cat)
          .limit(countToAssign);
          
        const ids = (available || []).map(q => q.id);
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
