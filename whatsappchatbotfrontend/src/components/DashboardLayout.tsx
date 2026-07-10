import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Settings, 
  LogOut, 
  Bell,
  Zap,
  Radio,
  Activity,
  Shield,
  ShieldCheck,
  CreditCard,
  Bot,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuGroups = [
    {
      title: null,
      items: [
        { name: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/' },
      ]
    },
    {
      title: 'WHATSAPP',
      items: [
        { name: 'Connect Account', icon: <Zap size={18} />, path: '/whatsapp/connect' },
        { 
          name: 'Chatbot Manager', 
          icon: <Bot size={18} />, 
          path: '', // Parent item, no direct path
          subItems: [
            { name: 'WhatsApp Bot', icon: <MessageSquare size={16} color="#10b981" />, path: '/bot-reply' }
          ]
        },
        { name: 'Subscriber Manager', icon: <Users size={18} />, path: '/contacts' },
        { name: 'Broadcasting', icon: <Radio size={18} />, path: '/campaigns' },
        { name: 'Live Chat', icon: <MessageSquare size={18} />, path: '/chat' },
        { name: 'WhatsApp Automation', icon: <Activity size={18} />, path: '/flows' },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'Settings', icon: <Settings size={18} />, path: '/settings' },
        { name: 'Team Role', icon: <Shield size={18} />, path: '/team' },
        ...(user?.role === 'admin' ? [{ name: 'Admin Console', icon: <ShieldCheck size={18} />, path: '/admin' }] : []),
        { name: 'Billing', icon: <CreditCard size={18} />, path: '/billing' },
      ]
    }
  ];

  const SidebarItem = ({ item, user }: any) => {
    const [expanded, setExpanded] = useState(false);
    const hasSubItems = item.subItems && item.subItems.length > 0;

    if (hasSubItems) {
      return (
        <div style={{ marginBottom: '2px' }}>
          <div
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: '500',
              transition: '0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <span style={{ display: 'flex' }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ display: 'flex', color: 'var(--text-secondary)' }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
          {expanded && (
            <div style={{ paddingLeft: '12px', marginTop: '4px', marginBottom: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {item.subItems.map((sub: any) => (
                <NavLink
                  key={sub.name}
                  to={sub.path}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '500',
                    transition: '0.2s'
                  })}
                >
                  <span style={{ display: 'flex' }}>{sub.icon}</span>
                  {sub.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={item.path}
        style={({ isActive }) => ({
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          borderRadius: '8px',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
          border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
          textDecoration: 'none',
          marginBottom: '2px',
          fontSize: '13.5px',
          fontWeight: isActive ? '600' : '500',
          transition: '0.2s'
        })}
      >
        <span style={{ display: 'flex' }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.name}</span>
        {item.name === 'Connect Account' && !user?.vendor?.name && (
          <div style={{ width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }}></div>
        )}
      </NavLink>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '260px', 
        background: 'var(--surface-color)', 
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Brand/Logo */}
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
             <Zap size={18} color="#ffffff" />
          </div>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold', 
            background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            color: 'transparent'
          }}>wabis</h1>
        </div>

        {/* Menu Navigation */}
        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
          {menuGroups.map((group, idx) => (
            <div key={idx} style={{ marginBottom: '24px' }}>
              {group.title && (
                <div style={{ 
                  padding: '0 16px', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '12px',
                  letterSpacing: '0.05em'
                }}>
                  {group.title}
                </div>
              )}
              {group.items.map((item) => (
                <SidebarItem key={item.name} item={item} user={user} />
              ))}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer (User Info + Logout) */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              background: 'var(--bg-color)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <Users size={20} color="var(--text-secondary)" />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '13.5px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {user?.role || 'Agent'} ({user?.vendor?.name || 'No Vendor'})
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              padding: '10px', 
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--error-color)',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'var(--error-color)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{ 
          height: '60px', 
          background: 'var(--surface-color)', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          justifyContent: 'flex-end',
          gap: '20px'
        }}>
          <button style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Bell size={20} />
          </button>
          <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }}></div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
