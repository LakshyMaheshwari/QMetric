import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, X, FileSearch, Search } from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';

export default function TeacherDashboard() {
  const { user } = useAuth();
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

  // Guard: allow only teacher, reviewer, admin, super_admin
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
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
      pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', label: 'Pending', icon: Clock },
      approved: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', label: 'Approved', icon: CheckCircle },
      rejected: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', label: 'Rejected', icon: XCircle },
      needs_revision: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', label: 'Needs Revision', icon: AlertCircle },
    };
    return badges[status] || badges.pending;
  };

  const openPaperDetails = (paper) => {
    setSelectedPaper(paper);
    setShowDetailsModal(true);
  };

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
      <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={5} tableRows={6} tableCols={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      {loading && papers.length > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse z-50" />
      )}
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">My Papers</h1>
              <p className="text-gray-400 text-sm">Track review status of your uploaded papers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
              <RefreshCw className="w-5 h-5" />
            </button>
            <Link
              to="/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-lg"
            >
              + Upload New Paper
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300"><X className="w-5 h-5" /></button>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col">
              <span className="text-gray-400 text-sm font-medium mb-1">Total Papers</span>
              <span className="text-2xl font-bold text-white">{stats.total || 0}</span>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-2xl p-5 flex flex-col">
              <span className="text-yellow-500 text-sm font-medium mb-1 flex items-center gap-1"><Clock className="w-4 h-4"/> Pending</span>
              <span className="text-2xl font-bold text-yellow-400">{stats.pending || 0}</span>
            </div>
            <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-5 flex flex-col">
              <span className="text-green-500 text-sm font-medium mb-1 flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Approved</span>
              <span className="text-2xl font-bold text-green-400">{stats.approved || 0}</span>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 flex flex-col">
              <span className="text-red-500 text-sm font-medium mb-1 flex items-center gap-1"><XCircle className="w-4 h-4"/> Rejected</span>
              <span className="text-2xl font-bold text-red-400">{stats.rejected || 0}</span>
            </div>
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-5 flex flex-col">
              <span className="text-orange-500 text-sm font-medium mb-1 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Needs Rev.</span>
              <span className="text-2xl font-bold text-orange-400">{stats.needsRevision || 0}</span>
            </div>
          </div>
        )}

        {/* Filter & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by course name or code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-900 border border-gray-700 text-white pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_revision">Needs Revision</option>
          </select>
        </div>

        {/* Papers Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold">Course Details</th>
                  <th className="px-6 py-4 font-semibold text-center">Quality Score</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Reviewer</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {paginatedPapers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-20" />
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
                      <tr key={paper._id} className="hover:bg-gray-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">{paper['Course Name'] || 'Untitled'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{paper['Course Code']} • {new Date(paper.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold
                            ${score >= 70 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                              score >= 40 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                              'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color} ${status.border}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {paper.reviewedBy ? (
                            <div className="flex flex-col">
                              <span className="text-gray-300">{paper.reviewedBy.fullName}</span>
                              <span className="text-xs text-gray-500">{new Date(paper.reviewedAt).toLocaleDateString()}</span>
                            </div>
                          ) : <span className="text-gray-600">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openPaperDetails(paper)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              hasReview 
                                ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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

        {/* Pagination Controls */}
        {filteredPapers.length > 10 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-2">
            <span className="text-xs text-gray-400">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredPapers.length)} of {filteredPapers.length} papers
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-400 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPaper && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Paper Review Details
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-800/50 p-4 rounded-xl border border-gray-800">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Course Name</p>
                  <p className="font-medium text-white">{selectedPaper['Course Name']}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Course Code</p>
                  <p className="font-medium text-white">{selectedPaper['Course Code']}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Quality Score</p>
                  <p className="font-medium text-white">{selectedPaper.qualityScore || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Uploaded On</p>
                  <p className="font-medium text-white">{new Date(selectedPaper.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Review Status */}
              <div>
                <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Current Status</h4>
                <div className={`p-4 rounded-xl border ${getStatusBadge(selectedPaper.reviewStatus).bg} ${getStatusBadge(selectedPaper.reviewStatus).border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {React.createElement(getStatusBadge(selectedPaper.reviewStatus).icon, { className: `w-5 h-5 ${getStatusBadge(selectedPaper.reviewStatus).color}` })}
                    <span className={`font-bold ${getStatusBadge(selectedPaper.reviewStatus).color}`}>
                      {getStatusBadge(selectedPaper.reviewStatus).label}
                    </span>
                  </div>
                  {selectedPaper.reviewedBy && (
                    <p className="text-sm text-gray-400">
                      Reviewed by <span className="text-gray-200">{selectedPaper.reviewedBy.fullName}</span> on {new Date(selectedPaper.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Review Comments */}
              {selectedPaper.reviewComments && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Latest Comments</h4>
                  <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl text-gray-300 whitespace-pre-wrap">
                    {selectedPaper.reviewComments}
                  </div>
                </div>
              )}

              {/* Review History */}
              {selectedPaper.reviewHistory && selectedPaper.reviewHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">History</h4>
                  <div className="space-y-3">
                    {selectedPaper.reviewHistory.map((entry, idx) => (
                      <div key={idx} className="bg-gray-800/30 border border-gray-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-200">{entry.reviewerId?.fullName || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(entry.action).bg} ${getStatusBadge(entry.action).color} ${getStatusBadge(entry.action).border}`}>
                            {getStatusBadge(entry.action).label}
                          </span>
                        </div>
                        {entry.comments && (
                          <div className="text-sm text-gray-400 mt-2 pl-3 border-l-2 border-gray-700">
                            "{entry.comments}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-gray-800 pt-5">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-gray-800 text-white hover:bg-gray-700 transition-colors"
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
