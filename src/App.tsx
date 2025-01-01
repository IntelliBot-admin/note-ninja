import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SignupForm from './components/auth/SignupForm';
import Dashboard from './pages/Dashboard';
import MeetingDetail from './pages/MeetingDetail';
import NewMeeting from './pages/NewMeeting';
import CalendarView from './pages/CalendarView';
import AuthForm from './components/auth/AuthForm';
import ChatInterface from './components/chat/ChatInterface';
import NavigationGuard from './components/NavigationGuard';
import HeaderSlideLayout from './components/layout/HeaderSlideLayout';
import { useAuthStore } from './store/authStore';
import Settings from './pages/Settings';
import '@stripe/stripe-js';


function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return user ? (
    <HeaderSlideLayout>
      {children}
    </HeaderSlideLayout>
  ) : (
    <Navigate to="/auth" replace />
  );
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <NavigationGuard>
        <Routes>
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <AuthForm />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupForm />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <PrivateRoute>
                <CalendarView />
              </PrivateRoute>
            }
          />
          <Route
            path="/meeting/new"
            element={
              <PrivateRoute>
                <NewMeeting />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />  
          <Route
            path="/meeting/:id"
            element={
              <PrivateRoute>
                <MeetingDetail />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" />
        {user && <ChatInterface />}
      </NavigationGuard>
    </BrowserRouter>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : <>{children}</>;
}