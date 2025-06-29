import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Mail, ArrowLeft, Send } from 'lucide-react';

export default function ManualPasswordReset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const location = useLocation();

  useEffect(() => {
    // Check if email was passed from the previous page
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address.');
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

      console.log('Sending password reset email to:', email);
      
      // Use the standard password reset flow
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        console.error('Error sending password reset email:', resetError);
        setError(`Failed to send password reset email: ${resetError.message}`);
        return;
      }

      console.log('Password reset email sent successfully');
      setSuccess(`Password reset email has been sent to ${email}. Please check the user's inbox and spam folder.`);
      
      // Clear form
      setEmail('');

    } catch (err: any) {
      console.error('Unexpected error during password reset:', err);
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white text-center">
            <Mail className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Password Reset Tool</h1>
            <p className="opacity-90 mt-2">Send password reset email to users</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user's email address"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                A password reset email will be sent to this address
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Reset Email
                </>
              )}
            </button>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">📧 How it works</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• This tool sends a secure password reset email to the specified user</p>
                <p>• The user will receive an email with a link to reset their password</p>
                <p>• The reset link is valid for a limited time and can only be used once</p>
                <p>• This is the secure, standard way to reset passwords</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Admin Use Only</h4>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>This tool is for administrative use to help users who have forgotten their passwords.</p>
                <p>Always verify the user's identity before sending a reset email.</p>
                <p>Inform the user to check their email (including spam folder) for the reset link.</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}