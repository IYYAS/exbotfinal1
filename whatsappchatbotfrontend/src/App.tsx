import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './components/DashboardLayout';
import ConnectAccount from './pages/ConnectAccount';
import LiveChat from './pages/LiveChatRefactored';
import Contacts from './pages/Contacts';
import BotManager from './pages/BotManager';
import FlowBuilder from './pages/FlowBuilder';
import NotFound from './pages/NotFound';
// @ts-ignore - These are used in JSX Route elements
import Broadcasting from './pages/Broadcasting';
// @ts-ignore - These are used in JSX Route elements
import Flows from './pages/Flows';
// @ts-ignore - These are used in JSX Route elements
import Settings from './pages/Settings';
// @ts-ignore - These are used in JSX Route elements
import TeamRole from './pages/TeamRole';
// @ts-ignore - These are used in JSX Route elements
import Billing from './pages/Billing';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Loading...</p>
    </div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const Dashboard = () => {
  const { user } = useAuth();
  return (
    <div style={{
      background: 'var(--surface-color)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '40px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
      maxWidth: '600px'
    }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '16px' }}>
        Welcome, {user?.username}!
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Welcome to your WhatsApp Chatbot management system.
      </p>

      {user?.vendor && (
        <div style={{
          background: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Workspace / Vendor</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>{user.vendor.name}</span>
        </div>
      )}
    </div>
  );
};

const AppRoutes = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Initializing...</p>
    </div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <LiveChat />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="whatsapp/connect" element={<ConnectAccount />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="templates" element={<BotManager />} />
        <Route path="bot-reply" element={<BotManager />} />
        <Route path="campaigns" element={<Broadcasting />} />
        <Route path="flows" element={<Flows />} />
        <Route path="settings" element={<Settings />} />
        <Route path="team" element={<TeamRole />} />
        <Route path="billing" element={<Billing />} />
        {/* Mock other subpages back to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route
        path="flow-builder/:id"
        element={
          <PrivateRoute>
            <FlowBuilder />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
