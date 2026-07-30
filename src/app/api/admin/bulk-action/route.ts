import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

type TargetUser = {
  id: string;
  full_name: string;
  email: string;
  designation?: string | null;
  status?: string | null;
  expiry_date?: string | null;
  questions_completed?: number | null;
  question_limit?: number | null;
  has_submitted?: boolean | null;
};

// Optimized bulk assignment
async function syncMultipleUserQuestions(usersData: TargetUser[], globalTargetLimit: number) {
  // First, get all current assignments for these users
  const userIds = usersData.map(u => u.id);
  const { data: currentAssignments } = await supabase
    .from('questions')
    .select('id, assigned_to, status')
    .in('assigned_to', userIds)
    .eq('status', 'assigned');

  const assignmentsByUser: Record<string, any[]> = {};
  userIds.forEach(id => { assignmentsByUser[id] = []; });
  
  (currentAssignments || []).forEach(q => {
    if (q.assigned_to) {
      assignmentsByUser[q.assigned_to].push(q);
    }
  });

  // Determine how many new questions each user needs
  let totalNewQuestionsNeeded = 0;
  const userNeeds: Array<{ userId: string, diff: number, toUnassign: string[] }> = [];

  usersData.forEach(user => {
    const completed = user.questions_completed || 0;
    const targetAssignedCount = Math.max(globalTargetLimit - completed, 0);
    const assignedCount = assignmentsByUser[user.id].length;

    if (assignedCount < targetAssignedCount) {
      const diff = targetAssignedCount - assignedCount;
      totalNewQuestionsNeeded += diff;
      userNeeds.push({ userId: user.id, diff, toUnassign: [] });
    } else if (assignedCount > targetAssignedCount) {
      const diff = assignedCount - targetAssignedCount;
      const toUnassign = assignmentsByUser[user.id].slice(0, diff).map(q => q.id);
      userNeeds.push({ userId: user.id, diff: 0, toUnassign });
    }
  });

  // Bulk unassign
  const allToUnassign = userNeeds.flatMap(un => un.toUnassign);
  if (allToUnassign.length > 0) {
    await supabase
      .from('questions')
      .update({
        status: 'available',
        assigned_to: null,
        assigned_at: null,
      })
      .in('id', allToUnassign);
  }

  // Bulk assign new questions
  if (totalNewQuestionsNeeded > 0) {
    const { data: available } = await supabase
      .from('questions')
      .select('id')
      .eq('status', 'available')
      .limit(totalNewQuestionsNeeded);

    const shuffled = (available || []).sort(() => 0.5 - Math.random());
    
    // We can't do a single `.update().in()` because each user gets DIFFERENT question IDs.
    // However, if the `questions` table has many, we can use a bulk `upsert` or multiple `update` calls.
    // For simplicity and speed, we will do a Promise.all over user updates.
    
    let pointer = 0;
    const promises = [];
    
    for (const need of userNeeds) {
      if (need.diff > 0) {
        const toAssign = shuffled.slice(pointer, pointer + need.diff).map(q => q.id);
        pointer += need.diff;
        
        if (toAssign.length > 0) {
          promises.push(
            supabase
              .from('questions')
              .update({
                status: 'assigned',
                assigned_to: need.userId,
                assigned_at: new Date().toISOString(),
              })
              .in('id', toAssign)
          );
        }
      }
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
}

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (payload?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userIds, action, expiryDate, questionLimit } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'No users selected' }, { status: 400 });
    }

    if (action !== 'approve') {
      return NextResponse.json({ error: 'Only bulk approval is supported' }, { status: 400 });
    }
    
    if (!expiryDate) {
      return NextResponse.json({ error: 'Expiry date is required for approval' }, { status: 400 });
    }

    const requestedLimit = Number(questionLimit);
    if (Number.isNaN(requestedLimit) || requestedLimit <= 0) {
      return NextResponse.json({ error: 'Valid question limit is required' }, { status: 400 });
    }

    // Get all target users at once
    const { data: usersData, error: fetchError } = await supabase
      .from('users')
      .select('id, full_name, email, designation, status, expiry_date, questions_completed, question_limit, has_submitted')
      .in('id', userIds);

    if (fetchError || !usersData) {
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Since they are all pending approvals, we assume their current question_limit is whatever we set globally,
    // or we just set it directly on the bulk update.
    
    // Perform bulk update on users table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: 'approved',
        expiry_date: expiryDate,
        question_limit: requestedLimit,
        has_submitted: false // usually false for new approvals
      })
      .in('id', userIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Bulk sync questions
    await syncMultipleUserQuestions(usersData, requestedLimit);

    // Bulk create admin logs
    const logs = usersData.map(u => ({
      action_type: 'bulk_approve',
      target_user_id: u.id,
      details: `Bulk approved user - ${u.full_name} (${u.email}). Expiry: ${new Date(expiryDate).toLocaleDateString()}, Limit: ${requestedLimit}`,
    }));
    await supabase.from('admin_logs').insert(logs);

    // Bulk create notifications
    const notifications = usersData.map(u => ({
      type: 'user_approved',
      message: `Approved user: ${u.full_name}`,
    }));
    await supabase.from('notifications').insert(notifications);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
