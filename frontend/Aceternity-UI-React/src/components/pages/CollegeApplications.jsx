import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Search, Building2 } from 'lucide-react';

export default function CollegeApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && user.role !== 'super_admin') navigate('/dashboard');
  }, [user, navigate]);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { status, limit: 100 };
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/super-admin/college-applications', { params });
      if (!res.data?.error) setApplications(res.data?.applications || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    if (user?.role === 'super_admin') fetchApplications();
  }, [user, fetchApplications]);

  const approve = async (application) => {
    if (!window.confirm(`Approve ${application.collegeName} and create its college admin account?`)) return;
    try {
      setActionId(application._id);
      setError('');
      const res = await apiClient.put(`/super-admin/college-applications/${application._id}/approve`);
      setSuccess(res.data?.message || 'Application approved.');
      setApplications((prev) => prev.filter((item) => item._id !== application._id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve application.');
    } finally {
      setActionId(null);
    }
  };

  const reject = async (application) => {
    const reason = window.prompt('Enter the rejection reason (required, max 500 characters):');
    if (!reason || !reason.trim()) return;
    try {
      setActionId(application._id);
      setError('');
      const res = await apiClient.put(`/super-admin/college-applications/${application._id}/reject`, { reason: reason.trim() });
      setSuccess(res.data?.message || 'Application rejected.');
      setApplications((prev) => prev.filter((item) => item._id !== application._id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject application.');
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (appStatus) => {
    switch (appStatus) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#111827] pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D7] pb-6">
          <div>
            <button
              onClick={() => navigate('/super-admin')}
              className="inline-flex items-center gap-2 text-sm text-[#78716C] hover:text-[#111827] transition-colors mb-3 font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Super Admin
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-[#111827]">
              <Building2 className="w-8 h-8 text-orange-500" /> College Applications
            </h1>
            <p className="text-sm text-[#57534E] mt-1">Review public college / exam-cell registration requests.</p>
          </div>
          <button
            onClick={fetchApplications}
            disabled={loading}
            className="p-2.5 bg-white border border-[#E8E2D7] text-[#57534E] hover:bg-neutral-50 rounded-xl shadow-sm transition-colors self-start md:self-auto"
            title="Refresh applications"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>}
        {success && <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">{success}</div>}

        <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-[#E8E2D7] shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search college, code, contact..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#57534E] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#57534E]">
              <thead className="bg-[#FAF7F2] text-xs uppercase font-semibold tracking-wider text-[#78716C] border-b border-[#E8E2D7]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">College</th>
                  <th className="py-3.5 px-4 font-semibold">Contact</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  {status === 'pending' && <th className="py-3.5 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE1]">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={status === 'pending' ? 5 : 4} className="py-12 text-center text-[#78716C]">
                      {loading ? 'Loading applications...' : 'No applications found.'}
                    </td>
                  </tr>
                ) : applications.map((application) => (
                  <tr key={application._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#111827]">{application.collegeName}</div>
                      <div className="text-xs text-orange-600 font-mono mt-0.5 font-medium">{application.collegeCode}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-[#111827]">{application.contactName}</div>
                      <div className="text-xs text-[#78716C]">{application.contactEmail}</div>
                      <div className="text-xs text-[#A8A29E]">{application.contactPhone}</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#78716C]">
                      {[application.city, application.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${getStatusBadge(application.status)}`}>
                        {application.status}
                      </span>
                      {application.rejectionReason && (
                        <div className="text-xs text-red-600 mt-2 max-w-xs">{application.rejectionReason}</div>
                      )}
                    </td>
                    {status === 'pending' && (
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => approve(application)}
                            disabled={actionId === application._id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => reject(application)}
                            disabled={actionId === application._id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
