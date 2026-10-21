import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center text-center px-4 pt-20 pb-12">
      <div className="relative mb-6">
        <h1 className="text-9xl md:text-[12rem] font-black text-orange-950/10 tracking-widest select-none">
          404
        </h1>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase font-extrabold tracking-widest text-orange-600 bg-orange-100 px-3 py-1 rounded-full mb-2">
            Error
          </span>
          <span className="text-2xl md:text-3xl font-extrabold text-[#111827]">
            Page Not Found
          </span>
        </div>
      </div>

      <p className="text-[#57534E] max-w-md text-base leading-relaxed mb-8">
        The destination you are looking for doesn't exist, has been moved, or you may need to sign in with proper credentials.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm transition-all shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-neutral-50 text-[#111827] font-semibold text-sm transition-all border border-[#E8E2D7] hover:border-orange-300 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}
