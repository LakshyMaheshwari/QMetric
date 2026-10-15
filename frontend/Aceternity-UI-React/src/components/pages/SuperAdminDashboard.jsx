import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  Building2, Plus, Search, Filter, RefreshCw, FileText,
  Users, CheckCircle, XCircle, Shield, AlertCircle, X,
  BarChart3, TrendingUp, BookOpen, UserCheck,
} from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: 'text-blue-400',   val: 'text-blue-300' },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  icon: 'text-green-400',  val: 'text-white'    },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-400', val: 'text-purple-300'},
    indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: 'text-indigo-400', val: 'text-white'    },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: 'text-amber-400',  val: 'text-amber-300'},
    rose:   { bg: 'bg-rose-500/10',   border: 'border-rose-500/20',   icon: 'text-rose-400',   val: 'text-white'    },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`p-5 rounded-2xl ${c.bg} border ${c.border} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <div className={`text-3xl font-bold ${c.val}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

// ─── Add College Modal ────────────────────────────────────────────────────────
function AddCollegeModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', code: '', city: '', state: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setError('College name and code are required.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.post('/super-admin/colleges', {
        ...form,
        code: form.code.toUpperCase(),
      });
      if (res.data && !res.data.error) {
        onSuccess(res.data.college);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create college.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" /> Add New College
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {[
            { key: 'name',    label: 'College Name *',  placeholder: 'e.g. Walchand College of Engineering' },
            { key: 'code',    label: 'College Code *',  placeholder: 'e.g. WCE001', upper: true },
            { key: 'city',    label: 'City',            placeholder: 'e.g. Sangli' },
            { key: 'state',   label: 'State',           placeholder: 'e.g. Maharashtra' },
            { key: 'address', label: 'Address',         placeholder: 'Full address (optional)' },
          ].map(({ key, label, placeholder, upper }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: upper ? e.target.value.toUpperCase() : e.target.value })}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition-all"
            >
              {loading ? 'Creating…' : 'Create College'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]     = useState(null);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Guard: only super_admin
  useEffect(() => {
    if (user && user.role !== 'super_admin') navigate('/dashboard');
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const [statsRes, collegesRes] = await Promise.all([
        apiClient.get('/super-admin/stats'),
        apiClient.get('/super-admin/colleges', { params }),
      ]);

      if (statsRes.data && !statsRes.data.error) setStats(statsRes.data.stats);
      if (collegesRes.data && !collegesRes.data.error) setColleges(collegesRes.data.colleges || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleStatus = async (college) => {
    try {
      await apiClient.put(`/super-admin/colleges/${college._id}`, { isActive: !college.isActive });
      setColleges((prev) => prev.map((c) => c._id === college._id ? { ...c, isActive: !c.isActive } : c));
      setSuccess(`${college.name} ${!college.isActive ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  };

  if (loading && colleges.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={6} tableRows={5} tableCols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {loading && colleges.length > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse z-50" />
      )}
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
              <Shield className="w-3 h-3" /> Super Admin Portal
            </span>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" /> Super Admin Dashboard
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Global overview of all colleges, users, and papers on QMetric.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} disabled={loading} className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button onClick={() => navigate('/super-admin/college-applications')} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm rounded-xl border border-zinc-700 transition-all">
              College Applications
            </button>
            <button onClick={() => setShowModal(true)} className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add College
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>
            <button onClick={() => setSuccess('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Global Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Building2}  label="Colleges"       value={stats.totalColleges}  sub={`${stats.activeColleges} active`}       color="blue"   />
            <StatCard icon={Users}      label="Total Users"    value={stats.totalUsers}      sub="All roles"                               color="indigo" />
            <StatCard icon={UserCheck}  label="Teachers"       value={stats.totalTeachers}   sub="Across all colleges"                     color="green"  />
            <StatCard icon={Shield}     label="Reviewers"      value={stats.totalReviewers}  sub="Active reviewers"                        color="purple" />
            <StatCard icon={FileText}   label="Papers"         value={stats.totalPapers}     sub="Total evaluations"                       color="amber"  />
            <StatCard icon={TrendingUp} label="New (7 days)"   value={stats.recentPapers}    sub={`${stats.recentUsers} new users`}        color="rose"   />
          </div>
        )}
        {/* Colleges Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search colleges…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Colleges Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">College</th>
                    <th className="py-3.5 px-4 font-semibold">Code</th>
                    <th className="py-3.5 px-4 font-semibold">Location</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Users</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Papers</th>
                    <th className="py-3.5 px-4 font-semibold">Admins</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {colleges.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-8 h-8 text-zinc-600" />
                        <p className="font-medium text-zinc-300">No colleges found</p>
                        <p className="text-xs text-zinc-500">Add a college or adjust filters.</p>
                      </div>
                    </td></tr>
                  ) : colleges.map((college) => (
                    <tr
                      key={college._id}
                      onClick={() => navigate(`/super-admin/colleges/${college._id}`)}
                      className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{college.name}</div>
                        {college.address && <div className="text-xs text-zinc-500 truncate max-w-xs">{college.address}</div>}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-zinc-800 border border-zinc-700 text-blue-300">
                          {college.code}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-zinc-400">
                        {[college.city, college.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {college.liveTeacherCount ?? college.totalTeachers ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {college.livePaperCount ?? college.totalPapers ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-zinc-400 max-w-[180px]">
                        {college.adminIds && college.adminIds.length > 0
                          ? college.adminIds.map((a) => a.userName || a.fullName).join(', ')
                          : <span className="text-zinc-600 italic">None assigned</span>
                        }
                      </td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(college)}
                          title="Click to toggle status"
                          className="cursor-pointer"
                        >
                          {college.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!loading && <p className="text-xs text-zinc-600 text-right">Click on a row to view college details.</p>}
        </div>
      </div>

      {/* Add College Modal */}
      {showModal && (
        <AddCollegeModal
          onClose={() => setShowModal(false)}
          onSuccess={(newCollege) => {
            setColleges((prev) => [{ ...newCollege, liveTeacherCount: 0, livePaperCount: 0 }, ...prev]);
            setShowModal(false);
            setSuccess(`"${newCollege.name}" created successfully!`);
            setTimeout(() => setSuccess(''), 4000);
          }}
        />
      )}
    </div>
  );
}
