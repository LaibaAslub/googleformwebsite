'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import '../../admin.css';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'Judge Review Portal',
    defaultQuestionLimit: 15,
    defaultExpiryDays: 30,
    allowSelfRegistration: true,
    requireAdminApproval: true,
    adminEmail: 'admin@portal.com',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real implementation, this would call an API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="animateFadeIn">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: '#4b5563' }}>Configure your platform preferences and default values.</p>
      </div>

      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>General Settings</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Platform Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={e => setSettings({ ...settings, siteName: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Admin Email</label>
            <input
              type="email"
              value={settings.adminEmail}
              onChange={e => setSettings({ ...settings, adminEmail: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>User Defaults</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Default Question Limit (per user)</label>
            <input
              type="number"
              value={settings.defaultQuestionLimit}
              min={1}
              onChange={e => setSettings({ ...settings, defaultQuestionLimit: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>This is the number of questions assigned to each user when they are approved.</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Default Expiry (in days)</label>
            <input
              type="number"
              value={settings.defaultExpiryDays}
              min={1}
              onChange={e => setSettings({ ...settings, defaultExpiryDays: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Access Control</h2>

          {[
            { key: 'allowSelfRegistration', label: 'Allow Self Registration', desc: 'Users can sign up via the /signup page.' },
            { key: 'requireAdminApproval', label: 'Require Admin Approval', desc: 'New users must be approved before they can log in.' },
          ].map(toggle => (
            <div key={toggle.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{toggle.label}</div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{toggle.desc}</div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, [toggle.key]: !(settings as any)[toggle.key] })}
                style={{
                  width: '48px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: (settings as any)[toggle.key] ? '#4338ca' : '#d1d5db',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  top: '3px',
                  left: (settings as any)[toggle.key] ? '27px' : '3px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: saved ? '#16a34a' : '#4338ca',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          }}
        >
          <Save size={18} />
          {saved ? 'Settings Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
