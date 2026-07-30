'use client';

import { useState } from 'react';
import styles from './admin.module.css';

export default function AdminClient({ 
  initialPending, 
  initialApproved, 
  initialRejected, 
  initialSuspended 
}: { 
  initialPending: any[], 
  initialApproved: any[],
  initialRejected: any[],
  initialSuspended: any[]
}) {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'suspended'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAction = async (user: any, action: string) => {
    let payload: any = { userId: user.id, action };

    if (action === 'approve' || action === 'reactivate') {
      const days = prompt('Enter number of days for expiry (e.g. 30, 90) or leave blank for no expiry:', '30');
      if (days) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(days));
        payload.expiryDate = d.toISOString();
      }
      
      const limit = prompt('Adjust Question Limit (or keep as is):', user.question_limit);
      if (limit) payload.questionLimit = parseInt(limit);
    } else if (action === 'change_expiry') {
      const days = prompt('Enter NEW number of days for expiry from today (or leave blank to remove restriction):', '30');
      if (days) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(days));
        payload.expiryDate = d.toISOString();
      } else {
        payload.expiryDate = null;
      }
    } else if (action === 'change_limit') {
      const limit = prompt('Enter new question limit:', user.question_limit);
      if (!limit) return;
      payload.questionLimit = parseInt(limit);
    } else if (action === 'reset_submission') {
      if (!confirm("Are you sure you want to reset this user's submission? This will clear their answers and let them review their assigned questions again.")) return;
    } else if (action === 'reset_password') {
      const newPassword = prompt('Enter the new password for this user:');
      if (!newPassword) return; // cancelled
      payload.newPassword = newPassword;
    } else if (action === 'delete') {
      if (!confirm('Are you sure you want to permanently delete this user?')) return;
    }

    const res = await fetch('/api/admin/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert(`User successfully updated!`);
      window.location.reload();
    } else {
      const data = await res.json();
      alert(`Action failed: ${data.error}`);
    }
  };

  const filterUsers = (users: any[]) => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(u => 
      u.full_name.toLowerCase().includes(lower) || 
      u.email.toLowerCase().includes(lower) || 
      (u.designation && u.designation.toLowerCase().includes(lower))
    );
  };

  const renderTable = (users: any[], currentTab: string) => {
    const filtered = filterUsers(users);
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email / Designation</th>
              <th>Status / Expiry</th>
              <th>Progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No users found in this category.</td></tr>
            )}
            {filtered.map(user => {
              const pct = user.question_limit > 0 ? (user.questions_completed / user.question_limit) * 100 : 0;
              return (
                <tr key={user.id}>
                  <td>
                    <strong>{user.full_name}</strong>
                  </td>
                  <td>
                    <div>{user.email}</div>
                    <div style={{ fontSize: '0.85rem', color: '#5f6368' }}>{user.designation}</div>
                  </td>
                  <td>
                    <span className={styles.badge} style={{ 
                      backgroundColor: user.status === 'approved' ? '#e6f4ea' : user.status === 'rejected' || user.status === 'suspended' ? '#fce8e6' : '#fef7e0',
                      color: user.status === 'approved' ? '#137333' : user.status === 'rejected' || user.status === 'suspended' ? '#c5221f' : '#b08d00'
                    }}>
                      {user.status.toUpperCase()}
                    </span>
                    {user.expiry_date && (
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                        Exp: {new Date(user.expiry_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{user.questions_completed} / {user.question_limit}</div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.btnGroup} style={{ flexWrap: 'wrap' }}>
                      {currentTab === 'pending' && (
                        <>
                          <button className={styles.acceptBtn} onClick={() => handleAction(user, 'approve')}>Approve</button>
                          <button className={styles.rejectBtn} onClick={() => handleAction(user, 'reject')}>Reject</button>
                        </>
                      )}
                      {currentTab === 'approved' && (
                        <>
                          <button className={styles.rejectBtn} onClick={() => handleAction(user, 'suspend')}>Suspend</button>
                          <button className={styles.actionBtn} style={{ background: '#f1f3f4', color: '#3c4043' }} onClick={() => handleAction(user, 'change_expiry')}>Edit Expiry</button>
                          <button className={styles.actionBtn} style={{ background: '#f1f3f4', color: '#3c4043' }} onClick={() => handleAction(user, 'change_limit')}>Edit Limit</button>
                          {user.has_submitted && (
                            <button className={styles.acceptBtn} style={{ background: '#3b82f6', color: 'white' }} onClick={() => handleAction(user, 'reset_submission')}>Reset Sub</button>
                          )}
                        </>
                      )}
                      {(currentTab === 'rejected' || currentTab === 'suspended') && (
                        <button className={styles.acceptBtn} onClick={() => handleAction(user, 'reactivate')}>Reactivate</button>
                      )}
                      <button className={styles.actionBtn} style={{ background: '#f1f3f4', color: '#3c4043' }} onClick={() => handleAction(user, 'reset_password')}>Reset Pwd</button>
                      <button className={styles.rejectBtn} style={{ background: 'transparent', border: '1px solid #c5221f', color: '#c5221f' }} onClick={() => handleAction(user, 'delete')}>Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className={styles.sectionTitle}>User Management</h2>
          <a href="/api/admin/export" className={styles.actionBtn} download>Export Responses CSV</a>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #dadce0', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <input 
            type="text" 
            placeholder="Search by name, email, designation..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #dadce0', borderRadius: '4px', flexGrow: 1 }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            style={{ padding: '0.5rem 1rem', border: 'none', background: tab === 'pending' ? 'var(--form-primary)' : 'transparent', color: tab === 'pending' ? 'white' : '#5f6368', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setTab('pending')}
          >Pending ({initialPending.length})</button>
          <button 
            style={{ padding: '0.5rem 1rem', border: 'none', background: tab === 'approved' ? 'var(--form-primary)' : 'transparent', color: tab === 'approved' ? 'white' : '#5f6368', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setTab('approved')}
          >Approved ({initialApproved.length})</button>
          <button 
            style={{ padding: '0.5rem 1rem', border: 'none', background: tab === 'suspended' ? 'var(--form-primary)' : 'transparent', color: tab === 'suspended' ? 'white' : '#5f6368', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setTab('suspended')}
          >Suspended ({initialSuspended.length})</button>
          <button 
            style={{ padding: '0.5rem 1rem', border: 'none', background: tab === 'rejected' ? 'var(--form-primary)' : 'transparent', color: tab === 'rejected' ? 'white' : '#5f6368', borderRadius: '4px', cursor: 'pointer' }}
            onClick={() => setTab('rejected')}
          >Rejected ({initialRejected.length})</button>
        </div>
      </div>

      {tab === 'pending' && renderTable(initialPending, 'pending')}
      {tab === 'approved' && renderTable(initialApproved, 'approved')}
      {tab === 'suspended' && renderTable(initialSuspended, 'suspended')}
      {tab === 'rejected' && renderTable(initialRejected, 'rejected')}
      
    </section>
  );
}
