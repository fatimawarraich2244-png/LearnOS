import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import { login } from '../../api/auth';
import logo from '../../assets/logo.png';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      loginUser(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg font-inter flex items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent-teal/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full z-10">
        {/* Logo above card */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={logo} alt="LearnOS" className="h-14 w-auto" />
          <span className="font-jakarta font-bold text-2xl text-accent-teal tracking-wide">LearnOS</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="font-jakarta font-bold text-2xl text-text-primary mb-1">
              Welcome back
            </h1>
            <p className="text-text-secondary text-sm">Sign in to continue your learning journey</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-surface2 border border-border text-text-primary placeholder-text-muted rounded-xl text-sm focus:outline-none focus:border-accent-teal transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-surface2 border border-border text-text-primary placeholder-text-muted rounded-xl text-sm focus:outline-none focus:border-accent-teal transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 bg-accent-teal text-bg font-jakarta font-semibold rounded-xl hover:bg-[#8ec8d0] transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent-teal font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
