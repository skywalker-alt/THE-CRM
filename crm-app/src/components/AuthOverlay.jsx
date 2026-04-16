import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

/**
 * AuthOverlay (Neo-Memphis)
 * Corrected to strictly use signInWithPassword and include verbose logging.
 */
export function AuthOverlay() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Normalize input (common source of "Invalid Login" errors)
    const normalizedEmail = email.trim();

    try {
      console.log('Attempting login for:', normalizedEmail);
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password, // Password should not be trimmed as it may contain spaces
      });

      if (authError) {
        console.error('Supabase Auth Error:', authError);
        throw authError;
      }

      console.log('Login successful:', data.user.id);
      // App.jsx will handle the session change automatically via useLeadStore's onAuthStateChange
    } catch (err) {
      console.error('Catch Block Error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-bg-deep flex items-center justify-center p-4">
      {/* Background Blobs for Atmosphere */}
      <div className="blob-shape blob-cyan -top-20 -left-20" />
      <div className="blob-shape blob-magenta -bottom-20 -right-20" />

      <div className="w-full max-w-md relative">
        {/* Brutalist Shadow/Border Container */}
        <div className="absolute inset-0 bg-neo-black translate-x-3 translate-y-3 rounded-[2rem]" />
        
        <div className="relative bg-bg-surface border-4 border-neo-black rounded-[2rem] p-8 md:p-12 overflow-hidden">
          {/* Brand Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neo-yellow border-2 border-neo-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 transform -rotate-3">
              <LogIn className="text-neo-black w-8 h-8" />
            </div>
            <h1 className="text-4xl font-black text-neo-white uppercase tracking-tighter mb-2">
              Q-CRM <span className="text-neo-cyan">Login</span>
            </h1>
            <p className="text-text-muted font-bold text-sm tracking-widest uppercase">
              Secure Private Workspace
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-neo-cyan transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-black/40 border-2 border-gray-800 rounded-2xl focus:border-neo-cyan focus:ring-0 text-white font-bold transition-all outline-none"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-neo-magenta transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 bg-black/40 border-2 border-gray-800 rounded-2xl focus:border-neo-magenta focus:ring-0 text-white font-bold transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-2xl text-red-500 text-sm font-bold animate-shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full neo-button bg-neo-blue text-white py-5 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : (
                <span className="text-lg font-black uppercase tracking-wider">Sign In Now</span>
              )}
            </button>
          </form>

          {/* Help Text */}
          <p className="mt-8 text-center text-xs font-bold text-gray-600 uppercase tracking-widest">
            Contact admin if you don't have access
          </p>
        </div>
      </div>
    </div>
  );
}
