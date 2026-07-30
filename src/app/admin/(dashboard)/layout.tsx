'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Database,
  Upload,
  Settings,
  ShieldAlert,
  Search,
  Bell,
  Menu,
  X,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Users
} from 'lucide-react';
import '../admin.css'; // Global admin styles
import ScrollReveal from './ScrollReveal';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch notifications
    fetch('/api/admin/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications);
      })
      .catch(console.error);

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('adminDrawerOpen', mobileSidebarOpen);
    return () => document.body.classList.remove('adminDrawerOpen');
  }, [mobileSidebarOpen]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: number) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await fetch('/api/admin/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'new_user': return <UserPlus size={16} color="#4338ca" />;
      case 'user_approved': return <CheckCircle size={16} color="#16a34a" />;
      case 'user_rejected': return <XCircle size={16} color="#dc2626" />;
      case 'review_submission': return <MessageSquare size={16} color="#d97706" />;
      default: return <AlertTriangle size={16} color="#4b5563" />;
    }
  };

  const navItems = [
    { label: 'Overview', href: '/admin/overview', icon: LayoutDashboard },
    { label: 'Pending Requests', href: '/admin/pending', icon: ClipboardList },
    { label: 'User Progress', href: '/admin/progress', icon: TrendingUp },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Question Bank', href: '/admin/questions', icon: Database },
    { label: 'Export', href: '/admin/export', icon: Upload },
    { label: 'Audit Logs', href: '/admin/logs', icon: ShieldAlert },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className={`layout ${mobileSidebarOpen ? 'mobileSidebarOpen' : ''}`}>
      <div className="sidebarBackdrop" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'sidebarCollapsed' : ''}`}>
        <div className="logoArea">
          <ShieldAlert size={28} />
          <span>Admin Console</span>
          <button
            type="button"
            className="iconBtn sidebarCloseBtn"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="sidebarNav">
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navItem ${isActive ? 'navItemActive' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="navIcon" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="bottomProfile">
          <img src="https://ui-avatars.com/api/?name=Admin+User&background=random" alt="Avatar" className="avatar" />
          <div className="profileInfo">
            <span className="profileName">Admin Profile</span>
            <span className="profileRole">System Management</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="mainContent">
        <header className="topbar">
          <div className="topbarLeft">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="iconBtn mobileMenuBtn"
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="iconBtn desktopSidebarToggle"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <Menu size={24} /> : <X size={24} />}
            </button>
            <div className="searchBar">
              <Search className="searchIcon" />
              <input type="text" placeholder="Search..." className="searchInput" />
            </div>
          </div>

          <div className="topActions" ref={dropdownRef}>
            {/* Notification Bell */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="iconBtn"
              aria-label="Notifications"
              style={{ position: 'relative' }}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '6px', width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <div className="notificationDropdown animateSlideDown">
                <div className="notificationHeader">
                  <span style={{ fontWeight: 600 }}>Notifications</span>
                  <span style={{ fontSize: '0.8rem', color: '#4338ca', backgroundColor: '#eef2ff', padding: '2px 8px', borderRadius: '999px' }}>
                    {unreadCount} New
                  </span>
                </div>
                <div className="notificationList">
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>No notifications yet.</div>
                  ) : (
                    notifications.map((n, index) => (
                      <div
                        key={n.id}
                        className={`notificationItem ${!n.is_read ? 'unread' : ''}`}
                        style={{ animationDelay: `${index * 40}ms` }}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="notificationIcon" style={{ backgroundColor: !n.is_read ? '#e0e7ff' : '#f3f4f6' }}>
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="notificationContent">
                          <div style={{ fontSize: '0.9rem', color: '#111827', fontWeight: !n.is_read ? 600 : 400 }}>{n.message}</div>
                          <div className="notificationTime">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="topbarDivider"></div>

            {/* Profile Dropdown / Logout */}
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="logoutBtn">
                <Upload size={16} style={{ transform: 'rotate(90deg)' }} />
                Logout
              </button>
            </form>
          </div>
        </header>

        <div className="pageContainer">
          <div className="animatePageIn" key={pathname}>
            {children}
          </div>
          <ScrollReveal />
        </div>
      </main>
    </div>
  );
}
