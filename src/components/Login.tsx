import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, LogIn, UserPlus, AlertCircle, Info } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'manager' | 'waiter' | 'kitchen' | 'customer' | 'bar'>('customer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, name, role);
        if (error) {
          console.error('Sign up error:', error);
          
          // Handle specific error cases
          if (error.message?.includes('User already registered') || 
              error.message?.includes('user_already_exists') ||
              error.code === 'user_already_exists') {
            // Automatically switch to sign-in mode
            setIsSignUp(false);
            setSuccess('An account with this email already exists. Please sign in with your password below.');
            setError('');
          } else if (error.message?.includes('Password should be at least')) {
            setError('Password must be at least 6 characters long.');
          } else if (error.message?.includes('Invalid email')) {
            setError('Please enter a valid email address.');
          } else {
            setError(error.message || 'Failed to create account. Please try again.');
          }
        } else {
          setSuccess('Account created successfully! You can now sign in.');
          // Switch to sign in mode after successful signup
          setTimeout(() => {
            setIsSignUp(false);
            setSuccess('');
          }, 2000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          console.error('Sign in error:', error);
          
          // Handle specific sign in errors
          if (error.message?.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else if (error.message?.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link before signing in.');
          } else {
            setError(error.message || 'Failed to sign in. Please try again.');
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleColors = {
    manager: 'from-blue-500 to-blue-600',
    waiter: 'from-green-500 to-green-600',
    kitchen: 'from-orange-500 to-orange-600',
    customer: 'from-purple-500 to-purple-600',
    bar: 'from-pink-500 to-pink-600'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className={`bg-gradient-to-r ${roleColors[role]} p-8 text-white text-center relative`}>
            {/* Language Selector */}
            <div className="absolute top-4 right-4">
              <LanguageSelector variant="compact" />
            </div>
            
            <Users className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">{t('auth.title')}</h1>
            <p className="opacity-90 mt-2">{t('auth.subtitle')}</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  !isSignUp 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('auth.signIn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                  setSuccess('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  isSignUp 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t('auth.signUp')}
              </button>
            </div>

            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.fullName')} *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.role')}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="customer">{t('role.customer')}</option>
                    <option value="waiter">{t('role.waiter')}</option>
                    <option value="kitchen">{t('role.kitchen')}</option>
                    <option value="bar">Bar Staff</option>
                    <option value="manager">{t('role.manager')}</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')} *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.password')} *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm border bg-red-50 border-red-200 text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg text-sm bg-green-50 border border-green-200 text-green-700 flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>{success}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r ${roleColors[role]} text-white p-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  {isSignUp ? t('auth.createAccount') : t('auth.signIn')}
                </>
              )}
            </button>

            {!isSignUp && (
              <div className="text-center text-sm text-gray-500 space-y-2">
                <p>{t('auth.demoAccounts')}</p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div>manager@demo.com / password</div>
                  <div>waiter@demo.com / password</div>
                  <div>kitchen@demo.com / password</div>
                  <div>bar@demo.com / password</div>
                  <div>customer@demo.com / password</div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}