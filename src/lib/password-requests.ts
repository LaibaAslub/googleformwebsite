import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export type PasswordRequest = {
  id: number;
  user_id: string;
  user_email: string;
  requested_password: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  created_at: string;
  source: 'table' | 'log';
};

const LOG_PENDING = 'password_change_request';
const LOG_APPROVED = 'password_change_approved';
const LOG_REJECTED = 'password_change_rejected';

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('not found in schema')
  );
}

function parseLogDetails(details: string | null): {
  user_email?: string;
  email?: string;
  requested_password?: string;
  status?: string;
} | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return null;
  }
  return null;
}

async function listFromTable(): Promise<{ rows: PasswordRequest[]; missing: boolean }> {
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('id, user_id, user_email, requested_password, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return { rows: [], missing: true };
    throw new Error(error.message);
  }

  return {
    rows: (data || []).map((row) => ({ ...row, source: 'table' as const })),
    missing: false,
  };
}

async function listFromLogs(): Promise<PasswordRequest[]> {
  const { data, error } = await supabase
    .from('admin_logs')
    .select('id, target_user_id, details, created_at, action_type')
    .in('action_type', [LOG_PENDING, 'password_reset_request'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || [])
    .map((row) => {
      const details = parseLogDetails(row.details);
      // Structured pending request (current + legacy shapes)
      if (details?.requested_password) {
        const email = details.user_email || details.email;
        const status = details.status || 'pending';
        if (!email || status !== 'pending') return null;
        return {
          id: row.id,
          user_id: row.target_user_id,
          user_email: email,
          requested_password: details.requested_password,
          status: 'pending' as const,
          created_at: row.created_at,
          source: 'log' as const,
        };
      }
      return null;
    })
    .filter(Boolean) as PasswordRequest[];
}

export async function listPendingPasswordRequests(): Promise<PasswordRequest[]> {
  const { rows: tableRows, missing } = await listFromTable();
  if (!missing && tableRows.length > 0) return tableRows;

  const logRows = await listFromLogs();

  // Prefer dedicated table when available; still surface legacy/fallback log rows
  if (!missing) {
    const tableEmails = new Set(tableRows.map((r) => r.user_email.toLowerCase()));
    const extras = logRows.filter((r) => !tableEmails.has(r.user_email.toLowerCase()));
    return [...tableRows, ...extras];
  }

  return logRows;
}

async function clearPendingForUser(userId: string, email: string) {
  // Try clearing from dedicated table — ignore errors if table is missing
  try {
    await supabase
      .from('password_reset_requests')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'pending');
  } catch (e) {
    console.log('[password-requests] clearPendingForUser table delete skipped:', e);
  }

  // Also clear any fallback log-based pending entries
  try {
    const { data: logs } = await supabase
      .from('admin_logs')
      .select('id, details')
      .eq('action_type', LOG_PENDING)
      .eq('target_user_id', userId);

    for (const log of logs || []) {
      const details = parseLogDetails(log.details);
      if (!details) continue;
      if ((details.user_email || email).toLowerCase() === email.toLowerCase()) {
        await supabase.from('admin_logs').delete().eq('id', log.id);
      }
    }
  } catch (e) {
    console.log('[password-requests] clearPendingForUser log cleanup skipped:', e);
  }
}

export async function createPasswordRequest(input: {
  userId: string;
  email: string;
  newPassword: string;
}): Promise<PasswordRequest> {
  const { userId, email, newPassword } = input;

  console.log('[password-requests] Creating request for:', email, 'userId:', userId);

  await clearPendingForUser(userId, email);

  // Attempt 1: Insert into dedicated password_reset_requests table
  const payload = {
    user_id: userId,
    user_email: email,
    requested_password: newPassword,
    status: 'pending',
  };

  const { data, error } = await supabase
    .from('password_reset_requests')
    .insert([payload])
    .select('id, user_id, user_email, requested_password, status, created_at')
    .maybeSingle();

  console.log('[password-requests] Table insert result:', { data, error: error?.message, code: error?.code });

  if (!error && data) {
    // Success via dedicated table
    await supabase.from('admin_logs').insert([{
      action_type: LOG_PENDING,
      target_user_id: userId,
      details: JSON.stringify({
        kind: 'password_change_request',
        user_email: email,
        requested_password: newPassword,
        status: 'pending',
      }),
    }]);

    await supabase.from('notifications').insert([{
      type: 'system_alert',
      message: `Password change request from ${email}`,
      is_read: false,
    }]);

    console.log('[password-requests] Request created via table, id:', data.id);
    return { ...data, source: 'table' };
  }

  // If the error is NOT a missing-table error, throw it
  if (error && !isMissingTableError(error)) {
    console.error('[password-requests] Table insert failed with unexpected error:', error.message);
    throw new Error(error.message);
  }

  console.log('[password-requests] Table missing or unavailable, using admin_logs fallback');

  // Attempt 2: Fallback — store structured request in admin_logs
  const details = JSON.stringify({
    kind: 'password_change_request',
    user_email: email,
    requested_password: newPassword,
    status: 'pending',
  });

  const { data: logRow, error: logError } = await supabase
    .from('admin_logs')
    .insert([{
      action_type: LOG_PENDING,
      target_user_id: userId,
      details,
    }])
    .select('id, target_user_id, details, created_at')
    .maybeSingle();

  console.log('[password-requests] Log fallback result:', { logRow, logError: logError?.message });

  if (logError || !logRow) {
    console.error('[password-requests] Log fallback also failed:', logError?.message);
    throw new Error(logError?.message || 'Failed to save password change request');
  }

  await supabase.from('notifications').insert([{
    type: 'system_alert',
    message: `Password change request from ${email}`,
    is_read: false,
  }]);

  console.log('[password-requests] Request created via log fallback, id:', logRow.id);

  return {
    id: logRow.id,
    user_id: logRow.target_user_id,
    user_email: email,
    requested_password: newPassword,
    status: 'pending',
    created_at: logRow.created_at,
    source: 'log',
  };
}

async function getRequestById(requestId: number, sourceHint?: 'table' | 'log'): Promise<PasswordRequest | null> {
  if (sourceHint !== 'log') {
    const { data, error } = await supabase
      .from('password_reset_requests')
      .select('id, user_id, user_email, requested_password, status, created_at')
      .eq('id', requestId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!error && data) return { ...data, source: 'table' };
    if (error && !isMissingTableError(error)) throw new Error(error.message);
  }

  const { data: logRow, error: logError } = await supabase
    .from('admin_logs')
    .select('id, target_user_id, details, created_at, action_type')
    .eq('id', requestId)
    .in('action_type', [LOG_PENDING, 'password_reset_request'])
    .maybeSingle();

  if (logError) throw new Error(logError.message);
  if (!logRow) return null;

  const details = parseLogDetails(logRow.details);
  const email = details?.user_email || details?.email;
  if (!details?.requested_password || !email) return null;
  if (details.status && details.status !== 'pending') return null;

  return {
    id: logRow.id,
    user_id: logRow.target_user_id,
    user_email: email,
    requested_password: details.requested_password,
    status: 'pending',
    created_at: logRow.created_at,
    source: 'log',
  };
}

export async function resolvePasswordRequest(input: {
  requestId: number;
  action: 'approve' | 'reject';
  source?: 'table' | 'log';
}): Promise<{ success: true }> {
  const { requestId, action, source } = input;
  const resetReq = await getRequestById(requestId, source);
  if (!resetReq) throw new Error('Request not found');

  if (action === 'approve') {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(resetReq.requested_password, salt);
    const { error: userError } = await supabase
      .from('users')
      .update({ password_hash })
      .eq('id', resetReq.user_id);

    if (userError) throw new Error(userError.message);
  }

  if (resetReq.source === 'table') {
    const { error: updateError } = await supabase
      .from('password_reset_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: updateError } = await supabase
      .from('admin_logs')
      .update({
        action_type: action === 'approve' ? LOG_APPROVED : LOG_REJECTED,
        details: JSON.stringify({
          kind: 'password_change_request',
          user_email: resetReq.user_email,
          requested_password: resetReq.requested_password,
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
        }),
      })
      .eq('id', requestId);

    if (updateError) throw new Error(updateError.message);
  }

  await supabase.from('admin_logs').insert([{
    action_type: action === 'approve' ? LOG_APPROVED : LOG_REJECTED,
    target_user_id: resetReq.user_id,
    details: `${action === 'approve' ? 'Approved' : 'Rejected'} password change for ${resetReq.user_email}`,
  }]);

  await supabase.from('notifications').insert([{
    type: action === 'approve' ? 'user_approved' : 'user_rejected',
    message: `Password change ${action === 'approve' ? 'approved' : 'rejected'} for ${resetReq.user_email}`,
    is_read: false,
  }]);

  return { success: true };
}

export async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();

  const { data: exact } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', email.trim())
    .maybeSingle();

  if (exact) return exact;

  const { data: caseInsensitive } = await supabase
    .from('users')
    .select('id, email, full_name')
    .ilike('email', normalized)
    .maybeSingle();

  return caseInsensitive || null;
}
