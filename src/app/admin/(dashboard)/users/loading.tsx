import React from 'react';

export default function Loading() {
  return (
    <div className="pageContainer" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="headerRow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', margin: 0 }}>Users Directory</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Manage and monitor all platform users.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '100px', backgroundColor: '#f3f4f6', borderRadius: '12px', animation: 'pulse 2s infinite' }} />
        ))}
      </div>
      <div style={{ height: '400px', backgroundColor: '#f3f4f6', borderRadius: '12px', animation: 'pulse 2s infinite' }} />
    </div>
  );
}
