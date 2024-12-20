import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { LogIn, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'forgotPassword';

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await signUp(email, password);
        toast.success('Account created successfully!');
      } else if (mode === 'login') {
        await signIn(email, password);
        toast.success('Welcome back!');
      } else if (mode === 'forgotPassword') {
        await resetPassword(email);
        toast.success('Password reset email sent!');
        setMode('login');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create a new account'}
            {mode === 'forgotPassword' && 'Reset your password'}
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== 'forgotPassword' && (
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                  className={`appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${
                    mode === 'register' ? '' : 'rounded-b-md'
                  }`}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {mode === 'login' && 'Sign in'}
              {mode === 'register' && 'Sign up'}
              {mode === 'forgotPassword' && 'Reset Password'}
            </button>
          </div>

          <div className="flex flex-col space-y-2 text-sm text-center">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-500"
                  onClick={() => setMode('register')}
                >
                  Don't have an account? Sign up
                </button>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-500"
                  onClick={() => setMode('forgotPassword')}
                >
                  Forgot your password?
                </button>
              </>
            )}
            {(mode === 'register' || mode === 'forgotPassword') && (
              <button
                type="button"
                className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-500"
                onClick={() => setMode('login')}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}