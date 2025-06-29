import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, Eye, EyeOff, Key, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ManualPasswordReset() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setSuccess('');

      console.log('Attempting to reset password for:', email);
      
      // First, check if the user exists in auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);

      if (authError) {
        console.error('Error finding user in auth:', authError);
        setError(`Error finding user in auth system: ${authError.message}`);
        return;
      }

      if (!authUser || !authUser.user) {
        setError(`User with email ${email} not found in authentication system. Please check the email address.`);
        return;
      }

      const userId = authUser.user.id;
      console.log('User found in auth system, ID:', userId);

      // Check if user exists in public.users table
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking user profile:', profileError);
      }

      // If user doesn't exist in public.users, create the profile
      if (!profileData) {
        console.log('User profile not found in public.users table, creating it...');
        
        // Create a basic profile with default values
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: userId,
              email: email,
              name: email.split('@')[0], // Use part of email as name
              role: 'customer' // Default role
            }
          ]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
          setError(`Error creating user profile: ${insertError.message}`);
          return;
        }
        
        console.log('User profile created successfully');
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        
        // Check for specific error types
        if (updateError.message?.includes('service_role key is required')) {
          setError('Admin privileges required. This operation requires a service role key.');
        } else {
          setError(`Failed to update password: ${updateError.message}`);
        }
        return;
      }

      console.log('Password updated successfully');
      setSuccess(`Password for ${email} has been updated successfully!`);
      
      // Clear form
      setNewPassword('');
      setConfirmPassword('');

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
            <Key className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Manual Password Reset</h1>
            <p className="opacity-90 mt-2">Admin tool to directly reset user passwords</p>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
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
                  placeholder="Confirm new password"
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
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Reset Password
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

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Admin Use Only</h4>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>This tool is for administrative use only and bypasses the normal password reset flow.</p>
                <p>No email confirmation is sent to the user when their password is changed.</p>
                <p>Use with caution and only for legitimate password recovery situations.</p>
                <p>After resetting, manually inform the user of their new password via email, WhatsApp, or other means.</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}