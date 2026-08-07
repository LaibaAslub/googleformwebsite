import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, password_hash, status, expiry_date, question_limit, questions_completed, has_submitted')
      .ilike('email', normalizedEmail)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const debugBase = {
      userId: user.id,
      status: user.status,
      expiry_date: user.expiry_date,
      question_limit: user.question_limit,
      questions_completed: user.questions_completed,
      has_submitted: user.has_submitted,
    };

    if (user.status === 'pending') {
      console.log('[login redirect decision]', { ...debugBase, destination: 'blocked: pending' });
      return NextResponse.json({ error: 'Your registration request has not yet been approved by the administrator.' }, { status: 403 });
    }
    if (user.status === 'rejected') {
      console.log('[login redirect decision]', { ...debugBase, destination: 'blocked: rejected' });
      return NextResponse.json({ error: 'Your registration request has been rejected by the administrator.' }, { status: 403 });
    }
    if (user.status === 'suspended') {
      console.log('[login redirect decision]', { ...debugBase, destination: 'blocked: suspended' });
      return NextResponse.json({ error: 'Your account has been suspended. Please contact the administrator.' }, { status: 403 });
    }

    if (user.expiry_date) {
      const expiry = new Date(user.expiry_date);
      if (expiry < new Date()) {
        console.log('[login redirect decision]', { ...debugBase, destination: 'blocked: expired' });
        return NextResponse.json({ error: 'Your access has expired. Please contact the administrator.' }, { status: 403 });
      }
    }

    if (user.status === 'approved') {
      const token = await signToken({ userId: user.id, email: normalizedEmail, role: 'user' });
      await setAuthCookie(token);

      // Always route to /review — the review page itself will redirect to /select-category
      // if questions need to be assigned (needsCategory response from the API)
      console.log('[login redirect decision]', { ...debugBase, destination: '/review' });
      return NextResponse.json(
        { success: true, redirect: '/review' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    console.log('[login redirect decision]', { ...debugBase, destination: 'blocked: unknown status' });
    return NextResponse.json({ error: 'Unknown account status.' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}