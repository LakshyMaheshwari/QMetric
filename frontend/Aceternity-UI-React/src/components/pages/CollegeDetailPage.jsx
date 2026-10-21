import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  ArrowLeft, Building2, Users, FileText, Shield, CheckCircle, XCircle,
  RefreshCw, AlertCircle, BookOpen, UserCheck, Calendar,
} from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';

// ─── Small Stat Card ─────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, color = 'orange' }) {
  const colorMap = {
    blue:   'text-blue-600',
    green:  'text-emerald-600',
    purple: 'text-purple-600',
    amber:  'text-amber-600',
    indigo: 'text-indigo-600',
    rose:   'text-rose-600',
    orange: 'text-orange-600',
  };
  return (
    <div className="p-4 rounded-2xl bg-white border border-[#E8E2D7] shadow-sm flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[#78716C] mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${colorMap[color] || colorMap.orange}`} />
      </div>
      <div className="text-2xl font-bold text-[#111827]">{value ?? '—'}</div>
    </div>
  );
}

// ─── Role Badge ──────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const roleMap = {
    teacher:    'bg-blue-50 text-blue-700 border-blue-200',
    reviewer:   'bg-indigo-50 text-indigo-700 border-indigo-200',
    admin:      'bg-amber-50 text-amber-700 border-amber-200',
    super_admin:'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleMap[role] || 'bg-neutral-100 text-[#57534E] border-[#E8E2D7]'}`}>
      {role}
    </span>
  );
}

export default function CollegeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  // Guard
  useEffect(() => {
    if (user && user.role !== 'super_admin') navigate('/dashboard');
  }, [user, navigate]);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get(`/super-admin/colleges/${id}`);
      if (res.data && !res.data.error) {
        setData(res.data);
      } else {
        setError(res.data?.message || 'Failed to load college details.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load college details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetails(); }, [fetchDetails]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#111827] pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={6} tableRows={6} tableCols={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#111827] pt-20 pb-16 px-4" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/super-admin')} className="flex items-center gap-2 text-[#78716C] hover:text-[#111827] text-sm mb-6 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const { college, stats, users = [], papers = [] } = data || {};

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#111827] pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Back + Header */}
        <div>
          <button
            onClick={() => navigate('/super-admin')}
            className="flex items-center gap-2 text-[#78716C] hover:text-[#111827] text-sm mb-4 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E8E2D7] pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Super Admin
                </span>
                {college?.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-[#111827]">
                <Building2 className="w-8 h-8 text-orange-500" />
                {college?.name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-[#57534E]">
                <span className="font-mono bg-neutral-100 border border-[#E8E2D7] rounded-md px-2 py-0.5 text-orange-600 font-semibold text-xs">{college?.code}</span>
                {college?.city && <span>{college.city}{college.state ? `, ${college.state}` : ''}</span>}
                {college?.address && <span className="text-[#78716C]">{college.address}</span>}
              </div>
            </div>
            <button
              onClick={fetchDetails}
              className="p-2.5 bg-white hover:bg-neutral-50 text-[#57534E] rounded-xl border border-[#E8E2D7] shadow-sm transition-colors shrink-0"
              title="Refresh college details"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <MiniStat icon={Users}    label="Total Users"   value={stats.totalUsers}   color="indigo" />
            <MiniStat icon={UserCheck}label="Teachers"      value={stats.teachers}     color="blue"   />
            <MiniStat icon={BookOpen} label="Reviewers"     value={stats.reviewers}    color="purple" />
            <MiniStat icon={Shield}   label="Admins"        value={stats.admins}       color="amber"  />
            <MiniStat icon={FileText} label="Papers"        value={stats.totalPapers}  color="green"  />
            <MiniStat icon={Calendar} label="Recent Papers" value={stats.recentPapers} color="rose"   />
          </div>
        )}

        {/* Admins */}
        {college?.adminIds?.length > 0 && (
          <div className="p-5 rounded-2xl bg-white border border-[#E8E2D7] shadow-sm">
            <h2 className="text-xs font-semibold text-[#78716C] uppercase tracking-wider mb-3">College Admins</h2>
            <div className="flex flex-wrap gap-2">
              {college.adminIds.map((admin) => (
                <span key={admin._id} className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
                  {admin.fullName || admin.userName} <span className="text-xs text-amber-600/80">({admin.email})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Users
            <span className="ml-1 text-sm font-normal text-[#78716C]">({users.length})</span>
          </h2>
          <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#57534E]">
                <thead className="bg-[#FAF7F2] text-xs uppercase font-semibold tracking-wider text-[#78716C] border-b border-[#E8E2D7]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-[#78716C] italic">No users found in this college.</td></tr>
                  ) : users.map((u) => (
                    <tr key={u._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#111827]">{u.fullName || u.userName}</td>
                      <td className="py-3 px-4 text-[#78716C] text-xs">{u.email}</td>
                      <td className="py-3 px-4"><RoleBadge role={u.role} /></td>
                      <td className="py-3 px-4 text-xs text-[#78716C]">{u.department || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        {u.isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" /> Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Papers Table */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" /> Papers
            <span className="ml-1 text-sm font-normal text-[#78716C]">({papers.length})</span>
          </h2>
          <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#57534E]">
                <thead className="bg-[#FAF7F2] text-xs uppercase font-semibold tracking-wider text-[#78716C] border-b border-[#E8E2D7]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Course Name</th>
                    <th className="py-3 px-4 font-semibold">Branch</th>
                    <th className="py-3 px-4 font-semibold">Semester</th>
                    <th className="py-3 px-4 font-semibold">Uploaded By</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {papers.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-[#78716C] italic">No papers found for this college.</td></tr>
                  ) : papers.map((p) => (
                    <tr key={p._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-[#111827] max-w-xs truncate">{p['Course Name'] || '—'}</td>
                      <td className="py-3 px-4 text-xs text-[#78716C]">{p['Branch'] || '—'}</td>
                      <td className="py-3 px-4 text-xs text-[#78716C]">{p['Semester'] || '—'}</td>
                      <td className="py-3 px-4 text-xs text-[#78716C]">
                        {p.userId ? (p.userId.fullName || p.userId.userName || '—') : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#A8A29E]">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
