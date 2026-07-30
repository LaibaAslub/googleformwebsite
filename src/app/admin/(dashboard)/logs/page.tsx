import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type LogUser = {
  id: string;
  full_name: string;
  email: string;
  designation?: string | null;
  status?: string | null;
};

function formatLogDetails(details: string | null): string {
  if (!details) return '—';

  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === 'object') {
      const email = parsed.user_email || parsed.email;
      if (parsed.kind === 'password_change_request' || parsed.type === 'password_reset_request') {
        const status = parsed.status ? ` (${parsed.status})` : '';
        return email
          ? `Password change request for ${email}${status}`
          : JSON.stringify(parsed, null, 2);
      }
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // plain text details
  }

  return details;
}

export default async function LogsPage() {
  const token = (await cookies()).get('auth-token')?.value;
  if (!token) redirect('/admin/login');
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') redirect('/admin/login');

  const { data: logs } = await supabase
    .from('admin_logs')
    .select('id, action_type, target_user_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  const safeLogs = logs || [];
  const userIds = Array.from(
    new Set(safeLogs.map(l => l.target_user_id).filter(Boolean))
  ) as string[];

  let userMap: Record<string, LogUser> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email, designation, status')
      .in('id', userIds);

    userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
  }

  return (
    <div className="animateFadeIn">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Audit Logs</h1>
        <p style={{ color: '#4b5563' }}>Complete record of all administrative actions.</p>
      </div>

      <div className="tableContainer">
        <table className="table auditLogsTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Action</th>
              <th>User Details</th>
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {!safeLogs.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No audit logs yet.
                </td>
              </tr>
            )}
            {safeLogs.map((log) => {
              const user = log.target_user_id ? userMap[log.target_user_id] : null;
              return (
                <tr key={log.id}>
                  <td style={{ color: '#6b7280', fontSize: '0.85rem', verticalAlign: 'top' }}>#{log.id}</td>
                  <td className="auditLogsActionCell">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: log.action_type.includes('approve')
                          ? '#dcfce7'
                          : log.action_type.includes('reject') || log.action_type.includes('delete')
                            ? '#fee2e2'
                            : '#eef2ff',
                        color: log.action_type.includes('approve')
                          ? '#166534'
                          : log.action_type.includes('reject') || log.action_type.includes('delete')
                            ? '#b91c1c'
                            : '#3730a3',
                      }}
                    >
                      {log.action_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="auditLogsUserCell">
                    {user ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{user.full_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', wordBreak: 'break-word' }}>{user.email}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>
                          {[user.designation, user.status].filter(Boolean).join(' · ') || 'User'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>
                        {log.target_user_id ? 'User unavailable' : '—'}
                      </span>
                    )}
                  </td>
                  <td className="auditLogsDetailsCell">
                    {formatLogDetails(log.details)}
                  </td>
                  <td className="auditLogsTimestampCell">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
