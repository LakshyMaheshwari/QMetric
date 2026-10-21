import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import {
  Building2, Building, GraduationCap, Globe2, ChevronDown, Plus, Search, Filter, RefreshCw, FileText,
  Users, CheckCircle, XCircle, Shield, AlertCircle, X,
  BarChart3, TrendingUp, UserCheck, Activity,
} from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';
import ContributionSkyline from '../ui/contribution-skyline';
import { InteractiveHoverButton } from '../ui/interactive-hover-button';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'orange' }) {
  const colorMap = {
    orange: { bg: 'bg-orange-50',  border: 'border-orange-200',  icon: 'text-orange-600',  val: 'text-orange-800' },
    blue:   { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-600',    val: 'text-blue-800'   },
    green:  { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', val: 'text-emerald-800'},
    purple: { bg: 'bg-purple-50',  border: 'border-purple-200',  icon: 'text-purple-600',  val: 'text-purple-800' },
    indigo: { bg: 'bg-indigo-50',  border: 'border-indigo-200',  icon: 'text-indigo-600',  val: 'text-indigo-800' },
    amber:  { bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-600',   val: 'text-amber-800'  },
    rose:   { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'text-rose-600',    val: 'text-rose-800'   },
  };
  const c = colorMap[color] || colorMap.orange;
  return (
    <div className={`p-5 rounded-2xl ${c.bg} border ${c.border} flex flex-col gap-2 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#57534E]">{label}</span>
        <Icon className={`w-4 h-4 ${c.icon}`} />
      </div>
      <div className={`text-3xl font-bold ${c.val}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-[#78716C]">{sub}</div>}
    </div>
  );
}

// ─── Add College Modal ──────────────────────────────────────────────────────────
function AddCollegeModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', code: '', city: '', state: '', address: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError('College name and code are required.'); return; }
    try {
      setLoading(true); setError('');
      const res = await apiClient.post('/super-admin/colleges', { ...form, code: form.code.toUpperCase() });
      if (res.data && !res.data.error) onSuccess(res.data.college);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create college.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white border border-[#E8E2D7] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[#E8E2D7]">
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" /> Add New College
          </h2>
          <button onClick={onClose} className="text-[#57534E] hover:text-[#111827] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {[
            { key: 'name',    label: 'College Name *', placeholder: 'e.g. Walchand College of Engineering' },
            { key: 'code',    label: 'College Code *', placeholder: 'e.g. WCE001', upper: true },
            { key: 'city',    label: 'City',           placeholder: 'e.g. Sangli' },
            { key: 'state',   label: 'State',          placeholder: 'e.g. Maharashtra' },
            { key: 'address', label: 'Address',        placeholder: 'Full address (optional)' },
          ].map(({ key, label, placeholder, upper }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-[#374151] mb-1.5 uppercase tracking-wider">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: upper ? e.target.value.toUpperCase() : e.target.value })}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] text-[#57534E] hover:bg-neutral-100 font-semibold transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creating…' : 'Create College'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
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
  const [activityScope, setActivityScope] = useState('all_colleges');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [activityData, setActivityData] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'super_admin') navigate('/dashboard');
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError('');
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
    } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchActivity = useCallback(async (scope, collegeId) => {
    if (scope === 'specific_college' && !collegeId) { setActivityData([]); setActivityLoading(false); return; }
    try {
      setActivityLoading(true); setActivityError(null);
      const params = { scope };
      if (scope === 'specific_college' && collegeId) params.collegeId = collegeId;
      const res = await apiClient.get('/super-admin/stats/activity', { params });
      if (res.data && !res.data.error) setActivityData(res.data.data || []);
      else setActivityError(res.data?.message || 'Failed to load activity heatmap.');
    } catch (err) {
      setActivityError(err.response?.data?.message || 'Failed to load platform activity.');
    } finally { setActivityLoading(false); }
  }, []);

  useEffect(() => { fetchActivity(activityScope, selectedCollegeId); }, [activityScope, selectedCollegeId, fetchActivity]);
  useEffect(() => { if (colleges.length > 0 && !selectedCollegeId) setSelectedCollegeId(colleges[0]._id); }, [colleges, selectedCollegeId]);

  const handleToggleStatus = async (college) => {
    try {
      await apiClient.put(`/super-admin/colleges/${college._id}`, { isActive: !college.isActive });
      setColleges((prev) => prev.map((c) => c._id === college._id ? { ...c, isActive: !c.isActive } : c));
      setSuccess(`${college.name} ${!college.isActive ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.message || 'Failed to update status.'); }
  };

  if (loading && colleges.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto"><DashboardSkeleton cards={6} tableRows={5} tableCols={4} /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {loading && colleges.length > 0 && <div className="fixed top-0 left-0 right-0 h-1 bg-orange-500 animate-pulse z-50" />}
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D7] pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200 mb-2">
              <Shield className="w-3 h-3" /> Super Admin Portal
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-[#111827] flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-orange-500" /> Super Admin Dashboard
            </h1>
            <p className="text-sm text-[#57534E] mt-1">Global overview of all colleges, users, and papers on QMetric.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} disabled={loading}
              className="p-2.5 rounded-xl border border-[#E8E2D7] bg-white text-[#57534E] hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
            <button onClick={() => navigate('/super-admin/college-applications')}
              className="px-4 py-2.5 rounded-xl border border-[#E8E2D7] bg-white text-[#57534E] hover:text-orange-600 hover:border-orange-300 font-semibold text-sm transition-all shadow-sm">
              College Applications
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-sm shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02] transition-all">
              <Plus className="w-4 h-4" /> Add College
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>
            <button onClick={() => setError('')} className="hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>
            <button onClick={() => setSuccess('')} className="hover:opacity-70"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Global Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Building2}  label="Colleges"      value={stats.totalColleges}  sub={`${stats.activeColleges} active`}    color="blue"   />
            <StatCard icon={Users}      label="Total Users"   value={stats.totalUsers}      sub="All roles"                           color="indigo" />
            <StatCard icon={UserCheck}  label="Teachers"      value={stats.totalTeachers}   sub="Across all colleges"                 color="green"  />
            <StatCard icon={Shield}     label="Reviewers"     value={stats.totalReviewers}  sub="Active reviewers"                    color="purple" />
            <StatCard icon={FileText}   label="Papers"        value={stats.totalPapers}     sub="Total evaluations"                   color="amber"  />
            <StatCard icon={TrendingUp} label="New (7 days)"  value={stats.recentPapers}    sub={`${stats.recentUsers} new users`}    color="rose"   />
          </div>
        )}

        {/* Activity Skyline */}
        <div className="bg-white border border-[#E8E2D7] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                  <Activity className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-[#111827]">Platform Paper Upload Activity</h2>
              </div>
              <p className="text-xs text-[#57534E] mt-1">12-month paper upload activity skyline across colleges and independent faculty.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex flex-wrap items-center rounded-xl bg-[#FAF7F2] p-1 border border-[#E8E2D7]">
                {[
                  { id: 'all_colleges',          label: 'All Colleges',           icon: Building2 },
                  { id: 'specific_college',       label: 'Specific College',       icon: Building },
                  { id: 'unaffiliated_teachers',  label: 'Unaffiliated Teachers',  icon: GraduationCap },
                  { id: 'entire_platform',        label: 'Entire Platform',        icon: Globe2 },
                ].map(({ id, label, icon: Icon }) => {
                  const isActive = activityScope === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActivityScope(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'text-[#57534E] hover:text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {activityScope === 'specific_college' && (
                <div className="relative flex items-center">
                  <Building className="w-3.5 h-3.5 text-orange-500 absolute left-3 pointer-events-none z-10" />
                  <select
                    value={selectedCollegeId}
                    onChange={(e) => setSelectedCollegeId(e.target.value)}
                    className="pl-8 pr-8 py-1.5 bg-[#FAF7F2] border border-orange-300 rounded-xl text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all appearance-none max-w-[220px] truncate cursor-pointer font-medium"
                  >
                    {colleges.length === 0 && <option value="">No colleges found</option>}
                    {colleges.map((c) => (
                      <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#57534E] absolute right-2.5 pointer-events-none z-10" />
                </div>
              )}

              <button
                type="button"
                onClick={() => fetchActivity(activityScope, selectedCollegeId)}
                disabled={activityLoading}
                className="p-2 rounded-xl border border-[#E8E2D7] bg-[#FAF7F2] text-[#57534E] hover:text-orange-600 hover:border-orange-300 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin text-orange-500' : ''}`} />
              </button>
            </div>
          </div>

          {activityError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{activityError}</span></div>
              <button onClick={() => fetchActivity(activityScope, selectedCollegeId)}
                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors">Retry</button>
            </div>
          ) : activityLoading && activityData.length === 0 ? (
            <div className="h-64 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] animate-pulse flex items-center justify-center text-[#57534E] text-sm">
              Loading platform activity skyline…
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-xl bg-[#FAF7F2] p-2 sm:p-4 border border-[#E8E2D7]">
              <ContributionSkyline
                data={activityData}
                unit="paper upload"
                unitPlural="paper uploads"
                title={`Platform Activity — ${
                  activityScope === 'all_colleges' ? 'All Colleges' :
                  activityScope === 'specific_college' ? (colleges.find((c) => c._id === selectedCollegeId)?.name || 'Specific College') :
                  activityScope === 'unaffiliated_teachers' ? 'Unaffiliated Teachers' : 'Entire Platform'
                }`}
                palette="github"
                className="border-0 bg-transparent"
              />
            </div>
          )}
        </div>

        {/* Colleges Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-[#E8E2D7] shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
              <input
                type="text"
                placeholder="Search colleges…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[#A8A29E]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Colleges Table */}
          <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[#57534E]">
                <thead className="bg-[#FAF7F2] text-xs uppercase tracking-wider text-[#57534E] border-b border-[#E8E2D7]">
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
                <tbody className="divide-y divide-[#F2ECE1]">
                  {colleges.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-[#57534E]">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-8 h-8 text-orange-300" />
                        <p className="font-semibold text-[#111827]">No colleges found</p>
                        <p className="text-xs text-[#78716C]">Add a college or adjust filters.</p>
                      </div>
                    </td></tr>
                  ) : colleges.map((college) => (
                    <tr
                      key={college._id}
                      onClick={() => navigate(`/super-admin/colleges/${college._id}`)}
                      className="hover:bg-[#FAF7F2]/60 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="font-semibold text-[#111827]">{college.name}</div>
                        {college.address && <div className="text-xs text-[#78716C] truncate max-w-xs">{college.address}</div>}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-orange-50 border border-orange-200 text-orange-700">
                          {college.code}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-[#78716C]">
                        {[college.city, college.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {college.liveTeacherCount ?? college.totalTeachers ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          {college.livePaperCount ?? college.totalPapers ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-[#57534E] max-w-[180px]">
                        {college.adminIds && college.adminIds.length > 0
                          ? college.adminIds.map((a) => a.userName || a.fullName).join(', ')
                          : <span className="text-[#A8A29E] italic">None assigned</span>
                        }
                      </td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(college)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            college.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {college.isActive
                            ? <><CheckCircle className="w-3 h-3" /> Active</>
                            : <><XCircle className="w-3 h-3" /> Inactive</>
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {!loading && <p className="text-xs text-[#A8A29E] text-right">Click on a row to view college details.</p>}
        </div>
      </div>

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
