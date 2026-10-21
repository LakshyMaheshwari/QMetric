import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Upload, Trash2, ArrowRight, CheckCircle2, Clock, Eye, AlertCircle } from 'lucide-react';

export default function AllPapersPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ text: '', type: '' });
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';
  const isAffiliatedTeacher = isTeacher && Boolean(user?.collegeId);
  const isIndependentTeacher = isTeacher && !user?.collegeId;
  const canDeletePaper = ['teacher', 'admin', 'super_admin'].includes(user?.role);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setLoading(true);
        const endpoint = isStudent ? '/student/papers' : '/teacher/papers';
        const response = await apiClient.get(endpoint, { params: { limit: 100, page: 1 } });

        const papersList = response.data?.papers || [];
        setPapers(Array.isArray(papersList) ? papersList : []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch papers:', err);
        setError(err.message || 'Failed to load papers');
        setPapers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [isStudent]);

  const handleSubmitForReview = async (paperId) => {
    try {
      await apiClient.put(`/teacher/papers/${paperId}/submit`);
      showToast('Paper submitted for review!', 'success');
      const response = await apiClient.get('/teacher/papers');
      setPapers(response.data.papers || []);
    } catch (err) {
      showToast('Failed to submit: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleViewAnalysis = (paperId) => {
    navigate(`/result/${paperId}`);
  };

  const handleDeletePaper = async (paperId) => {
    if (!window.confirm('Are you sure you want to delete this paper?')) return;

    try {
      await apiClient.delete(`/teacher/papers/${paperId}`);
      showToast('Paper deleted successfully', 'success');
      setPapers(papers.filter(p => p._id !== paperId));
    } catch (err) {
      showToast('Failed to delete: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header card */}
        <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#111827] tracking-tight">Question Paper Repository</h1>
              <p className="text-xs text-[#57534E] mt-0.5">
                Browse, evaluate, and inspect your analyzed examination papers.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/upload')}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload New Paper
          </button>
        </div>

        {/* Toast */}
        {toast.text && (
          <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            {toast.text}
          </div>
        )}

        {loading && (
          <div className="py-20 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#57534E] font-medium">Loading repository papers...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold">
            Error: {error}
          </div>
        )}

        {!loading && papers.length === 0 && (
          <div className="bg-white border border-[#E8E2D7] border-dashed rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-[#111827] font-bold text-lg mb-1">No question papers uploaded yet</h3>
            <p className="text-[#57534E] text-sm mb-6 max-w-sm mx-auto">
              Upload your course question paper to generate automated OBE cognitive metrics and quality scores.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/25 transition-all inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Paper
            </button>
          </div>
        )}

        {!loading && papers.length > 0 && (
          <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E8E2D7] bg-[#FAF7F2]/80 text-[#374151] text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Course Name</th>
                    <th className="py-4 px-6">Code</th>
                    <th className="py-4 px-6">Uploaded</th>
                    <th className="py-4 px-6">Review Status</th>
                    <th className="py-4 px-6">Quality Score</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1] text-sm">
                  {papers.map((paper) => (
                    <tr key={paper._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-[#111827]">
                        {paper.courseName || paper['Course Name'] || 'Untitled Paper'}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-[#57534E]">
                        {paper.courseCode || paper['Course Code'] || '—'}
                      </td>
                      <td className="py-4 px-6 text-xs text-[#57534E]">
                        {paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-4 px-6">
                        {isStudent || isIndependentTeacher ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Ready
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            paper.reviewStatus === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : paper.reviewStatus === 'rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {paper.reviewStatus || 'Draft'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-bold text-[#111827]">
                        {paper.qualityScore != null ? `${paper.qualityScore}%` : '—'}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleViewAnalysis(paper._id)}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 text-xs font-bold transition-all inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {isAffiliatedTeacher && paper.reviewStatus === 'draft' && (
                          <button
                            onClick={() => handleSubmitForReview(paper._id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all"
                          >
                            Submit
                          </button>
                        )}

                        {canDeletePaper && (
                          <button
                            onClick={() => handleDeletePaper(paper._id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Delete paper"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
