import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Navbar';
import './AllPapersPage.css';

export default function AllPapersPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ text: '', type: '' }); // 'success' | 'error'
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
    <>
      <Navbar />
      <div className="all-papers-container">
        <h1>My Papers</h1>

        {/* Toast notification */}
        {toast.text && (
          <div className={`toast-notification ${toast.type}`} role="alert">
            {toast.text}
          </div>
        )}

        {loading && <p>Loading papers...</p>}
        {error && <p className="error">Error: {error}</p>}

        {!loading && papers.length === 0 && (
          <div className="no-papers">
            <p>No papers uploaded yet.</p>
            <button onClick={() => navigate('/upload')}>Upload a Paper</button>
          </div>
        )}

        {!loading && papers.length > 0 && (
          <table className="papers-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Code</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Quality Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {papers.map(paper => (
                <tr key={paper._id}>
                  <td>{paper.courseName || paper['Course Name'] || 'Untitled'}</td>
                  <td>{paper.courseCode || paper['Course Code'] || '—'}</td>
                  <td>{new Date(paper.createdAt).toLocaleDateString()}</td>
                  <td>
                    {isStudent || isIndependentTeacher ? (
                      <span className="status">OK</span>
                    ) : (
                      <span className={`status ${paper.reviewStatus}`}>
                        {paper.reviewStatus || 'unknown'}
                      </span>
                    )}
                  </td>
                  <td>{paper.qualityScore || '—'}</td>
                  <td className="actions">
                    <button
                      className="btn-view"
                      onClick={() => handleViewAnalysis(paper._id)}
                    >
                      View
                    </button>

                    {isAffiliatedTeacher && paper.reviewStatus === 'draft' && (
                      <button
                        className="btn-submit"
                        onClick={() => handleSubmitForReview(paper._id)}
                      >
                        Submit
                      </button>
                    )}

                    {isStudent || isIndependentTeacher ? (
                      <span className="btn-view">OK</span>
                    ) : canDeletePaper ? (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeletePaper(paper._id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
