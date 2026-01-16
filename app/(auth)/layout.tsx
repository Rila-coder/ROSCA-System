import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Authentication | ROSCA",
  description: "Login or register to access your ROSCA account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header with back button */}
      <header className="container mx-auto px-4 py-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-text/70 hover:text-primary transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center overflow-hidden p-0">
                <Image
                  src="/Images/rosca_logo.png"
                  alt="ROSCA Logo"
                  width={60}
                  height={60}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-bold text-primary sm:block">
                ROSCA
              </span>
            </Link>
            <p className="text-text/60 mt-2">Community Savings Platform</p>
          </div>

          {/* Auth Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            {children}
          </div>

          {/* Bottom text */}
          <div className="text-center mt-6 text-text/60 text-sm">
            <p>By continuing, you agree to our</p>
            <p>
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
