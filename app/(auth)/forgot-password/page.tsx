'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=Email, 2=New Pass, 3=Success
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error('Please enter your email address');
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setStep(2);
    toast.success('Please set your new password');
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password updated successfully!');
        setStep(3);
      } else {
        toast.error(data.message || 'Failed to update password');
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '' };
    if (password.length < 6) return { strength: 1, text: 'Weak', color: 'bg-error' };
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecial].filter(Boolean).length;
    
    if (strength === 1) return { strength: 2, text: 'Fair', color: 'bg-accent' };
    if (strength === 2) return { strength: 3, text: 'Good', color: 'bg-accent' };
    if (strength === 3) return { strength: 4, text: 'Strong', color: 'bg-success' };
    return { strength: 4, text: 'Very Strong', color: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">
          {step === 1 ? 'Reset Password' : 
           step === 2 ? 'Set New Password' : 
           'Password Updated!'}
        </h1>
        <p className="text-text/60">
          {step === 1 ? 'Enter your email to continue' :
           step === 2 ? 'Create a new password for your account' :
           'Your password has been successfully updated'}
        </p>
      </div>

      {step === 1 && (
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-text/40" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-field pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full btn-primary py-3 flex items-center justify-center"
          >
            Continue
          </button>

          <div className="pt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 text-text/70 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handlePasswordUpdate} className="space-y-6">
          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-text/40" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="input-field pl-10 pr-10"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff size={18} className="text-text/40" />
                ) : (
                  <Eye size={18} className="text-text/40" />
                )}
              </button>
            </div>
            
            {/* Password Strength */}
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Password strength:</span>
                  <span className={`font-medium ${
                    passwordStrength.text === 'Weak' ? 'text-error' :
                    passwordStrength.text === 'Fair' ? 'text-accent' :
                    passwordStrength.text === 'Good' ? 'text-accent' :
                    'text-success'
                  }`}>
                    {passwordStrength.text}
                  </span>
                </div>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-text/40" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="input-field pl-10 pr-10"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} className="text-text/40" />
                ) : (
                  <Eye size={18} className="text-text/40" />
                )}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-xs text-error">Passwords do not match</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-medium text-text mb-2 text-sm">Password Requirements:</h4>
            <ul className="space-y-1 text-xs text-text/70">
              {[
                { text: 'At least 6 characters', valid: formData.password.length >= 6 },
                { text: 'Contains uppercase letter', valid: /[A-Z]/.test(formData.password) },
                { text: 'Contains lowercase letter', valid: /[a-z]/.test(formData.password) },
                { text: 'Contains number', valid: /\d/.test(formData.password) },
              ].map((req, index) => (
                <li key={index} className="flex items-center space-x-2">
                  {req.valid ? (
                    <CheckCircle size={12} className="text-success" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                  <span className={req.valid ? 'text-success' : ''}>{req.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Update Password'
            )}
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center space-x-2 text-text/70 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Email Entry</span>
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
            <CheckCircle size={32} className="text-success" />
          </div>
          
          <div className="space-y-2">
            <p className="text-text font-medium">
              Password updated successfully!
            </p>
            <p className="text-text/60 text-sm">
              You can now log in with your new password.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full btn-primary py-3"
            >
              Go to Login
            </button>
            
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-text/70 hover:text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      )}

      {/* Security Info */}
      <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-start space-x-2">
          <AlertCircle size={16} className="text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-primary mb-1">Security Note</p>
            <p className="text-text/70">
              Your password is securely hashed and never stored in plain text. 
              Make sure to choose a strong, unique password.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}