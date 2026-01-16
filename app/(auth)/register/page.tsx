"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, Phone, Eye, EyeOff, Check } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ State for visual "Redirect" loader transition
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (!formData.acceptTerms) {
      toast.error("You must accept the terms and conditions");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          acceptTerms: formData.acceptTerms,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Registration successful! Redirecting to login...");
        
        // ✅ 1. Clear any stale token so ProtectedRoute doesn't get confused
        localStorage.removeItem("token");

        // ✅ 2. Show the visual loader to mimic "Protected Route" feel
        setIsRedirecting(true);
        
        // ✅ 3. Animate the bar and redirect
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += 5;
          if (currentProgress >= 100) {
            clearInterval(interval);
            // Force full reload to Login page
            window.location.href = "/login";
          }
          setProgress(currentProgress);
        }, 50); // 1 second total duration

      } else {
        const errorMessage = data.errors?.[0]?.message || data.message || "Registration failed";
        toast.error(errorMessage);
        setLoading(false);
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: "", color: "" };
    if (password.length < 6)
      return { strength: 1, text: "Weak", color: "bg-error" };

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const strength = [
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecial,
    ].filter(Boolean).length;

    if (strength === 1)
      return { strength: 2, text: "Fair", color: "bg-accent" };
    if (strength === 2)
      return { strength: 3, text: "Good", color: "bg-accent" };
    if (strength === 3)
      return { strength: 4, text: "Strong", color: "bg-success" };
    return { strength: 4, text: "Very Strong", color: "bg-success" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // ✅ VISUAL LOADER RENDER (Transition to Login)
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111827]">
        <div className="w-64 text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-2 border-transparent border-t-[#14B8A6] border-r-[#14B8A6]/50 rounded-full animate-spin"></div>
            <div className="absolute inset-4 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/5 p-1">
                <Image
                  src="/Images/rosca_logo.png"
                  alt="ROSCA Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover rounded-full"
                  priority
                />
              </div>
            </div>
          </div>
          
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-[#14B8A6] transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">{progress}%</p>
            <p className="text-gray-400 text-sm text-right">Redirecting to Login...</p>
          </div>
        </div>
        <style jsx global>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-spin { animation: spin 1s linear infinite; }
        `}</style>
      </div>
    );
  }

  // STANDARD FORM RENDER
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">Create Account</h1>
        <p className="text-text/60">
          Join thousands managing their savings together
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-text mb-2"
          >
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className="text-text/40" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="input-field pl-10"
              placeholder="John Doe"
              disabled={loading}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text mb-2"
          >
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
              disabled={loading}
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-text mb-2"
          >
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Phone size={18} className="text-text/40" />
            </div>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              className="input-field pl-10"
              placeholder="+94 77 123 4567"
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text mb-2"
          >
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-text/40" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
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
                <span
                  className={`font-medium ${
                    passwordStrength.text === "Weak"
                      ? "text-error"
                      : passwordStrength.text === "Fair"
                      ? "text-accent"
                      : passwordStrength.text === "Good"
                      ? "text-accent"
                      : "text-success"
                  }`}
                >
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
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-text mb-2"
          >
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={18} className="text-text/40" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
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
          {formData.confirmPassword &&
            formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-xs text-error">Passwords do not match</p>
            )}
        </div>

        {/* Terms & Conditions */}
        <div className="flex items-start">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={handleChange}
            className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary mt-1"
            disabled={loading}
          />
          <label htmlFor="acceptTerms" className="ml-2 block text-sm text-text">
            I agree to the{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-8 flex items-center">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="px-4 text-text/50 text-sm">OR</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Login link */}
      <div className="text-center">
        <p className="text-text/70">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-semibold hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Benefits */}
      <div className="mt-8 space-y-3">
        <h3 className="font-medium text-text">Why join ROSCA?</h3>
        <div className="space-y-2">
          {[
            "Create unlimited savings groups",
            "Track payments in real-time",
            "Get smart notifications",
            "100% secure and transparent",
            "Free for up to 3 groups",
          ].map((benefit, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Check size={16} className="text-success" />
              <span className="text-sm text-text/70">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}