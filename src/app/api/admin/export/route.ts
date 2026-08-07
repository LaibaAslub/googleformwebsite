import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

function csvEscape(value: unknown) {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await verifyToken(token);
  if (payload?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [
    { data: responses, error },
    { data: users },
  ] = await Promise.all([
    supabase
      .from('responses')
      .select(`
        id,
        user_id,
        user_email,
        question_id,
        question_text,
        original_answer,
        reference,
        category,
        user_comment,
        rating,
        new_answer,
        submitted_at
      `)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, email, full_name, designation'),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byId = new Map((users || []).map(u => [u.id, u]));
  const byEmail = new Map((users || []).map(u => [u.email, u]));

  // Keep existing columns and add user_name + user_designation
  const csvHeaders = [
    'id',
    'user_email',
    'user_name',
    'user_designation',
    'question_id',
    'question_text',
    'original_answer',
    'reference',
    'category',
    'user_comment',
    'rating',
    'new_answer',
    'submitted_at',
  ];

  const rows = (responses || []).map((r) => {
    const user = (r.user_id && byId.get(r.user_id)) || byEmail.get(r.user_email) || null;
    return [
      r.id,
      r.user_email || '',
      csvEscape(user?.full_name || ''),
      csvEscape(user?.designation || ''),
      r.question_id,
      csvEscape(r.question_text),
      csvEscape(r.original_answer),
      csvEscape(r.reference),
      csvEscape(r.category),
      csvEscape(r.user_comment),
      csvEscape(r.rating),
      csvEscape(r.new_answer),
      csvEscape(r.submitted_at),
    ];
  });

  const csvContent = [csvHeaders.join(','), ...rows.map(r => r.join(','))].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="responses_export.csv"',
    },
  });
}
