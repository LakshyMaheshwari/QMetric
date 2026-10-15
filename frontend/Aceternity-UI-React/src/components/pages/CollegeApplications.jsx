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

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <button onClick={() => navigate('/super-admin')} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Super Admin
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Building2 className="w-8 h-8 text-blue-400" /> College Applications</h1>
            <p className="text-sm text-zinc-400 mt-1">Review public college / exam-cell registration requests.</p>
          </div>
          <button onClick={fetchApplications} disabled={loading} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">{error}</div>}
        {success && <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400">{success}</div>}

        <div className="flex flex-col md:flex-row gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search college, code, contact..." className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">College</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  {status === 'pending' && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {applications.length === 0 ? (
                  <tr><td colSpan={status === 'pending' ? 5 : 4} className="py-12 text-center text-zinc-500">{loading ? 'Loading applications...' : 'No applications found.'}</td></tr>
                ) : applications.map((application) => (
                  <tr key={application._id} className="hover:bg-zinc-800/30">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{application.collegeName}</div>
                      <div className="text-xs text-blue-300 font-mono mt-1">{application.collegeCode}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white">{application.contactName}</div>
                      <div className="text-xs text-zinc-400">{application.contactEmail}</div>
                      <div className="text-xs text-zinc-500">{application.contactPhone}</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-400">{[application.city, application.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-zinc-700 bg-zinc-800 text-zinc-300">
                        {application.status}
                      </span>
                      {application.rejectionReason && <div className="text-xs text-red-400 mt-2 max-w-xs">{application.rejectionReason}</div>}
                    </td>
                    {status === 'pending' && (
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => approve(application)} disabled={actionId === application._id} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600 hover:text-white disabled:opacity-50">
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => reject(application)} disabled={actionId === application._id} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50">
                            <XCircle className="w-4 h-4" /> Reject
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
