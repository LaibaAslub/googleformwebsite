'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MessageSquareDashed, Star, Table2 } from 'lucide-react';
import { AnimatedCounter, ChartWhenVisible, CHART_ANIMATION } from '../animation';
import '../../admin.css';

export default function ExportClient({
  totalResponses, avgRating, ratingChartData
}: {
  totalResponses: number;
  avgRating: number;
  ratingChartData: { name: string; value: number }[];
}) {
  const [exporting, setExporting] = useState(false);
  const [dateFilter, setDateFilter] = useState('last30');

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export?type=csv');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'responses.csv';
      a.click();
    } catch (e) {
      alert('Failed to export. Please try again.');
    }
    setExporting(false);
  };

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Export & Reports</h1>
          <p>Generate detailed insights and download historical data.</p>
        </div>
        <div className="headerActions">
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="outlineBtn"
            style={{ border: '1px solid #d1d5db', cursor: 'pointer' }}
          >
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="last90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={handleExport}
            className="outlineBtn"
            style={{ backgroundColor: '#4338ca', color: '#fff', borderColor: '#4338ca' }}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : 'Update Data'}
          </button>
        </div>
      </div>

      {/* Charts + KPIs */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Quality Ratings Distribution</h2>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#4338ca', fontWeight: 500 }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4338ca', display: 'inline-block' }}></span>
              Responses
            </span>
          </div>
          <div style={{ height: '200px' }}>
            <ChartWhenVisible>
              {(ready) =>
                ready ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingChartData} barSize={32}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                      <Bar
                        dataKey="value"
                        fill="#4338ca"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive
                        animationDuration={CHART_ANIMATION.duration}
                        animationBegin={CHART_ANIMATION.begin}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : null
              }
            </ChartWhenVisible>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#eef2ff', borderRadius: '12px', padding: '12px' }}>
              <MessageSquareDashed size={24} color="#4338ca" />
            </div>
            <div>
              <div className="kpiLabel">Total Responses</div>
              <div className="kpiValue"><AnimatedCounter value={totalResponses} /></div>
            </div>
          </div>
          <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#fffbeb', borderRadius: '12px', padding: '12px' }}>
              <Star size={24} color="#d97706" />
            </div>
            <div>
              <div className="kpiLabel">Avg. Quality Rating</div>
              <div className="kpiValue"><AnimatedCounter value={avgRating} decimals={1} /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid" style={{ gridTemplateColumns: '1fr', marginBottom: '24px', maxWidth: '420px' }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={handleExport}>
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '12px', display: 'inline-block', marginBottom: '12px' }}>
            <Table2 size={24} color="#4b5563" />
          </div>
          <h3 style={{ marginBottom: '4px' }}>Raw CSV Data</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px' }}>Standard comma-separated values for database integration.</p>
          <button
            onClick={e => { e.stopPropagation(); handleExport(); }}
            style={{ background: 'transparent', border: 'none', color: '#4338ca', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}
            disabled={exporting}
          >
            {exporting ? 'Generating...' : 'Generate CSV →'}
          </button>
        </div>
      </div>
    </>
  );
}
