'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, UserCheck, UserX, Clock, FileText, Search,
  ChevronLeft, ChevronRight, Download, Copy, X, ArrowUpDown, CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// Types
type User = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  designation: string;
  status: string;
  question_limit: number;
  questions_completed: number;
  expiry_date: string | null;
  has_submitted: boolean;
  created_at: string;
};

const PAGE_SIZE = 10;
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  approved: '#10b981',
  pending: '#f59e0b',
  rejected: '#ef4444',
  suspended: '#ef4444',
  expired: '#6b7280'
};

// Sub-components
const AnimatedCounter = ({ value }: { value: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const increment = Math.max(1, Math.floor(value / (duration / 16)));
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{count}</>;
};
function UsersClient({ users: initialUsers }: { users: User[] }) {
  // State for users data
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [loading, setLoading] = useState(true);

  // Fetch users from Supabase on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data as User[]);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);


  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [submissionFilter, setSubmissionFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);




  // Compute Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    return {
      total: users.length,
      active: users.filter(u => u.status === 'approved' && (!u.expiry_date || new Date(u.expiry_date) >= now)).length,
      pending: users.filter(u => u.status === 'pending').length,
      rejected: users.filter(u => u.status === 'rejected' || u.status === 'suspended').length,
      expired: users.filter(u => u.status === 'approved' && u.expiry_date && new Date(u.expiry_date) < now).length,
      submitted: users.filter(u => u.has_submitted).length,
      notSubmitted: users.filter(u => !u.has_submitted).length,
    };
  }, [users]);

  // Chart Data
  const statusData = useMemo(() => [
    { name: 'Active', value: metrics.active, color: STATUS_COLORS.active },
    { name: 'Pending', value: metrics.pending, color: STATUS_COLORS.pending },
    { name: 'Rejected', value: metrics.rejected, color: STATUS_COLORS.rejected },
    { name: 'Expired', value: metrics.expired, color: STATUS_COLORS.expired },
  ].filter(d => d.value > 0), [metrics]);

  const designationData = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach(u => {
      const desig = u.designation || 'Unknown';
      counts[desig] = (counts[desig] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
  }, [users]);


  const uniqueDesignations = useMemo(() => {
    return Array.from(new Set(users.map(u => u.designation).filter(Boolean)));
  }, [users]);

  // Filtering & Sorting
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.designation?.toLowerCase().includes(search.toLowerCase());

      const now = new Date();
      const isExpired = u.expiry_date && new Date(u.expiry_date) < now;
      const actualStatus = isExpired ? 'expired' : u.status;

      const matchesStatus = statusFilter === 'all' || actualStatus === statusFilter || (statusFilter === 'active' && actualStatus === 'approved');
      const matchesDesig = designationFilter === 'all' || u.designation === designationFilter;
      const matchesSub = submissionFilter === 'all' ||
        (submissionFilter === 'submitted' && u.has_submitted) ||
        (submissionFilter === 'not_submitted' && !u.has_submitted);

      return matchesSearch && matchesStatus && matchesDesig && matchesSub;
    });
  }, [users, search, statusFilter, designationFilter, submissionFilter]);

  const sortedUsers = useMemo(() => {
    const sortable = [...filteredUsers];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];

        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [filteredUsers, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const pagedUsers = sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, designationFilter, submissionFilter]);

  const handleSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Designation', 'Status', 'Question Limit', 'Completed', 'Progress', 'Has Submitted', 'Expiry Date', 'Created At'];
    const rows = sortedUsers.map(u => [
      u.id, u.full_name, u.email, u.designation, u.status, u.question_limit, u.questions_completed,
      `${Math.round((u.questions_completed / u.question_limit) * 100)}%`,
      u.has_submitted ? 'Yes' : 'No', u.expiry_date ? new Date(u.expiry_date).toLocaleString() : 'N/A', new Date(u.created_at).toLocaleString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.map(f => `"${f}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'users_export.csv';
    link.click();
  };

  const exportExcel = () => {
    const data = sortedUsers.map(u => ({
      ID: u.id,
      Name: u.full_name,
      Email: u.email,
      Designation: u.designation,
      Status: u.status,
      'Question Limit': u.question_limit,
      'Completed': u.questions_completed,
      'Progress': `${Math.round((u.questions_completed / u.question_limit) * 100)}%`,
      'Has Submitted': u.has_submitted ? 'Yes' : 'No',
      'Expiry Date': u.expiry_date ? new Date(u.expiry_date).toLocaleString() : 'N/A',
      'Created At': new Date(u.created_at).toLocaleString()
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users_export.xlsx");
  };

  const getStatusColor = (user: User) => {
    if (user.expiry_date && new Date(user.expiry_date) < new Date()) return STATUS_COLORS.expired;
    if (user.status === 'approved') return STATUS_COLORS.active;
    return STATUS_COLORS[user.status] || '#6b7280';
  };

  const getExpiryDisplay = (dateString: string | null) => {
    if (!dateString) return <span style={{ color: '#6b7280' }}>No expiry</span>;
    const d = new Date(dateString);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));

    const formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const displayString = `${formattedDate}, ${formattedTime}`;

    if (diff < 0) return <span style={{ color: '#ef4444', fontWeight: 600 }}>{displayString} (Expired)</span>;
    if (diff <= 7) return <span style={{ color: '#f59e0b', fontWeight: 600 }}>{displayString} (Exp. in {diff}d)</span>;
    return <span style={{ color: '#10b981' }}>{displayString}</span>;
  };

  if (loading) {
    return (
      <div className="pageContainer" style={{ padding: '2rem' }}>
        <div style={{ height: '40px', width: '200px', backgroundColor: '#e5e7eb', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: '100px', backgroundColor: '#e5e7eb', borderRadius: '12px', animation: 'pulse 2s infinite' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pageContainer" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="headerRow"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}
      >
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Users Directory</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Manage and monitor all platform users.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f3f4f6'} onMouseOut={e => e.currentTarget.style.background = '#fff'}>
            <Download size={16} /> CSV
          </button>
          <button onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#059669'} onMouseOut={e => e.currentTarget.style.background = '#10b981'}>
            <Download size={16} /> Excel
          </button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Users', value: metrics.total, icon: Users, color: '#4f46e5', bg: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
          { label: 'Active', value: metrics.active, icon: UserCheck, color: '#10b981', bg: 'linear-gradient(135deg, #34d399, #10b981)' },
          { label: 'Pending', value: metrics.pending, icon: Clock, color: '#f59e0b', bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)' },
          { label: 'Expiry Users', value: metrics.expired, icon: UserX, color: '#ef4444', bg: 'linear-gradient(135deg, #f87171, #ef4444)' },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="card"
            style={{
              background: card.bg, color: '#fff', display: 'flex', alignItems: 'center', gap: '16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: 'none', transition: 'transform 0.2s'
            }}
            whileHover={{ y: -5 }}
          >
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px' }}>
              <card.icon size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 500 }}>{card.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}><AnimatedCounter value={card.value} /></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}
      >
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem', color: '#374151' }}>User Status</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem', color: '#374151' }}>Top Designations</h3>
          <div style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={designationData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </motion.div>

      {/* Table Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', alignItems: 'center' }}
      >
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '200px' }}>
          <Search size={18} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 10px 8px 38px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none' }}
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', background: '#fff', fontSize: '0.875rem', width: '140px' }}>
          <option value="all">Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected / Suspended</option>
          <option value="expired">Expired</option>
        </select>

        <select value={designationFilter} onChange={e => setDesignationFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', background: '#fff', fontSize: '0.875rem', width: '150px', textOverflow: 'ellipsis' }}>
          <option value="all">Designations</option>
          {uniqueDesignations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={submissionFilter} onChange={e => setSubmissionFilter(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', background: '#fff', fontSize: '0.875rem', width: '140px' }}>
          <option value="all">Submissions</option>
          <option value="submitted">Submitted</option>
          <option value="not_submitted">Not Submitted</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="tableContainer"
        style={{ overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
      >
        <div style={{ overflowX: 'auto' }}>
          {sortedUsers.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: '#6b7280' }}>
              <Users size={48} style={{ opacity: 0.2, margin: '0 auto 16px auto' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Users Found</h3>
              <p style={{ margin: 0 }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            <table className="table" style={{ width: '100%', minWidth: '1200px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10 }}>
                <tr>
                  {[{ key: 'id', label: 'ID' }, { key: 'full_name', label: 'User' }, { key: 'designation', label: 'Designation' }, { key: 'status', label: 'Status' }, { key: 'questions_completed', label: 'Progress' }, { key: 'has_submitted', label: 'Submission' }, { key: 'expiry_date', label: 'Expiry' }, { key: 'password_hash', label: 'Hash' }].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key as keyof User)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {col.label}
                        <ArrowUpDown size={12} color={sortConfig?.key === col.key ? '#4f46e5' : '#9ca3af'} />
                      </div>
                    </th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {pagedUsers.map((u, i) => {
                    const progressPercent = Math.min(100, Math.round((u.questions_completed / u.question_limit) * 100)) || 0;
                    return (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedUser(u)}
                      >
                        <td style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                          {u.id.substring(0, 8)}...
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{u.email}</div>
                        </td>
                        <td>{u.designation || '-'}</td>
                        <td>
                          <span style={{
                            padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                            background: `${getStatusColor(u)}20`, color: getStatusColor(u), textTransform: 'capitalize'
                          }}>
                            {u.status}
                          </span>
                        </td>
                        <td style={{ width: '150px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', fontWeight: 500 }}>
                            <span>{u.questions_completed} / {u.question_limit}</span>
                            <span>{progressPercent}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              style={{ height: '100%', background: progressPercent === 100 ? '#10b981' : '#6366f1', borderRadius: '9999px' }}
                            />
                          </div>
                        </td>
                        <td>
                          {u.has_submitted ?
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.875rem', fontWeight: 500 }}><CheckCircle size={14} /> Submitted</span> :
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9ca3af', fontSize: '0.875rem' }}><Clock size={14} /> Pending</span>
                          }
                        </td>
                        <td>{getExpiryDisplay(u.expiry_date)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4b5563', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.password_hash}
                            </span>
                            <button
                              onClick={() => copyToClipboard(u.password_hash)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: copiedHash === u.password_hash ? '#10b981' : '#9ca3af', transition: 'color 0.2s' }}
                              title="Copy Hash"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                            style={{ padding: '6px 12px', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', transition: 'background 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
                            onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}
                          >
                            View
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, sortedUsers.length)} of {sortedUsers.length} users
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
              ><ChevronLeft size={16} /></button>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
              ><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </motion.div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedUser(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
              <div style={{ background: '#f9fafb', padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 600 }}>
                    {selectedUser.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>{selectedUser.full_name}</h2>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}><X size={24} /></button>
              </div>

              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>ID</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#111827' }}>{selectedUser.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Designation</div>
                  <div style={{ color: '#111827', fontWeight: 500 }}>{selectedUser.designation || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Status</div>
                  <span style={{
                    padding: '4px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
                    background: `${getStatusColor(selectedUser)}20`, color: getStatusColor(selectedUser), textTransform: 'capitalize'
                  }}>
                    {selectedUser.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Submission</div>
                  <div>{selectedUser.has_submitted ? <span style={{ color: '#10b981', fontWeight: 500 }}>Submitted</span> : <span style={{ color: '#6b7280' }}>Not Submitted</span>}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Progress</div>
                  <div style={{ fontWeight: 500, color: '#111827' }}>{selectedUser.questions_completed} / {selectedUser.question_limit} completed</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Expiry Date</div>
                  <div>{getExpiryDisplay(selectedUser.expiry_date)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Created At</div>
                  <div style={{ color: '#111827' }}>{new Date(selectedUser.created_at).toLocaleString()}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: '4px' }}>Password Hash</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '12px', borderRadius: '8px' }}>
                    <code style={{ fontSize: '0.75rem', color: '#374151', wordBreak: 'break-all', flex: 1 }}>{selectedUser.password_hash}</code>
                    <button
                      onClick={() => copyToClipboard(selectedUser.password_hash)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: copiedHash === selectedUser.password_hash ? '#10b981' : '#6b7280', transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', fontWeight: 500 }}
                    >
                      <Copy size={16} /> {copiedHash === selectedUser.password_hash ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(UsersClient);
