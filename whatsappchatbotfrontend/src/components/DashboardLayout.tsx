import React from 'react';
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
  ShoppingBag,
  Shield,
  ShieldCheck,
  CreditCard
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
        { name: 'Bot Manager', icon: <Zap size={18} />, path: '/automation' },
        { name: 'Subscriber Manager', icon: <Users size={18} />, path: '/contacts' },
        { name: 'Broadcasting', icon: <Radio size={18} />, path: '/campaigns' },
        { name: 'Live Chat', icon: <MessageSquare size={18} />, path: '/chat' },
        { name: 'Templates', icon: <MessageSquare size={18} />, path: '/templates' },
        { name: 'Webhook Workflow', icon: <Activity size={18} />, path: '/flows' },
        { name: 'eCommerce Catalog', icon: <ShoppingBag size={18} />, path: '/integrations' },
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
                <NavLink
                  key={item.name}
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
                  <span style={{ display: 'flex' }}>
                    {item.icon}
                  </span>
                  {item.name}
                  {item.name === 'Connect Account' && !user?.vendor?.name && (
                    <div style={{ 
                      marginLeft: 'auto', 
                      width: '6px', 
                      height: '6px', 
                      background: '#ef4444', 
                      borderRadius: '50%' 
                    }}></div>
                  )}
                </NavLink>
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
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', backgroundColor: 'var(--bg-color)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
