import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [resendingLink, setResendingLink] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    checkResetSession();
  }, []);

  const checkResetSession = async () => {
    try {
      setCheckingSession(true);
      setError('');

      // Get tokens from URL hash or parameters
      // First check the hash fragment (for older Supabase links)
      const hash = location.hash;
      let accessToken = '';
      let refreshToken = '';
      let type = '';

      if (hash) {
        // Parse hash fragment
        const hashParams = new URLSearchParams(hash.substring(1));
        accessToken = hashParams.get('access_token') || '';
        refreshToken = hashParams.get('refresh_token') || '';
        type = hashParams.get('type') || '';
      } else {
        // Check URL parameters (for newer Supabase links)
        accessToken = searchParams.get('access_token') || '';
        refreshToken = searchParams.get('refresh_token') || '';
        type = searchParams.get('type') || '';
      }

      console.log('Reset password tokens:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken, 
        type,
        source: hash ? 'hash fragment' : 'URL parameters'
      });

      // Check if this is a password recovery request
      if (type !== 'recovery' || !accessToken || !refreshToken) {
        console.log('Invalid or missing recovery tokens');
        setError('Invalid or expired reset link. Please request a new password reset.');
        setCheckingSession(false);
        return;
      }

      // Set the session with the tokens from the URL
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Reset link has expired or is invalid. Please request a new password reset.');
        setCheckingSession(false);
        return;
      }

      if (sessionData.session && sessionData.user) {
        console.log('Valid session established for password reset');
        setValidSession(true);
        setEmail(sessionData.user.email || '');
      } else {
        console.log('No valid session could be established');
        setError('Unable to verify reset link. Please request a new password reset.');
      }

    } catch (error: any) {
      console.error('Error checking reset session:', error);
      setError('An error occurred while verifying your reset link. Please try again.');
    } finally {
      setCheckingSession(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validSession) {
      setError('Invalid session. Please request a new password reset.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Updating password...');

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(updateError.message || 'Failed to update password. Please try again.');
        return;
      }

      console.log('Password updated successfully');
      setSuccess('Password updated successfully! You will be redirected to login.');

      // Sign out the user and redirect to login after a delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login', { 
          state: { 
            message: 'Password updated successfully. Please sign in with your new password.' 
          }
        });
      }, 2000);

    } catch (error: any) {
      console.error('Error updating password:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetLink = async () => {
    if (!email) {
      setError('Email address not available. Please go back to login and request a new reset.');
      return;
    }

    try {
      setResendingLink(true);
      setError('');

      console.log('Resending password reset link to:', email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        console.error('Error resending reset link:', error);
        setError(error.message || 'Failed to send reset link. Please try again.');
        return;
      }

      setSuccess('New reset link sent! Please check your email.');

    } catch (error: any) {
      console.error('Error resending reset link:', error);
      setError('Failed to send reset link. Please try again.');
    } finally {
      setResendingLink(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Reset Link</h2>
            <p className="text-gray-600">Please wait while we verify your password reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white text-center">
            <Lock className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="opacity-90 mt-2">
              {validSession ? 'Enter your new password below' : 'Reset link verification'}
            </p>
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

            {validSession ? (
              /* Password Reset Form */
              <form onSubmit={handlePasswordReset} className="space-y-6">
                {email && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-800">Resetting password for: {email}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Invalid Session - Show Options */
              <div className="text-center space-y-6">
                <div className="p-6 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Reset Link Invalid</h3>
                  <p className="text-gray-600 text-sm">
                    Your password reset link has expired or is invalid. This can happen if:
                  </p>
                  <ul className="text-gray-600 text-sm mt-2 space-y-1">
                    <li>• The link is older than 1 hour</li>
                    <li>• The link has already been used</li>
                    <li>• The link was not properly formatted</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  {email && (
                    <button
                      onClick={handleResendResetLink}
                      disabled={resendingLink}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {resendingLink ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          Send New Reset Link
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={goToLogin}
                    className="w-full border border-gray-300 text-gray-700 p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Login
                  </button>
                </div>
              </div>
            )}

            {/* Supabase Configuration Instructions */}
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Configuration Required</h4>
              <div className="text-xs text-yellow-700 space-y-1">
                <p><strong>To fix password reset issues, update your Supabase settings:</strong></p>
                <p>1. Go to Supabase Dashboard → Authentication → URL Configuration</p>
                <p>2. Set Site URL to: <code className="bg-yellow-100 px-1 rounded">{window.location.origin}</code></p>
                <p>3. Add Redirect URL: <code className="bg-yellow-100 px-1 rounded">{window.location.origin}/reset-password</code></p>
                <p>4. Save changes and test the reset flow again</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}