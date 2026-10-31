import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../services/apiClient.js';

function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');

  // Password validation checks for register
  const hasLength = password.length > 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-=+]/.test(password);
  const isPasswordValid = hasLength && hasUpper && hasLower && hasSpecial;

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else {
        if (!isPasswordValid) {
          setError('Please fulfill all password complexity requirements.');
          setLoading(false);
          return;
        }
        await register({ name, email, password, company, phone });
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      setForgotStatus('Sending reset request...');
      const res = await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      setForgotStatus(
        res.data?.devResetToken
          ? `Reset link created! Dev Token: ${res.data.devResetToken}`
          : res.data?.message || 'Check your email for reset instructions.'
      );
    } catch (err) {
      setForgotStatus(err.response?.data?.message || 'Failed to process request');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="card shadow-lg bg-white p-8 rounded-2xl border border-neutral-200">
          {/* Logo / Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-600 text-white font-black text-2xl shadow-sm mb-3">
              B
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              Brightloop Software
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Subscription Management Platform · Member 2 Auth & Subscriptions
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex border-b border-neutral-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                mode === 'register'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Quick Demo Credentials in Login Mode */}
          {mode === 'login' && (
            <div className="mb-6 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
              <span className="font-semibold text-neutral-700 block mb-2">
                ⚡ Quick Demo Credentials (Click to pre-fill):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@brightloop.com', 'Admin123!@#')}
                  className="px-2 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-800 rounded border border-primary-200 font-medium text-center truncate"
                  title="Full admin capabilities"
                >
                  👑 Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('staff@brightloop.com', 'Staff123!@#')}
                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded border border-blue-200 font-medium text-center truncate"
                  title="Staff operations"
                >
                  👔 Staff
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('billing@acme.com', 'Customer123!@#')}
                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-200 font-medium text-center truncate"
                  title="Customer portal view"
                >
                  👤 Customer
                </button>
              </div>
            </div>
          )}

          {/* Error & Success Alerts */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 text-xs">
                ✕
              </button>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              {successMsg}
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Corp"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 555-0100"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1" htmlFor="email">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-neutral-700" htmlFor="password">
                  Password *
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(true);
                      setForgotStatus('');
                      setForgotEmail(email);
                    }}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            {/* Live Password Complexity Checklist in Register mode */}
            {mode === 'register' && (
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-1">
                <span className="font-semibold text-neutral-700 block mb-1">Password Requirements:</span>
                <div className={`flex items-center gap-1.5 ${hasLength ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                  <span>{hasLength ? '✓' : '○'}</span>
                  <span>More than 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                  <span>{hasUpper ? '✓' : '○'}</span>
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                  <span>{hasLower ? '✓' : '○'}</span>
                  <span>At least one lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 font-medium' : 'text-neutral-400'}`}>
                  <span>{hasSpecial ? '✓' : '○'}</span>
                  <span>At least one special character (!@#$%...)</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && !isPasswordValid)}
              className="btn-primary w-full py-2.5 rounded-lg font-semibold text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Reset Password</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Enter your registered email address to receive password reset instructions.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="user@domain.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                />
              </div>
              {forgotStatus && (
                <div className="p-3 bg-neutral-100 rounded text-xs text-neutral-800 break-all font-mono">
                  {forgotStatus}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
