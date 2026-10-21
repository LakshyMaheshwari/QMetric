import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import ReviewPaperModal from '../ReviewPaperModal';
import { DashboardSkeleton } from '../SkeletonLoader';
import {
  FileText, CheckCircle2, Clock, XCircle, RotateCcw,
  UserCheck, Search, Filter, RefreshCw, X, AlertCircle,
  Building, BookOpen, User, Award, ExternalLink
} from 'lucide-react';

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [papers, setPapers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    if (user && !['reviewer', 'admin', 'super_admin'].includes(user.role)) navigate('/dashboard');
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: 50 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const [papersRes, statsRes] = await Promise.all([
        apiClient.get('/reviewer/papers', { params }),
        apiClient.get('/reviewer/stats'),
      ]);

      if (papersRes.data && !papersRes.data.error) {
        setPapers(papersRes.data.papers || []);
        if (papersRes.data.pagination) setPagination(papersRes.data.pagination);
      } else {
        setMessage({ text: papersRes.data?.message || 'Failed to fetch papers', type: 'error' });
      }

      if (statsRes.data && !statsRes.data.error) {
        setStats(statsRes.data.stats || statsRes.data);
      }
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Failed to load reviewer records.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/reviewer/pending-count');
      if (response.data && !response.data.error) setPendingCount(response.data.pending || 0);
    } catch (error) {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchPendingCount();
  }, [fetchData, fetchPendingCount]);

  const handleReview = (paper) => { setSelectedPaper(paper); setShowReviewModal(true); };

  const handleReviewComplete = (updatedPaper) => {
    setShowReviewModal(false);
    setSelectedPaper(null);
    fetchData();
    fetchPendingCount();
    setMessage({
      text: `Paper evaluation for "${updatedPaper?.courseName || 'assessment'}" saved successfully!`,
      type: 'success',
    });
    setTimeout(() => setMessage({ text: '', type: '' }), 4000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':       return { bg: 'bg-emerald-100 border-emerald-200 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Approved' };
      case 'rejected':       return { bg: 'bg-red-100 border-red-200 text-red-700',             icon: <XCircle className="w-3.5 h-3.5" />,     label: 'Rejected' };
      case 'needs_revision': return { bg: 'bg-amber-100 border-amber-200 text-amber-700',       icon: <RotateCcw className="w-3.5 h-3.5" />,   label: 'Needs Revision' };
      default:               return { bg: 'bg-yellow-50 border-yellow-200 text-yellow-700',     icon: <Clock className="w-3.5 h-3.5" />,       label: 'Pending' };
    }
  };

  const collegeNameDisplay = user?.collegeName || user?.collegeId?.name || 'Your College';

  if (loading && papers.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={6} tableRows={8} tableCols={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-10 px-4" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {loading && papers.length > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-orange-500 animate-pulse z-50" />
      )}
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E8E2D7] p-6 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3 h-3" />{collegeNameDisplay}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 capitalize">
                Reviewer Portal
              </span>
              {pendingCount > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 animate-pulse flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingCount} paper{pendingCount > 1 ? 's' : ''} pending review
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] flex items-center gap-2.5">
              📋 Paper Reviewer Dashboard
            </h1>
            <p className="text-sm text-[#57534E] mt-1">
              Welcome, <span className="text-[#111827] font-semibold">{user?.fullName || user?.userName}</span>. Audit assessments, examine Bloom taxonomy compliance, and submit feedback.
            </p>
          </div>
          <button
            onClick={() => { fetchData(); fetchPendingCount(); }}
            disabled={loading}
            className="p-2.5 bg-[#FAF7F2] hover:bg-neutral-100 text-[#57534E] hover:text-orange-600 rounded-xl transition-all border border-[#E8E2D7] hover:border-orange-300 flex items-center justify-center shadow-sm"
            title="Refresh papers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ text: '', type: '' })} className="hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { label: 'Pending',    val: stats.pending ?? 0,     icon: Clock,        color: 'bg-amber-50 border-amber-200', iconColor: 'text-amber-600', valColor: 'text-amber-800',   sub: 'Awaiting audit' },
              { label: 'Approved',   val: stats.approved ?? 0,    icon: CheckCircle2, color: 'bg-emerald-50 border-emerald-200', iconColor: 'text-emerald-600', valColor: 'text-emerald-800', sub: 'Validated' },
              { label: 'Revision',   val: stats.needsRevision ?? 0, icon: RotateCcw,  color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600', valColor: 'text-orange-800', sub: 'Changes requested' },
              { label: 'Rejected',   val: stats.rejected ?? 0,    icon: XCircle,      color: 'bg-red-50 border-red-200',    iconColor: 'text-red-600',    valColor: 'text-red-800',     sub: 'Non-compliant' },
              { label: 'Total',      val: stats.total ?? 0,       icon: FileText,     color: 'bg-white border-[#E8E2D7]',   iconColor: 'text-orange-500', valColor: 'text-[#111827]',   sub: 'College papers' },
              { label: 'My Reviews', val: stats.myReviews ?? 0,   icon: UserCheck,    color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600', valColor: 'text-purple-800', sub: 'Reviewed by you' },
            ].map(({ label, val, icon: Icon, color, iconColor, valColor, sub }) => (
              <div key={label} className={`p-4 rounded-2xl border ${color} shadow-sm`}>
                <div className="flex items-center justify-between text-[#57534E] mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className={`text-2xl font-bold ${valColor}`}>{val}</div>
                <p className="text-[11px] text-[#78716C] mt-1">{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8E2D7] shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="text"
                placeholder="Search course, code, teacher..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[#A8A29E] hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
              >
                <option value="all">All Review Statuses</option>
                <option value="pending">⏳ Pending Review</option>
                <option value="approved">✅ Approved</option>
                <option value="needs_revision">🔄 Needs Revision</option>
                <option value="rejected">❌ Rejected</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-[#57534E] whitespace-nowrap self-end sm:self-auto">
            Showing <strong className="text-[#111827]">{papers.length}</strong> {papers.length === 1 ? 'paper' : 'papers'}
          </div>
        </div>

        {/* Papers Table */}
        <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#57534E]">
              <thead className="bg-[#FAF7F2] text-xs uppercase tracking-wider text-[#57534E] border-b border-[#E8E2D7]">
                <tr>
                  <th className="py-4 px-6 font-semibold">Course / Subject</th>
                  <th className="py-4 px-6 font-semibold">Uploaded By</th>
                  <th className="py-4 px-6 font-semibold">Questions</th>
                  <th className="py-4 px-6 font-semibold">Quality Score</th>
                  <th className="py-4 px-6 font-semibold">Review Status</th>
                  <th className="py-4 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE1]">
                {papers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-[#57534E]">
                      <FileText className="w-10 h-10 mx-auto text-orange-300 mb-3" />
                      <p className="text-base font-semibold text-[#111827]">No papers found</p>
                      <p className="text-xs text-[#78716C] mt-1">
                        {statusFilter !== 'all'
                          ? `There are no papers with status "${statusFilter.replace('_', ' ')}" in your college.`
                          : 'No question papers have been uploaded yet in your college.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  papers.map((paper) => {
                    const statusBadge = getStatusBadge(paper.reviewStatus);
                    const courseTitle = paper.courseName || paper['Course Name'] || 'Untitled Course';
                    const courseCode = paper.courseCode || paper['Course Code'] || '';
                    const teacherName = paper.userId?.fullName || paper.userId?.userName || paper['Course Teacher'] || 'Unknown';
                    const department = paper.userId?.department || paper.branch || paper['Branch'] || '';

                    const getQuestionsCount = (p) => {
                      const collectedDataQuestions = Array.isArray(p?.questions)
                        ? p.questions.flatMap((item) => Array.isArray(item?.QuestionData) ? item.QuestionData : [])
                        : [];
                      if (collectedDataQuestions.length > 0) return collectedDataQuestions.length;
                      if (Array.isArray(p?.questions)) return p.questions.length;
                      const rawQuestions = p?.['Collected Data']?.[0]?.QuestionData;
                      return Array.isArray(rawQuestions) ? rawQuestions.length : 0;
                    };

                    const questionsCount = getQuestionsCount(paper);
                    const qualityScore = Number(paper?.qualityScore ?? paper?.['Collected Data']?.[0]?.FinalScore ?? 0);
                    const isPending = !paper.reviewStatus || paper.reviewStatus === 'pending';

                    return (
                      <tr key={paper._id} className={`hover:bg-[#FAF7F2]/60 transition-colors ${isPending ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-orange-50 text-orange-500 mt-0.5 flex-shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-[#111827]">{courseTitle}</div>
                              <div className="text-xs text-[#78716C] flex items-center gap-2 mt-0.5">
                                {courseCode && (
                                  <span className="font-mono bg-[#FAF7F2] border border-[#E8E2D7] px-1.5 py-0.5 rounded text-[11px]">
                                    {courseCode}
                                  </span>
                                )}
                                {paper.semester && <span>Sem {paper.semester}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[#A8A29E]" />
                            <span className="font-medium text-[#111827]">{teacherName}</span>
                          </div>
                          {department && <div className="text-xs text-[#78716C] mt-0.5">{department}</div>}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[#111827] font-semibold">{questionsCount}</span>
                          <span className="text-[#78716C] text-xs ml-1">items</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-[#A8A29E]" />
                            <span className={`font-semibold text-sm ${
                              qualityScore >= 75 ? 'text-emerald-600' :
                              qualityScore >= 50 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {qualityScore}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg}`}>
                            {statusBadge.icon}
                            <span>{statusBadge.label}</span>
                          </span>
                          {paper.reviewedBy && (
                            <div className="text-[11px] text-[#78716C] mt-1">
                              by {paper.reviewedBy.fullName || paper.reviewedBy.userName || 'Reviewer'}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleReview(paper)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              isPending
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02]'
                                : 'bg-[#FAF7F2] hover:bg-neutral-100 text-[#57534E] border border-[#E8E2D7]'
                            }`}
                          >
                            {isPending ? <>📝 <span>Review</span></> : <>👁️ <span>View</span></>}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8E2D7] bg-[#FAF7F2]/60 text-xs">
              <span className="text-[#57534E]">Page {pagination.page} of {pagination.pages}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E2D7] text-[#57534E] hover:text-orange-600 hover:border-orange-300 disabled:opacity-40 transition-all font-medium">
                  Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
                  className="px-3 py-1.5 rounded-xl bg-white border border-[#E8E2D7] text-[#57534E] hover:text-orange-600 hover:border-orange-300 disabled:opacity-40 transition-all font-medium">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showReviewModal && selectedPaper && (
        <ReviewPaperModal
          paper={selectedPaper}
          onClose={() => { setShowReviewModal(false); setSelectedPaper(null); }}
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  );
};

export default ReviewerDashboard;
