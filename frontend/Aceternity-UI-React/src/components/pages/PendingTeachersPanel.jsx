import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import { CheckCircle, Clock3, RefreshCw, Search, XCircle } from 'lucide-react';

export default function PendingTeachersPanel() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPendingTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { limit: 100 };
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/college-admin/pending-teachers', { params });
      setTeachers(res.data?.teachers || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending teacher requests.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchPendingTeachers();
  }, [fetchPendingTeachers]);

  const approve = async (teacher) => {
    if (!window.confirm(`Approve ${teacher.fullName || teacher.userName} as an affiliated teacher?`)) return;
    try {
      setActionId(teacher._id);
      const res = await apiClient.put(`/college-admin/pending-teachers/${teacher._id}/approve`);
      setTeachers((prev) => prev.filter((item) => item._id !== teacher._id));
      setSuccess(res.data?.message || 'Teacher approved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve teacher.');
    } finally {
      setActionId(null);
    }
  };

  const reject = async (teacher) => {
    const reason = window.prompt('Enter rejection reason (required, max 500 characters):');
    if (!reason || !reason.trim()) return;
    try {
      setActionId(teacher._id);
      const res = await apiClient.put(`/college-admin/pending-teachers/${teacher._id}/reject`, { reason: reason.trim() });
      setTeachers((prev) => prev.filter((item) => item._id !== teacher._id));
      setSuccess(res.data?.message || 'Teacher request rejected.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject teacher.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold text-lg">
            <Clock3 className="w-5 h-5 text-yellow-400" /> Pending Teacher Approvals
          </div>
          <p className="text-xs text-zinc-500 mt-1">Review teachers who registered or requested affiliation with your college.</p>
        </div>
        <button onClick={fetchPendingTeachers} disabled={loading} className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teacher name or email..." className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white" />
      </div>

      {loading && teachers.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading pending requests...</p>
      ) : teachers.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">No pending teacher requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="py-3 px-3">Teacher</th>
                <th className="py-3 px-3">Position</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Verification</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {teachers.map((teacher) => (
                <tr key={teacher._id} className="hover:bg-zinc-800/30">
                  <td className="py-3 px-3">
                    <div className="font-medium text-white">{teacher.fullName || teacher.userName}</div>
                    <div className="text-xs text-zinc-500">{teacher.email}</div>
                  </td>
                  <td className="py-3 px-3 text-xs text-zinc-400">{teacher.position || '—'}</td>
                  <td className="py-3 px-3 text-xs text-zinc-400">{teacher.department || '—'}</td>
                  <td className="py-3 px-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-zinc-300">
                      {teacher.idVerification?.status || 'unverified'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => approve(teacher)} disabled={actionId === teacher._id} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600 hover:text-white disabled:opacity-50">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => reject(teacher)} disabled={actionId === teacher._id} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-red-600/20 border border-red-600/30 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
