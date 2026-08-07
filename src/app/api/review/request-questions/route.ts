import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createQuestionRequest } from '@/lib/question-requests';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || !payload.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = String(payload.userId);

    const body = await req.json();
    const { requestedCount } = body;
    const count = Number(requestedCount);

    if (isNaN(count) || count <= 0) {
      return NextResponse.json({ error: 'Invalid requested count' }, { status: 400 });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('status, expiry_date, email')
      .eq('id', userId)
      .single();
      
    if (userError || !user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    if (user.status !== 'approved') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 401 });
    }

    if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
      return NextResponse.json({ error: 'Account expired. Cannot request new questions.' }, { status: 403 });
    }

    const request = await createQuestionRequest({
      userId,
      email: user.email,
      requestedCount: count,
    });

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    console.error('[request-questions] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to request questions' }, { status: 500 });
  }
}
