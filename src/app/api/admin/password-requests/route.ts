import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import {
  listPendingPasswordRequests,
  resolvePasswordRequest,
} from '@/lib/password-requests';

async function requireAdmin() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const requests = await listPendingPasswordRequests();
    return NextResponse.json({ requests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { requestId, action, source } = await req.json();
    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await resolvePasswordRequest({
      requestId: Number(requestId),
      action,
      source,
    });

    const requests = await listPendingPasswordRequests();
    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process request' }, { status: 500 });
  }
}
