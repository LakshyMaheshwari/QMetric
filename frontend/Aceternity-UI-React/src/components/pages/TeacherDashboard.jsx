import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, X, FileSearch, Search } from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const isIndependentTeacher = user?.role === 'teacher' && !user?.collegeId;
  const navigate = useNavigate();

  const [papers, setPapers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');

  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50, page: 1 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get('/teacher/papers', { params });
      if (res.data && !res.data.error) {
        setPapers(res.data.papers || []);
        setStats(res.data.stats || {});
      } else {
        setError(res.data.message || 'Failed to fetch papers');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  const getStatusBadge = (status) => {
    const badges = {
      pending:        { color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200',   label: 'Pending',        icon: Clock },
      approved:       { color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', label: 'Approved',       icon: CheckCircle },
      rejected:       { color: 'text-red-700',     bg: 'bg-red-100',     border: 'border-red-200',     label: 'Rejected',       icon: XCircle },
      needs_revision: { color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-200',  label: 'Needs Revision', icon: AlertCircle },
    };
    return badges[status] || badges.pending;
  };

  const openPaperDetails = (paper) => { setSelectedPaper(paper); setShowDetailsModal(true); };

  const filteredPapers = papers.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (p['Course Name'] || p.courseName || '').toLowerCase();
    const code = (p['Course Code'] || p.courseCode || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredPapers.length / pageSize) || 1;
  const paginatedPapers = filteredPapers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading && papers.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={5} tableRows={6} tableCols={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-10 px-4" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {loading && papers.length > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-orange-500 animate-pulse z-50" />
      )}
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#111827]">My Papers</h1>
              <p className="text-[#57534E] text-sm">
                {isIndependentTeacher ? 'Track your uploaded papers and analysis' : 'Track review status of your uploaded papers'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData}
              className="p-2 rounded-xl border border-[#E8E2D7] bg-white text-[#57534E] hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm">
              <RefreshCw className="w-5 h-5" />
            </button>
            <Link to="/upload"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02]">
              + Upload New Paper
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-5 h-5" /></button>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className={`grid gap-4 mb-8 ${isIndependentTeacher ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-5'}`}>
            <div className="bg-white border border-[#E8E2D7] rounded-2xl p-5 flex flex-col shadow-sm">
              <span className="text-[#57534E] text-sm font-medium mb-1">Total Papers</span>
              <span className="text-2xl font-bold text-[#111827]">{stats.total || 0}</span>
            </div>
            {!isIndependentTeacher && (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col shadow-sm">
                  <span className="text-amber-700 text-sm font-medium mb-1 flex items-center gap-1"><Clock className="w-4 h-4"/>Pending</span>
                  <span className="text-2xl font-bold text-amber-800">{stats.pending || 0}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col shadow-sm">
                  <span className="text-emerald-700 text-sm font-medium mb-1 flex items-center gap-1"><CheckCircle className="w-4 h-4"/>Approved</span>
                  <span className="text-2xl font-bold text-emerald-800">{stats.approved || 0}</span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex flex-col shadow-sm">
                  <span className="text-red-700 text-sm font-medium mb-1 flex items-center gap-1"><XCircle className="w-4 h-4"/>Rejected</span>
                  <span className="text-2xl font-bold text-red-800">{stats.rejected || 0}</span>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex flex-col shadow-sm">
                  <span className="text-orange-700 text-sm font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-4 h-4"/>Needs Rev.</span>
                  <span className="text-2xl font-bold text-orange-800">{stats.needsRevision || 0}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Filter & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by course name or code..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white border border-[#E8E2D7] text-[#111827] pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 placeholder-[#A8A29E] shadow-sm transition-all"
            />
          </div>
          {!isIndependentTeacher && (
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-white border border-[#E8E2D7] text-[#111827] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 w-full sm:w-auto shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="needs_revision">Needs Revision</option>
            </select>
          )}
        </div>

        {/* Papers Table */}
        <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#57534E]">
              <thead className="bg-[#FAF7F2] text-[#57534E] uppercase text-xs border-b border-[#E8E2D7]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Course Details</th>
                  <th className="px-6 py-4 font-semibold text-center">Quality Score</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  {!isIndependentTeacher && <th className="px-6 py-4 font-semibold">Reviewer</th>}
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE1]">
                {paginatedPapers.length === 0 ? (
                  <tr>
                    <td colSpan={isIndependentTeacher ? 4 : 5} className="px-6 py-14 text-center text-[#78716C]">
                      <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-20 text-orange-400" />
                      {searchQuery
                        ? `No papers matching "${searchQuery}"`
                        : statusFilter !== 'all'
                        ? `No ${statusFilter} papers found`
                        : "You haven't uploaded any papers yet"}
                    </td>
                  </tr>
                ) : (
                  paginatedPapers.map(paper => {
                    const status = getStatusBadge(paper.reviewStatus);
                    const StatusIcon = status.icon;
                    const hasReview = paper.reviewStatus !== 'pending';
                    const score = paper.qualityScore || 0;

                    return (
                      <tr key={paper._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[#111827]">{paper['Course Name'] || 'Untitled'}</div>
                          <div className="text-xs text-[#78716C] mt-0.5">{paper['Course Code']} • {new Date(paper.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border ${
                            score >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                            score >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                            'bg-red-100 text-red-700 border-red-200'}`}>
                            {score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isIndependentTeacher ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-[#E8E2D7] bg-[#FAF7F2] text-[#57534E]">
                              OK
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          )}
                        </td>
                        {!isIndependentTeacher && (
                          <td className="px-6 py-4">
                            {paper.reviewedBy ? (
                              <div className="flex flex-col">
                                <span className="text-[#111827] font-medium">{paper.reviewedBy.fullName}</span>
                                <span className="text-xs text-[#78716C]">{new Date(paper.reviewedAt).toLocaleDateString()}</span>
                              </div>
                            ) : <span className="text-[#A8A29E]">—</span>}
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openPaperDetails(paper)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                              hasReview
                                ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
                                : 'bg-[#FAF7F2] text-[#57534E] hover:bg-neutral-100 border-[#E8E2D7]'
                            }`}
                          >
                            {hasReview ? 'View Review' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredPapers.length > 10 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-2">
            <span className="text-xs text-[#57534E]">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredPapers.length)} of {filteredPapers.length} papers
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-semibold text-[#57534E] hover:text-orange-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Previous
              </button>
              <span className="text-xs text-[#57534E] px-2">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-white border border-[#E8E2D7] rounded-xl text-xs font-semibold text-[#57534E] hover:text-orange-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPaper && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#111827] flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                {isIndependentTeacher ? 'Paper Details' : 'Paper Review Details'}
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-[#57534E] hover:text-[#111827] transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 bg-[#FAF7F2] p-4 rounded-xl border border-[#E8E2D7]">
                <div>
                  <p className="text-xs text-[#78716C] mb-1">Course Name</p>
                  <p className="font-semibold text-[#111827]">{selectedPaper['Course Name']}</p>
                </div>
                <div>
                  <p className="text-xs text-[#78716C] mb-1">Course Code</p>
                  <p className="font-semibold text-[#111827]">{selectedPaper['Course Code']}</p>
                </div>
                <div>
                  <p className="text-xs text-[#78716C] mb-1">Quality Score</p>
                  <p className="font-semibold text-[#111827]">{selectedPaper.qualityScore || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#78716C] mb-1">Uploaded On</p>
                  <p className="font-semibold text-[#111827]">{new Date(selectedPaper.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {!isIndependentTeacher && (
                <div>
                  <h4 className="text-sm font-bold text-[#57534E] uppercase tracking-wider mb-3">Current Status</h4>
                  <div className={`p-4 rounded-xl border ${getStatusBadge(selectedPaper.reviewStatus).bg} ${getStatusBadge(selectedPaper.reviewStatus).border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {React.createElement(getStatusBadge(selectedPaper.reviewStatus).icon, {
                        className: `w-5 h-5 ${getStatusBadge(selectedPaper.reviewStatus).color}`
                      })}
                      <span className={`font-bold ${getStatusBadge(selectedPaper.reviewStatus).color}`}>
                        {getStatusBadge(selectedPaper.reviewStatus).label}
                      </span>
                    </div>
                    {selectedPaper.reviewedBy && (
                      <p className="text-sm text-[#57534E]">
                        Reviewed by <span className="font-semibold text-[#111827]">{selectedPaper.reviewedBy.fullName}</span> on {new Date(selectedPaper.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!isIndependentTeacher && selectedPaper.reviewComments && (
                <div>
                  <h4 className="text-sm font-bold text-[#57534E] uppercase tracking-wider mb-3">Latest Comments</h4>
                  <div className="bg-[#FAF7F2] border border-[#E8E2D7] p-4 rounded-xl text-[#111827] whitespace-pre-wrap text-sm">
                    {selectedPaper.reviewComments}
                  </div>
                </div>
              )}

              {!isIndependentTeacher && selectedPaper.reviewHistory && selectedPaper.reviewHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#57534E] uppercase tracking-wider mb-3">History</h4>
                  <div className="space-y-3">
                    {selectedPaper.reviewHistory.map((entry, idx) => (
                      <div key={idx} className="bg-[#FAF7F2] border border-[#E8E2D7] p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-[#111827]">{entry.reviewerId?.fullName || 'Unknown'}</span>
                          <span className="text-xs text-[#78716C]">{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusBadge(entry.action).bg} ${getStatusBadge(entry.action).color} ${getStatusBadge(entry.action).border}`}>
                            {getStatusBadge(entry.action).label}
                          </span>
                        </div>
                        {entry.comments && (
                          <div className="text-sm text-[#57534E] mt-2 pl-3 border-l-2 border-orange-300">
                            "{entry.comments}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-[#E8E2D7] pt-5">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] text-[#57534E] hover:bg-neutral-100 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
