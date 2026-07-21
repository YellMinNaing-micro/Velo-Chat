import React from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';

const MainApp = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: '16px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Loading VeloChat...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Chat /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/" replace />
            : <Login onNavigateToRegister={() => navigate('/register')} />
        }
      />
      <Route
        path="/register"
        element={
          user
            ? <Navigate to="/" replace />
            : <Register onNavigateToLogin={() => navigate('/login')} />
        }
      />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
