import { NextResponse } from 'next/server';
import { createPasswordRequest, findUserByEmail } from '@/lib/password-requests';

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();
    console.log('[API reset-request] Incoming request for email:', email);

    if (!email || !newPassword || String(newPassword).length < 6) {
      console.log('[API reset-request] Validation failed for email:', email);
      return NextResponse.json(
        { error: 'Please provide a valid email and a new password (at least 6 characters).' },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(String(email));
    console.log('[API reset-request] findUserByEmail returned:', user ? user.id : 'null');

    if (!user) {
      console.log('[API reset-request] User not found for email:', email);
      return NextResponse.json(
        { error: `User with email '${email}' not found. Please check the email address.` },
        { status: 404 }
      );
    }

    const request = await createPasswordRequest({
      userId: user.id,
      email: user.email,
      newPassword: String(newPassword),
    });

    const { supabase } = await import('@/lib/supabase');
    await supabase.from('notifications').insert([{
      type: 'system_alert',
      message: `Password change request submitted by ${user.email}`
    }]);

    return NextResponse.json({ success: true, requestId: request.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 500 });
  }
}
