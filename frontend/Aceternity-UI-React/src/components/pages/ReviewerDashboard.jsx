import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import ReviewPaperModal from '../ReviewPaperModal';
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

  // Guard: allow only reviewer or admin (super_admin has own dashboard)
  useEffect(() => {
    if (user) {
      if (user.role === 'super_admin') {
        navigate('/super-admin');
      } else if (!['reviewer', 'admin'].includes(user.role)) {
        navigate('/dashboard');
      }
    }
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
        if (papersRes.data.pagination) {
          setPagination(papersRes.data.pagination);
        }
      } else {
        setMessage({ text: papersRes.data?.message || 'Failed to fetch papers', type: 'error' });
      }

      if (statsRes.data && !statsRes.data.error) {
        setStats(statsRes.data.stats || statsRes.data);
      }
    } catch (error) {
      console.error('Error fetching reviewer data:', error);
      setMessage({
        text: error.response?.data?.message || 'Failed to load reviewer records. Check connection.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/reviewer/pending-count');
      if (response.data && !response.data.error) {
        setPendingCount(response.data.pending || 0);
      }
    } catch (error) {
      // Silent fail for badge
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchPendingCount();
  }, [fetchData, fetchPendingCount]);

  const handleReview = (paper) => {
    setSelectedPaper(paper);
    setShowReviewModal(true);
  };

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
      case 'approved':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          label: 'Approved',
        };
      case 'rejected':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-400',
          icon: <XCircle className="w-3.5 h-3.5" />,
          label: 'Rejected',
        };
      case 'needs_revision':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: <RotateCcw className="w-3.5 h-3.5" />,
          label: 'Needs Revision',
        };
      case 'pending':
      default:
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
          icon: <Clock className="w-3.5 h-3.5" />,
          label: 'Pending',
        };
    }
  };

  const collegeNameDisplay = user?.collegeName || user?.collegeId?.name || 'Your College';

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8 pt-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3 h-3" />
                {collegeNameDisplay}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">
                Reviewer Portal
              </span>
              {pendingCount > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingCount} paper{pendingCount > 1 ? 's' : ''} pending review
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              📋 Paper Reviewer Dashboard
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Welcome, <span className="text-zinc-200 font-medium">{user?.fullName || user?.userName}</span>. Audit assessments, examine Bloom taxonomy compliance, and submit feedback.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => { fetchData(); fetchPendingCount(); }}
              disabled={loading}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700 flex items-center justify-center"
              title="Refresh papers"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ text: '', type: '' })} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                <span className="text-xs font-medium uppercase tracking-wider">Pending</span>
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400">{stats.pending ?? 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Awaiting audit</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                <span className="text-xs font-medium uppercase tracking-wider">Approved</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.approved ?? 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Validated</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                <span className="text-xs font-medium uppercase tracking-wider">Revision</span>
                <RotateCcw className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-400">{stats.needsRevision ?? 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Changes requested</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                <span className="text-xs font-medium uppercase tracking-wider">Rejected</span>
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-400">{stats.rejected ?? 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Non-compliant</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                <span className="text-xs font-medium uppercase tracking-wider">Total</span>
                <FileText className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.total ?? 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">College papers</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                <span className="text-xs font-medium uppercase tracking-wider">My Reviews</span>
                <UserCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400">{stats.myReviews ?? 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Reviewed by you</p>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search course, code, teacher..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-zinc-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="all">All Review Statuses</option>
                <option value="pending">⏳ Pending Review</option>
                <option value="approved">✅ Approved</option>
                <option value="needs_revision">🔄 Needs Revision</option>
                <option value="rejected">❌ Rejected</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-zinc-400 whitespace-nowrap self-end sm:self-auto">
            Showing <strong className="text-white">{papers.length}</strong> {papers.length === 1 ? 'paper' : 'papers'}
          </div>
        </div>

        {/* Papers Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-950/80 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-4 px-6 font-medium">Course / Subject</th>
                  <th className="py-4 px-6 font-medium">Uploaded By</th>
                  <th className="py-4 px-6 font-medium">Questions</th>
                  <th className="py-4 px-6 font-medium">Quality Score</th>
                  <th className="py-4 px-6 font-medium">Review Status</th>
                  <th className="py-4 px-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading assessment papers...
                    </td>
                  </tr>
                ) : papers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-zinc-500">
                      <FileText className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
                      <p className="text-base font-medium text-zinc-300">No papers found</p>
                      <p className="text-xs text-zinc-500 mt-1">
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
                    const questionsCount = paper.questionsCount || (Array.isArray(paper.questions) ? paper.questions.length : 0);
                    const qualityScore = paper.qualityScore || 75;
                    const isPending = !paper.reviewStatus || paper.reviewStatus === 'pending';

                    return (
                      <tr
                        key={paper._id}
                        className={`hover:bg-zinc-800/40 transition-colors ${
                          isPending ? 'bg-yellow-500/[0.02]' : ''
                        }`}
                      >
                        {/* Course / Subject */}
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-lg bg-zinc-800/80 text-zinc-400 mt-0.5">
                              <BookOpen className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                {courseTitle}
                              </div>
                              <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                                {courseCode && (
                                  <span className="font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">
                                    {courseCode}
                                  </span>
                                )}
                                {paper.semester && (
                                  <span>Sem {paper.semester}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Uploaded By */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="font-medium text-zinc-200">{teacherName}</span>
                          </div>
                          {department && (
                            <div className="text-xs text-zinc-500 mt-0.5">{department}</div>
                          )}
                        </td>

                        {/* Questions count */}
                        <td className="py-4 px-6">
                          <span className="text-zinc-300 font-medium">{questionsCount}</span>
                          <span className="text-zinc-500 text-xs ml-1">items</span>
                        </td>

                        {/* Quality Score */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-zinc-400" />
                            <span
                              className={`font-semibold text-sm ${
                                qualityScore >= 75
                                  ? 'text-emerald-400'
                                  : qualityScore >= 50
                                  ? 'text-yellow-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {qualityScore}%
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.bg}`}
                          >
                            {statusBadge.icon}
                            <span>{statusBadge.label}</span>
                          </span>
                          {paper.reviewedBy && (
                            <div className="text-[11px] text-zinc-500 mt-1">
                              by {paper.reviewedBy.fullName || paper.reviewedBy.userName || 'Reviewer'}
                            </div>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleReview(paper)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              isPending
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                            }`}
                          >
                            {isPending ? (
                              <>
                                <span>📝</span>
                                <span>Review</span>
                              </>
                            ) : (
                              <>
                                <span>👁️</span>
                                <span>View / Edit</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination if needed */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-950/40 text-xs">
              <span className="text-zinc-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Paper Modal */}
      {showReviewModal && selectedPaper && (
        <ReviewPaperModal
          paper={selectedPaper}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedPaper(null);
          }}
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  );
};

export default ReviewerDashboard;
