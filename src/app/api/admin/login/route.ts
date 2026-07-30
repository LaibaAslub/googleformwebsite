import { NextResponse } from 'next/server';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = await signToken({ role: 'admin' });
    await setAuthCookie(token);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
