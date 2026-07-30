import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

function isExpired(expiryDate?: string | null) {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) return false;
  return new Date().getTime() > expiry.getTime();
}

async function getLifetimeCompletedQuestions(userId: string) {
  const { data } = await supabase
    .from('responses')
    .select('question_id')
    .eq('user_id', userId);

  return new Set((data || []).map(r => r.question_id).filter(Boolean)).size;
}
export async function POST(req: Request) {
  try {
    const { fullName, designation, email, password, questionLimit } = await req.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!fullName || !designation || !normalizedEmail || !password) {
      return NextResponse.json({ error: 'All required fields must be provided.' }, { status: 400 });
    }

    const parsedQuestionLimit = parseInt(String(questionLimit), 10);
    const requestedQuestionLimit = Number.isNaN(parsedQuestionLimit) || parsedQuestionLimit <= 0
      ? 10
      : parsedQuestionLimit;

    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id, full_name, email, status, expiry_date, question_limit, questions_completed')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (existingUser) {
      if (!isExpired(existingUser.expiry_date)) {
        return NextResponse.json(
          { error: 'An active account already exists with this email address.' },
          { status: 400 }
        );
      }

      const lifetimeCompleted = await getLifetimeCompletedQuestions(existingUser.id);
      const currentLimit = Math.max(Number(existingUser.question_limit || 0), lifetimeCompleted);
      const cumulativeLimit = currentLimit + requestedQuestionLimit;

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          designation,
          password_hash: passwordHash,
          question_limit: cumulativeLimit,
          questions_completed: lifetimeCompleted,
          has_submitted: false,
          status: 'pending',
        })
        .eq('id', existingUser.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await supabase.from('admin_logs').insert([{
        action_type: 'expired_user_signin_request',
        target_user_id: existingUser.id,
        details: `Expired account submitted a new sign-in request: ${fullName} (${normalizedEmail})`,
      }]);

      await supabase.from('notifications').insert([
        { type: 'new_user', message: `Expired account sign-in request: ${fullName} (${normalizedEmail})` }
      ]);

      return NextResponse.json({
        success: true,
        message: 'Your sign-in request has been submitted successfully. Please wait for the administrator to approve it.',
      });
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          full_name: fullName,
          designation,
          email: normalizedEmail,
          password_hash: passwordHash,
          question_limit: requestedQuestionLimit,
          status: 'pending'
        }
      ]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await supabase.from('notifications').insert([
      { type: 'new_user', message: `New registration request: ${fullName} (${normalizedEmail})` }
    ]);

    return NextResponse.json({ success: true, message: 'Your registration request has been submitted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}