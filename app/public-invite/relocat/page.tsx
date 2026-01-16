// app/public-invite/relocat/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Hammer, Rocket } from "lucide-react";
import { Suspense } from "react";

// Inner component to handle search params safely
function ComingSoonContent() {
  const searchParams = useSearchParams();
  // Get the 'title' from the URL (e.g., ?title=About Us) or default to "Page"
  const pageTitle = searchParams.get("title") || "Page";

  return (
    <div className="max-w-2xl w-full text-center px-4">
      {/* Icon Badge */}
      <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <Rocket className="text-[#1e3a8a] w-10 h-10" />
      </div>

      {/* Dynamic Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-[#1e3a8a] mb-4">
        {pageTitle}
      </h1>
      
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-bold uppercase tracking-wide flex items-center gap-2">
          <Clock size={14} /> Coming Soon
        </span>
      </div>

      <p className="text-lg text-gray-600 mb-10 leading-relaxed">
        We are currently working hard to build the <strong>{pageTitle}</strong> page. 
        It will be available very soon with exciting updates and features. 
        Stay tuned!
      </p>

      {/* Decorative Construction Area */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-10 shadow-sm flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="p-3 bg-gray-100 rounded-lg">
          <Hammer className="text-gray-400" size={24} />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900">Under Construction</h3>
          <p className="text-sm text-gray-500">Our developers are writing code right now.</p>
        </div>
      </div>

      {/* Action Button */}
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 px-8 py-3 bg-[#1e3a8a] text-white rounded-xl font-medium hover:bg-[#1e3a8a]/90 transition-all shadow-lg hover:shadow-blue-900/20"
      >
        <ArrowLeft size={18} />
        Return to Home
      </Link>
    </div>
  );
}

export default function RelocatPage() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

      <Suspense fallback={<div>Loading...</div>}>
        <ComingSoonContent />
      </Suspense>
    </div>
  );
}