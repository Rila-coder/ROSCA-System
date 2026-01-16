"use client"; // ⬅️ ADDED: This makes it a client component

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation"; // ⬅️ ADDED: For navigation
import {
  ArrowRight,
  Shield,
  Users,
  TrendingUp,
  PlayCircle,
} from "lucide-react";

const comingSoonPath = "/public-invite/relocat";

export default function HeroSection() {
  const router = useRouter(); // ⬅️ ADDED: Initialize router
  const seeds = ["alice", "bob", "charlie", "dave"];

  // ⬅️ UPDATED: Logic fixed to stop "fake login" while keeping design intact
  const handleStartTrial = () => {
    console.log("🚀 Navigating to Login/Register...");

    // REMOVED: The fake localStorage.setItem lines that were causing the header bug.
    // Now we simply check if a real token exists.
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      // If actually logged in, go to dashboard
      router.push("/dashboard");
    } else {
      // If not logged in, go to login page (Header will stay as "Login")
      router.push("/login");
    }
  };

  return (
    <section className="relative min-h-[80vh] md:min-h-[85vh] flex items-center overflow-hidden bg-[#111827]">
      {/* 1. Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/Images/hero_image.jpg"
          alt="Group savings meeting"
          fill
          className="object-cover opacity-60"
          priority
          quality={90}
        />
        {/* Deep Blue Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/95 via-[#0b0c41]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent opacity-80" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl">
          {/* Trust Tagline */}
          <div className="inline-flex items-center space-x-2 bg-[#14B8A6]/20 border border-[#14B8A6]/30 text-[#14B8A6] px-4 py-2 rounded-full mb-6 backdrop-blur-md">
            <Shield size={16} />
            <span className="text-sm font-medium">
              Trusted by 10,000+ Communities
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-5">
            Modern <span className="text-[#14B8A6]">ROSCA</span> <br />
            Platform for <br />
            <span className="text-[#F59E0B]">Community Savings</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8 leading-relaxed">
            Manage your rotating savings groups with complete transparency,
            automated tracking, and built-in trust. Join thousands who are
            transforming their financial future together.
          </p>

          {/* Social Proof (Avatars) - Integrated here for visibility */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5 mb-10">
            <div className="flex -space-x-3">
              {seeds.map((seed, i) => (
                <div
                  key={i}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#1E3A8A] overflow-hidden bg-gray-800 shadow-xl"
                >
                  <img
                    src={`https://i.pravatar.cc/150?u=${seed}`}
                    alt="User profile"
                  />
                </div>
              ))}
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-[#1E3A8A] bg-[#F59E0B] flex items-center justify-center text-white font-bold text-xs shadow-xl">
                +10k
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              <strong className="text-white">Join 10,000+ members</strong>{" "}
              already saving <br />
              and growing their wealth through community circles.
            </p>
          </div>

          {/* Action Buttons - UPDATED */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button
              onClick={handleStartTrial}
              className="start-trial-btn bg-[#14B8A6] hover:bg-[#0D9488] text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg inline-flex items-center justify-center space-x-2 transition-all duration-300 shadow-lg shadow-[#14B8A6]/30"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={20} />
            </button>

            <Link
              href={`${comingSoonPath}?title=How It Works`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg inline-flex items-center justify-center space-x-2 transition-all duration-300"
            >
              <PlayCircle size={20} />
              <span>How It Works</span>
            </Link>
          </div>

          {/* Stats Grid - Glassmorphism style */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 md:p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 transition-transform hover:scale-105">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                ₹50M+
              </div>
              <div className="text-xs md:text-sm text-gray-400">
                Total Savings Managed
              </div>
            </div>
            <div className="p-5 md:p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 transition-transform hover:scale-105">
              <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                5,000+
              </div>
              <div className="text-xs md:text-sm text-gray-400">
                Active Groups
              </div>
            </div>
            <div className="p-5 md:p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 transition-transform hover:scale-105">
              <div className="text-2xl md:text-3xl font-bold text-[#10B981] mb-1">
                99.8%
              </div>
              <div className="text-xs md:text-sm text-gray-400">
                On-time Payments
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Smart Group Card (Desktop Only) */}
      <div className="absolute bottom-6 right-6 z-20 hidden xl:block">
        <div className="bg-[#1E3A8A]/40 backdrop-blur-xl p-5 rounded-3xl border border-white/20 shadow-2xl max-w-xs">
          <div className="flex items-center space-x-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#14B8A6]/20 flex items-center justify-center">
              <Users className="text-[#14B8A6]" size={24} />
            </div>
            <div>
              <div className="font-bold text-white text-lg">
                Smart Savings Group
              </div>
              <div className="text-sm text-[#14B8A6] font-medium">
                8/10 members active
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Total Pool Value</span>
              <span className="font-bold text-white text-lg">₹50,000</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 uppercase tracking-wider">
                  Cycle Progress
                </span>
                <span className="font-bold text-[#14B8A6]">60%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#14B8A6] to-[#10B981] rounded-full transition-all duration-1000"
                  style={{ width: "60%" }}
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-tight">
                Next distribution scheduled for{" "}
                <span className="text-white">Friday, 26th</span>. Recipient:{" "}
                <span className="text-[#F59E0B]">Priya S.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}