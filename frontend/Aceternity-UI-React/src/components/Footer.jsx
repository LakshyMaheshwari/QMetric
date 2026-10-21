import React from 'react';
import { FileText, ArrowUpRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/feedback') {
    return null;
  }

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        background: 'linear-gradient(180deg, #FBF9F5 0%, #F5F0E8 100%)',
        borderTop: '1px solid #ECE5D8',
      }}
    >
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#D6CDB7 0.7px, transparent 0.7px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-12 gap-10 lg:gap-16">

          {/* Brand — wider column */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/15">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-slate-800">Q</span>
                <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Metric</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Ensuring academic excellence through systematic question paper quality analysis for engineering education.
            </p>

            {/* OBE / Quality Badge */}
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-100/80 rounded-full shadow-sm">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-slate-600">OBE Aligned Quality Engine</span>
            </div>
          </div>

          {/* Analysis Features */}
          <div className="md:col-span-2">
            <h4 className="text-slate-800 font-bold text-xs uppercase tracking-[0.15em] mb-5">Analysis</h4>
            <div className="space-y-3">
              {['CO Mapping', "Bloom's Taxonomy", 'Module Coverage', 'Difficulty Matrix'].map(item => (
                <a key={item} href="#features" className="group flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors">
                  <span>{item}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </a>
              ))}
            </div>
          </div>

          {/* Support */}
          <div className="md:col-span-2">
            <h4 className="text-slate-800 font-bold text-xs uppercase tracking-[0.15em] mb-5">Support</h4>
            <div className="space-y-3">
              {['User Guide', 'Technical Support', 'Quality Standards', 'FAQ'].map(item => (
                <a key={item} href="#" className="group flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors">
                  <span>{item}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h4 className="text-slate-800 font-bold text-xs uppercase tracking-[0.15em] mb-5">Company</h4>
            <div className="space-y-3">
              {[
                { label: 'About Project', href: '#about' },
                { label: 'Research', href: '#' },
                { label: 'Credits', href: '/credits', isRoute: true },
                { label: 'Feedback', href: '/feedback', isRoute: true },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.isRoute ? undefined : item.href}
                  onClick={item.isRoute ? (e) => { e.preventDefault(); navigate(item.href); } : undefined}
                  className="group flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-2">
            <h4 className="text-slate-800 font-bold text-xs uppercase tracking-[0.15em] mb-5">Get Started</h4>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/upload')}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-orange-500/15 hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-300"
              >
                Upload Paper
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-2.5 px-4 bg-white border border-orange-200 text-orange-600 text-sm font-semibold rounded-xl hover:bg-orange-50 transition-all duration-300"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-[#E0D8C8] flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-xs text-slate-400">
            © 2025 QMetric — Automated Question Paper Quality Analysis System. All rights reserved.
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Built with</span>
            <span className="text-orange-500">♦</span>
            <span>by the QMetric Team</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
