'use client';

import { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Plus, Eye, Pencil, Trash2, Upload, Download, Filter } from 'lucide-react';
import { AnimatedCounter, ChartWhenVisible, CHART_ANIMATION } from '../animation';
import '../../admin.css';

const COLORS = ['#4338ca', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];
const PAGE_SIZE = 10;

export default function QuestionsClient({ questions, metrics }: { questions: any[], metrics: any }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewQ, setPreviewQ] = useState<any>(null);
  const [editQ, setEditQ] = useState<any>(null);
  const [addModal, setAddModal] = useState(false);
  const [newQ, setNewQ] = useState({
    question_text: '',
    existing_answer: '',
    reference: '',
    category: 'General Law'
  });
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = statusFilter === 'all'
    ? questions
    : questions.filter(q => q.status === statusFilter);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const deleteQuestion = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    const res = await fetch('/api/admin/questions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { alert('Deleted!'); window.location.reload(); }
    else alert('Failed to delete question.');
  };

  const saveEdit = async () => {
    if (!editQ) return;
    setLoading(true);
    const res = await fetch('/api/admin/questions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editQ.id, question_text: editQ.question_text, existing_answer: editQ.existing_answer, category: editQ.category, reference: editQ.reference }),
    });
    setLoading(false);
    if (res.ok) { alert('Question updated!'); window.location.reload(); }
    else alert('Failed to update question.');
  };

  const addQuestion = async () => {
    if (!newQ.question_text || !newQ.existing_answer) return;
    setLoading(true);
    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQ),
    });
    setLoading(false);
    if (res.ok) { alert('Question added!'); window.location.reload(); }
    else alert('Failed to add question.');
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/import-questions', { method: 'POST', body: formData });
    if (res.ok) { alert('Questions imported!'); window.location.reload(); }
    else alert('Failed to import CSV.');
  };

  const exportCsv = () => {
    const header = 'id,question_text,existing_answer,reference,category,status\n';
    const rows = questions.map(q =>
      `${q.id},"${q.question_text.replace(/"/g, '""')}","${q.existing_answer.replace(/"/g, '""')}","${(q.reference || '').replace(/"/g, '""')}","${q.category}","${q.status}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'questions.csv';
    a.click();
  };

  const statusColor: Record<string, string> = {
    available: '#dcfce7',
    assigned: '#dbeafe',
    completed: '#f3e8ff',
  };
  const statusTextColor: Record<string, string> = {
    available: '#166534',
    assigned: '#1d4ed8',
    completed: '#7e22ce',
  };

  return (
    <>
      {/* Header */}
      <div className="pageHeader">
        <div>
          <h1>Question Repository</h1>
          <p>Analyze distribution and manage {metrics.total} active assessment queries.</p>
        </div>
        <div className="headerActions">
          <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={handleCsvImport} />
          <button className="outlineBtn" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import CSV</button>
          <button className="outlineBtn" onClick={exportCsv}><Download size={16} /> Export CSV</button>
          <button
            onClick={() => setAddModal(true)}
            style={{ backgroundColor: '#4338ca', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} /> Create New Question
          </button>
        </div>
      </div>

      {/* Chart + KPIs */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>Question Distribution by Category</h2>
          <div style={{ height: '200px' }}>
            <ChartWhenVisible>
              {(ready) =>
                ready ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.chartData} barSize={24}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} dy={8} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                      <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive
                        animationDuration={CHART_ANIMATION.duration}
                        animationBegin={CHART_ANIMATION.begin}
                      >
                        {metrics.chartData.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : null
              }
            </ChartWhenVisible>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ background: '#4338ca', color: '#fff', flex: 1 }}>
            <div style={{ fontSize: '0.85rem', marginBottom: '8px', opacity: 0.8 }}>Total Repository</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
              <AnimatedCounter value={metrics.total} />
            </div>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div className="kpiLabel">Published</div>
            <div className="kpiValue"><AnimatedCounter value={metrics.published} /></div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="tableContainer">
        <div className="tableHeaderRow" style={{ gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'available', 'assigned', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                style={{
                  padding: '6px 14px', borderRadius: '9999px', border: '1px solid #e5e7eb',
                  background: statusFilter === s ? '#4338ca' : '#fff',
                  color: statusFilter === s ? '#fff' : '#374151',
                  fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem', textTransform: 'capitalize'
                }}
              >{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.875rem', color: '#6b7280' }}>
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total} questions
          </span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Question ID</th>
              <th>Question Prompt</th>
              <th>Reference</th>
              <th>Category</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(q => (
              <tr key={q.id}>
                <td style={{ fontWeight: 600 }}>QB-{String(q.id).padStart(4, '0')}</td>
                <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.question_text.length > 50 ? q.question_text.substring(0, 50) + '...' : q.question_text}
                </td>
                <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6b7280', fontSize: '0.875rem' }}>
                  {q.reference || '-'}
                </td>
                <td>
                  <span className="badge" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}>{q.category}</span>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor[q.status]?.replace('dc', '16') || '#4338ca', display: 'inline-block' }}></span>
                    <span style={{ color: statusTextColor[q.status] || '#374151' }}>{q.status.charAt(0).toUpperCase() + q.status.slice(1)}</span>
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setPreviewQ(q)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4338ca', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Eye size={16} /> Preview
                    </button>
                    <button onClick={() => setEditQ({ ...q })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Pencil size={16} /></button>
                    <button onClick={() => deleteQuestion(q.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{total} questions total</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="pageBtn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&lt;</button>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className="pageBtn"
                onClick={() => setPage(n)}
                style={{ background: page === n ? '#4338ca' : '#fff', color: page === n ? '#fff' : '#374151', borderColor: page === n ? '#4338ca' : '#d1d5db' }}
              >{n}</button>
            ))}
            {totalPages > 3 && <span style={{ color: '#6b7280' }}>... {totalPages}</span>}
            <button className="pageBtn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>&gt;</button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewQ && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} data-no-scroll-reveal>
          <div className="card animateSlideUp" style={{ width: '560px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2>QB-{String(previewQ.id).padStart(4, '0')}</h2>
              <button onClick={() => setPreviewQ(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280' }}>×</button>
            </div>
            <p style={{ fontSize: '1rem', marginBottom: '16px', color: '#111827' }}>{previewQ.question_text}</p>
            <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '8px' }}>REFERENCE ANSWER</div>
              <p style={{ color: '#374151', marginBottom: previewQ.reference ? '12px' : '0' }}>{previewQ.existing_answer}</p>
              {previewQ.reference && (
                <>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>REFERENCE SOURCE</div>
                  <p style={{ color: '#4b5563', fontSize: '0.9rem', fontStyle: 'italic' }}>{previewQ.reference}</p>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badgePurple">{previewQ.category}</span>
              <span className="badge" style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>{previewQ.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editQ && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} data-no-scroll-reveal>
          <div className="card animateSlideUp" style={{ width: '560px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2>Edit Question</h2>
              <button onClick={() => setEditQ(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Question Text</label>
              <textarea
                value={editQ.question_text}
                onChange={e => setEditQ({ ...editQ, question_text: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Reference Answer</label>
              <textarea
                value={editQ.existing_answer}
                onChange={e => setEditQ({ ...editQ, existing_answer: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Reference Source (Optional)</label>
              <input
                value={editQ.reference || ''}
                onChange={e => setEditQ({ ...editQ, reference: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Category</label>
              <input
                value={editQ.category}
                onChange={e => setEditQ({ ...editQ, category: e.target.value })}
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="outlineBtn" onClick={() => setEditQ(null)}>Cancel</button>
              <button onClick={saveEdit} disabled={loading}
                style={{ backgroundColor: '#4338ca', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} data-no-scroll-reveal>
          <div className="card animateSlideUp" style={{ width: '560px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2>Create New Question</h2>
              <button onClick={() => setAddModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Question Text</label>
              <textarea
                value={newQ.question_text}
                onChange={e => setNewQ({ ...newQ, question_text: e.target.value })}
                rows={3}
                placeholder="Enter the question..."
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Reference Answer</label>
              <textarea
                value={newQ.existing_answer}
                onChange={e => setNewQ({ ...newQ, existing_answer: e.target.value })}
                rows={3}
                placeholder="Enter the ideal answer..."
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Reference Source (Optional)</label>
              <input
                value={newQ.reference}
                onChange={e => setNewQ({ ...newQ, reference: e.target.value })}
                placeholder="e.g. Constitution of 1973"
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Category</label>
              <input
                value={newQ.category}
                onChange={e => setNewQ({ ...newQ, category: e.target.value })}
                placeholder="e.g. Constitutional Law"
                style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="outlineBtn" onClick={() => setAddModal(false)}>Cancel</button>
              <button onClick={addQuestion} disabled={loading}
                style={{ backgroundColor: '#4338ca', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>
                {loading ? 'Creating...' : 'Create Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
