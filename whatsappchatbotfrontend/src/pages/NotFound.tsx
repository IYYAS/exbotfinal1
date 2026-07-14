import React from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'var(--surface-color)',
        border: '2px solid var(--border-color)',
        borderRadius: '24px',
        padding: '60px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative clouds */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '20px',
          width: '100px',
          height: '40px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderRadius: '50%',
          opacity: 0.5
        }} />
        <div style={{
          position: 'absolute',
          top: '30px',
          right: '40px',
          width: '80px',
          height: '30px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderRadius: '50%',
          opacity: 0.3
        }} />

        {/* Bird illustration with character */}
        <div style={{
          marginBottom: '40px',
          position: 'relative',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Bird body - simplified */}
          <div style={{
            width: '100px',
            height: '80px',
            position: 'relative',
            animation: 'floatBird 3s ease-in-out infinite'
          }}>
            {/* Main bird shape */}
            <svg
              width="100"
              height="80"
              viewBox="0 0 100 80"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              {/* Bird body */}
              <ellipse cx="50" cy="45" rx="35" ry="28" fill="#94a3b8" opacity="0.7" />
              {/* Bird head */}
              <circle cx="70" cy="35" r="18" fill="#94a3b8" opacity="0.7" />
              {/* Eye */}
              <circle cx="76" cy="32" r="4" fill="var(--text-primary)" />
              {/* Beak */}
              <path d="M 85 35 L 95 33 L 85 37 Z" fill="#94a3b8" opacity="0.7" />
              {/* Wing */}
              <path d="M 50 40 Q 35 30 30 45 Q 35 50 50 45 Z" fill="#cbd5e1" />
              {/* Tail feathers */}
              <path d="M 20 45 Q 10 35 15 55 Q 20 50 25 50 Z" fill="#cbd5e1" />
              <path d="M 15 50 Q 8 40 5 60 Q 12 55 20 55 Z" fill="#94a3b8" opacity="0.5" />
            </svg>
          </div>

          {/* Red error marker/icon */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '15px',
            width: '40px',
            height: '40px',
            background: '#ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            ✕
          </div>
        </div>

        {/* 404 Text */}
        <h1 style={{
          fontSize: '5rem',
          fontWeight: '700',
          color: 'var(--border-color)',
          margin: '0 0 12px 0',
          letterSpacing: '-2px'
        }}>
          404
        </h1>

        {/* Error Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: 'var(--error-color)',
          margin: '0 0 12px 0'
        }}>
          Unable to fly :(
        </h2>

        {/* Error Description */}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.6',
          margin: '0 0 32px 0'
        }}>
          The page you are looking for is currently unavailable.
          <br />
          Please try again later.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--error-color)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#dc2626';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'var(--error-color)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Home size={16} />
            Back to Home
          </button>

          <button
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--text-primary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

        <style>{`
          @keyframes floatBird {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default NotFound;
