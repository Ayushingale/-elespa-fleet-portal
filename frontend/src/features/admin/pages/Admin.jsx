import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export default function Login() {
  const { login, status, sessionNotice, setSessionNotice, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to root
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Check URL query parameters for session expiration notice
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === '1' && !sessionNotice) {
      setSessionNotice('Your session has expired. Please sign in again to continue.');
    }
  }, [location.search, sessionNotice, setSessionNotice]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    if (sessionNotice) setSessionNotice(null);

    if (!form.username.trim()) {
      setErrorMessage('Please enter your username');
      return;
    }
    if (!form.password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      if (err.response) {
        // Backend responded with an error (e.g. 401 Invalid credentials)
        const serverError = err.response.data?.error || `Authentication failed (${err.response.status})`;
        setErrorMessage(serverError);
      } else if (err.request) {
        setErrorMessage('Unable to reach backend server (http://localhost:4000). Please ensure it is running.');
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred during login.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (username, password) => {
    setForm({ username, password });
    setErrorMessage('');
    if (sessionNotice) setSessionNotice(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#151821] px-4 py-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-lg shadow-indigo-500/20 text-white font-black text-2xl mb-1">
            ⚡
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Elespa HEV Fleet Portal</h1>
          <p className="text-slate-400 text-sm">Vehicle Diagnostics & Operations Control Room</p>
        </div>

        {/* Card container */}
        <div className="bg-[#1E2333] border border-white/10 rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-lg font-semibold text-white">Sign In</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              In-Memory JWT Auth
            </span>
          </div>

          {/* Session notification banner (e.g. timeout / expired) */}
          {sessionNotice && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">{sessionNotice}</div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm animate-shake">
              <svg className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#151821] border border-white/10 pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
                  placeholder="e.g. admin or operator"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#151821] border border-white/10 pl-10 pr-11 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-50"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || status === 'loading'}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white py-2.5 font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting || status === 'loading' ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Authenticating…</span>
                </>
              ) : (
                <span>Sign In to Portal →</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Bar */}
          <div className="pt-2 border-t border-white/5 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">Quick Demo Accounts:</span>
              <span className="text-slate-500">1-click autofill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin', 'admin123')}
                className="flex flex-col text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">Admin</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Asha Rao</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-1">admin / admin123</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('operator', 'operator123')}
                className="flex flex-col text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">Operator</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Vikram Shah</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono mt-1">operator / operator123</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Architecture Note */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>🔒 Session JWT is held in memory to prevent XSS credential harvesting.</p>
          <p>Protected by RBAC server & client route boundaries.</p>
        </div>
      </div>
    </div>
  );
}