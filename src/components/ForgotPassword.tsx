import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Mail, ArrowLeft, AlertCircle, CheckCircle, Send, Key } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Instead of sending a reset email, we'll redirect to the manual reset page
      setSuccess('Redirecting to manual password reset page...');
      
      setTimeout(() => {
        navigate('/manual-reset', { state: { email } });
      }, 1500);

    } catch (error: any) {
      console.error('Error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToManualReset = () => {
    navigate('/manual-reset', { state: { email } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white text-center">
            <Mail className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Password Recovery</h1>
            <p className="opacity-90 mt-2">Enter your email to reset your password</p>
          </div>
          
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-700">{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll use this email to identify your account
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Continue
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={goToManualReset}
                  className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <Key className="w-5 h-5" />
                  Manual Reset
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>

            {/* Information Box */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ Password Reset Information</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p>We've simplified the password reset process:</p>
                <p>1. Enter your email address above</p>
                <p>2. Click "Continue" or "Manual Reset"</p>
                <p>3. An administrator will reset your password</p>
                <p>4. You'll receive your new password via email or other communication</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}