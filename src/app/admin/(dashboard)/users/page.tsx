import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import UsersClient from './UsersClient';
import { hydrateUsersWithQuestionProgress } from '@/lib/question-progress';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) {
    redirect('/admin/login');
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    redirect('/admin/login');
  }

  const [
    { data: users, error },
    { data: responses },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, password_hash, full_name, designation, status, question_limit, questions_completed, expiry_date, has_submitted, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('responses')
      .select('user_id, question_id'),
  ]);

  if (error) {
    console.error('Error fetching users:', error);
  }

  const usersWithProgress = hydrateUsersWithQuestionProgress(users || [], responses || []);

  return <UsersClient users={usersWithProgress} />;
}
