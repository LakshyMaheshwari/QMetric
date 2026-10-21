import React from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeedbackCard } from '../ui/feedback-card';
import { Testimonials } from '../ui/demo.tsx';
import Skiper39 from '../ui/skiper39';

const FeedbackPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-8 relative overflow-hidden">
      {/* ── Ambient Background Elements ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-amber-50/30 pointer-events-none" />
      <div className="absolute top-24 left-1/4 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-14 pb-8">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white border border-[#E8E2D7] rounded-full px-4 py-1.5 text-xs font-bold text-orange-600 mb-6 shadow-sm">
            <MessageSquare className="w-3.5 h-3.5" />
            Feedback & Community Insights
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[#111827] mb-4 tracking-tight">
            Community{' '}
            <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Feedback
            </span>
          </h1>

          <p className="text-base text-[#57534E] max-w-2xl mx-auto leading-relaxed">
            Your insights help us continuously refine and enhance QPQA. See what academic leaders say and share your experience with our automated question paper analysis engine.
          </p>
        </div>
      </section>

      {/* ── Interactive Emoji Feedback Card (Above What Educators Say) ── */}
      <div className="flex justify-center my-6 px-4 relative z-20">
        <FeedbackCard />
      </div>

      {/* ── Animated Testimonials Columns ("What Educators Say") ── */}
      <Testimonials />

      {/* ── Back to Home Link ── */}
      <div className="text-center pt-8 pb-4 relative z-20">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#57534E] hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>

      {/* ── Animated Walking Crowd Canvas at Bottom ── */}
      <div className="relative w-full overflow-hidden mt-6">
        <Skiper39 />
      </div>
    </div>
  );
};

export default FeedbackPage;