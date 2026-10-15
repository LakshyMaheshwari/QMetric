import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  ArrowLeft, Building2, Users, FileText, Shield, CheckCircle, XCircle,
  RefreshCw, AlertCircle, BookOpen, UserCheck, BarChart3, Calendar,
} from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';

// ─── Small Stat Card ─────────────────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, color = 'blue' }) {
  const colorMap = {
    blue:   'text-blue-400',
    green:  'text-green-400',
    purple: 'text-purple-400',
    amber:  'text-amber-400',
    indigo: 'text-indigo-400',
    rose:   'text-rose-400',
  };
  return (
    <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-zinc-400 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${colorMap[color] || colorMap.blue}`} />
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
    </div>
  );
}

// ─── Role Badge ──────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const roleMap = {
    teacher:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
    reviewer:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
    admin:      'bg-amber-500/20 text-amber-300 border-amber-500/30',
    super_admin:'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${roleMap[role] || 'bg-zinc-700 text-zinc-300 border-zinc-600'}`}>
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
      <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={6} tableRows={6} tableCols={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate('/super-admin')} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const { college, stats, users = [], papers = [] } = data || {};

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Back + Header */}
        <div>
          <button
            onClick={() => navigate('/super-admin')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Super Admin
                </span>
                {college?.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                    <XCircle className="w-3 h-3" /> Inactive
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-400" />
                {college?.name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-zinc-400">
                <span className="font-mono bg-zinc-800 border border-zinc-700 rounded-md px-2 py-0.5 text-blue-300 text-xs">{college?.code}</span>
                {college?.city && <span>{college.city}{college.state ? `, ${college.state}` : ''}</span>}
                {college?.address && <span className="text-zinc-500">{college.address}</span>}
              </div>
            </div>
            <button onClick={fetchDetails} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors shrink-0">
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
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">College Admins</h2>
            <div className="flex flex-wrap gap-2">
              {college.adminIds.map((admin) => (
                <span key={admin._id} className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium">
                  {admin.fullName || admin.userName} <span className="text-xs text-amber-500/70">({admin.email})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Users
            <span className="ml-1 text-sm font-normal text-zinc-500">({users.length})</span>
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-zinc-500 italic">No users found in this college.</td></tr>
                  ) : users.map((u) => (
                    <tr key={u._id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white">{u.fullName || u.userName}</td>
                      <td className="py-3 px-4 text-zinc-400 text-xs">{u.email}</td>
                      <td className="py-3 px-4"><RoleBadge role={u.role} /></td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{u.department || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        {u.isBlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/30">
                            <XCircle className="w-3 h-3" /> Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/30">
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
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" /> Papers
            <span className="ml-1 text-sm font-normal text-zinc-500">({papers.length})</span>
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Course Name</th>
                    <th className="py-3 px-4 font-semibold">Branch</th>
                    <th className="py-3 px-4 font-semibold">Semester</th>
                    <th className="py-3 px-4 font-semibold">Uploaded By</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {papers.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-zinc-500 italic">No papers found for this college.</td></tr>
                  ) : papers.map((p) => (
                    <tr key={p._id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{p['Course Name'] || '—'}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{p['Branch'] || '—'}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{p['Semester'] || '—'}</td>
                      <td className="py-3 px-4 text-xs text-zinc-400">
                        {p.userId ? (p.userId.fullName || p.userId.userName || '—') : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-500">
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
