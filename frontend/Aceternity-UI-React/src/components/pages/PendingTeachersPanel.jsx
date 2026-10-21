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
    <section className="bg-white border border-[#E8E2D7] rounded-2xl p-6 shadow-sm mb-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 text-[#111827] font-semibold text-lg">
            <Clock3 className="w-5 h-5 text-amber-500" /> Pending Teacher Approvals
          </div>
          <p className="text-xs text-[#78716C] mt-1">Review teachers who registered or requested affiliation with your college.</p>
        </div>
        <button
          onClick={fetchPendingTeachers}
          disabled={loading}
          className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] text-[#57534E] hover:bg-neutral-100 transition-colors"
          title="Refresh pending teachers"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">{success}</div>}

      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teacher name or email..."
          className="w-full pl-9 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
        />
      </div>

      {loading && teachers.length === 0 ? (
        <p className="text-sm text-[#78716C]">Loading pending requests...</p>
      ) : teachers.length === 0 ? (
        <div className="py-8 text-center text-[#78716C] border border-dashed border-[#E8E2D7] rounded-xl">No pending teacher requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#57534E]">
            <thead className="text-xs uppercase font-semibold text-[#78716C] bg-[#FAF7F2] border-b border-[#E8E2D7]">
              <tr>
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE1]">
              {teachers.map((teacher) => (
                <tr key={teacher._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-[#111827]">{teacher.fullName || teacher.userName}</div>
                    <div className="text-xs text-[#78716C]">{teacher.email}</div>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#57534E]">{teacher.position || '—'}</td>
                  <td className="py-3 px-4 text-xs text-[#57534E]">{teacher.department || '—'}</td>
                  <td className="py-3 px-4 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-[#57534E] border border-[#E8E2D7]">
                      {teacher.idVerification?.status || 'unverified'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => approve(teacher)}
                        disabled={actionId === teacher._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reject(teacher)}
                        disabled={actionId === teacher._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
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
