import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  await clearSession();
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL('/admin/login', origin));
}
