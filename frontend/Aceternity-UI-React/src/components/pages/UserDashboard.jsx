import React, { useState, useEffect } from 'react';
import {
  User, BookOpen, BarChart3, Upload, LogOut,
  FileText, Brain, ArrowRight, RefreshCw, Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { InteractiveHoverButton } from '../ui/interactive-hover-button';

export default function UserDashboard() {
  const { user, logout: authLogout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [recentPapers, setRecentPapers] = useState([]);
  const [stats, setStats] = useState({ totalPapers: 0 });
  const [loading, setLoading] = useState(true);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const isStudent = user?.role === 'student';
      const papersEndpoint = isStudent ? '/student/papers' : '/teacher/papers';
      const statsEndpoint = isStudent ? '/student/stats' : null;
      const response = await apiClient.get(papersEndpoint, { params: { limit: 5, page: 1 } });

      const papersList = response.data?.papers || response.data?.data || (Array.isArray(response.data) ? response.data : []);

      const recentFive = Array.isArray(papersList)
        ? papersList.slice(0, 5)
        : [];

      setRecentPapers(recentFive);
      if (response.data?.stats?.total !== undefined) {
        setStats({ totalPapers: response.data.stats.total });
      } else if (statsEndpoint) {
        const statsResponse = await apiClient.get(statsEndpoint);
        setStats({ totalPapers: statsResponse.data?.stats?.totalPapers || 0 });
      } else {
        setStats({ totalPapers: response.data?.pagination?.total || (Array.isArray(papersList) ? papersList.length : 0) });
      }
    } catch (error) {
      console.error('Failed to fetch papers:', error);
      setRecentPapers([]);
      setStats({ totalPapers: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      navigate('/super-admin', { replace: true });
    } else if (user?.role === 'admin') {
      navigate('/college-admin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (['reviewer', 'admin', 'super_admin'].includes(user?.role)) return;
    fetchPapers();
  }, [user]);

  const handleLogout = () => {
    authLogout();
    navigate('/');
  };

  const quickActions = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: 'Upload New Paper',
      description: 'Analyze a new question paper',
      action: () => navigate('/upload'),
      color: 'from-orange-500 to-orange-600',
      badge: 'Analysis',
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'View All Papers',
      description: 'Browse your repository collection',
      action: () => navigate('/papers'),
      color: 'from-amber-500 to-orange-500',
      badge: 'Repository',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Analytics & Reports',
      description: 'View detailed question paper analytics',
      action: () => {
        if (recentPapers.length > 0 && recentPapers[0]._id) {
          navigate(`/result/${recentPapers[0]._id}`);
        } else {
          navigate('/papers');
        }
      },
      color: 'from-orange-600 to-red-500',
      badge: 'Insights',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: user?.role === 'student' ? 'Become a Teacher' : 'Total Papers',
      description: user?.role === 'student' ? 'Choose independent or college-affiliated teacher access' : `${stats.totalPapers} paper${stats.totalPapers !== 1 ? 's' : ''} uploaded`,
      action: () => navigate(user?.role === 'student' ? '/profile' : '/papers'),
      color: 'from-stone-700 to-stone-900',
      badge: 'Account',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-[#57534E] text-sm font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-16">
      {/* ── Subheader / User Banner ── */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#E8E2D7] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold text-xl">
              {user?.userName ? user.userName.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#111827]">Academic Dashboard</h1>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  {user?.role || 'User'}
                </span>
              </div>
              <p className="text-xs text-[#57534E] mt-0.5">
                Welcome back, <strong className="text-[#111827]">{user?.userName || user?.name || 'Academician'}</strong> &bull; {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLoading(true); fetchPapers(); }}
              className="p-2.5 rounded-xl border border-[#E8E2D7] bg-[#FAF7F2] hover:bg-neutral-100 text-[#57534E] hover:text-[#111827] transition-all shadow-sm"
              title="Refresh Papers"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-105 transition-all flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Paper
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-[#E8E2D7] bg-[#FAF7F2] hover:bg-red-50 text-[#57534E] hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-6 py-4">
        {/* Quick Actions */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-3 py-1 rounded-full">
              ⚡ Action Center
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="group relative bg-white border border-[#E8E2D7] rounded-2xl p-6 text-left shadow-sm hover:shadow-md hover:border-orange-300 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-[#111827] group-hover:text-orange-600 transition-colors">
                      {action.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#57534E] leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="flex items-center text-xs font-bold text-orange-600 mt-4 group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Recent Papers */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 px-3 py-1 rounded-full">
                📄 Recent Question Papers
              </span>
            </div>
            <button
              onClick={() => navigate('/papers')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline"
            >
              <span>View All Papers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPapers.length > 0 ? (
            <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
              {recentPapers.map((paper, index) => (
                <div
                  key={paper._id || index}
                  className="p-5 border-b border-[#F2ECE1] last:border-b-0 hover:bg-[#FAF7F2]/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <h3 className="text-[#111827] font-bold text-base hover:text-orange-600 transition-colors">
                        {paper['Course Name'] || 'Untitled Examination Paper'}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {paper['Course Code'] && (
                        <span className="bg-orange-50 border border-orange-200 text-orange-700 font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {paper['Course Code']}
                        </span>
                      )}
                      {paper['Branch'] && (
                        <span className="bg-[#FAF7F2] border border-[#E8E2D7] text-[#57534E] font-medium px-2.5 py-0.5 rounded-md">
                          {paper['Branch']}
                        </span>
                      )}
                      {paper['Semester'] && (
                        <span className="bg-[#FAF7F2] border border-[#E8E2D7] text-[#57534E] font-medium px-2.5 py-0.5 rounded-md">
                          Sem {paper['Semester']}
                        </span>
                      )}
                    </div>
                    {paper['College Name'] && (
                      <div className="text-[11px] text-[#78716C] mt-2 font-medium">
                        {paper['College Name']}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0">
                    <div className="text-[11px] text-[#78716C]">
                      {paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : ''}
                    </div>
                    <button
                      onClick={() => navigate(`/result/${paper._id}`)}
                      className="px-4 py-1.5 rounded-full bg-white border border-orange-300 hover:bg-orange-50 text-orange-600 hover:text-orange-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      <span>Analysis</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E8E2D7] border-dashed rounded-2xl p-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-[#111827] font-bold text-lg mb-1">No question papers analyzed yet</h3>
              <p className="text-[#57534E] text-sm mb-6 max-w-sm mx-auto leading-relaxed">
                Upload your first engineering examination paper to unlock instant Bloom's taxonomy & Course Outcome analytics.
              </p>
              <button
                onClick={() => navigate('/upload')}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 transition-all inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Paper Now
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}