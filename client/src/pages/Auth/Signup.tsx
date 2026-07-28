import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// @ts-ignore
import { signup } from '../../api/auth';
import logo from '../../assets/logo.png';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
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
      const res = await signup({ name, email, password });
      loginUser(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F7] font-sans flex flex-col items-center justify-center p-6 text-[#1E3A4A]">
      <div className="max-w-md w-full flex flex-col gap-6">

        {/* Logo above card */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-[#1E3A4A] border border-[#152B37] flex items-center justify-center p-2">
            <img src={logo} alt="LearnOS" className="w-full h-full object-contain" />
          </div>
          <span className="font-sans font-semibold text-lg text-[#1E3A4A] tracking-tight">
            LearnOS
          </span>
        </div>

        {/* White Centered Card */}
        <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-sans font-semibold text-lg text-[#1E3A4A]">
              Create your account
            </h1>
            <p className="text-xs text-[#6B7B85] mt-0.5 font-normal">
              Start your learning journey with LearnOS
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold uppercase tracking-wide text-[#6B7B85] mb-1">
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white placeholder-[#6B7B85]/60 focus:outline-none focus:border-[#2E7C87]"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-[#6B7B85] mb-1">
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
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white placeholder-[#6B7B85]/60 focus:outline-none focus:border-[#2E7C87]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-[#6B7B85] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#1E3A4A] bg-white placeholder-[#6B7B85]/60 focus:outline-none focus:border-[#2E7C87]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-[#6B7B85] font-normal">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2E7C87] font-medium hover:underline no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
