import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import {
  Building, Users, UserCheck, Shield, FileText, Ban,
  Plus, Search, Filter, RefreshCw, X, AlertCircle, CheckCircle,
  Award, Activity
} from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';
import PendingTeachersPanel from './PendingTeachersPanel';
import ContributionSkyline from '../ui/contribution-skyline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCollegeUserSchema } from '../../schemas/validationSchemas';
import FormInput from '../FormInput';

export default function CollegeAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);

  const {
    register: registerAddUser,
    handleSubmit: handleSubmitAddUser,
    reset: resetAddUser,
    formState: { errors: addUserErrors, isSubmitting: isAddingUser },
  } = useForm({
    resolver: zodResolver(createCollegeUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'teacher',
      department: '',
      position: 'Professor',
      phone: '',
    },
  });

  // Guard: allow admin or super_admin
  useEffect(() => {
    if (user && !['admin', 'super_admin'].includes(user.role)) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;

      const [usersRes, statsRes] = await Promise.all([
        apiClient.get('/college-admin/users', { params }),
        apiClient.get('/college-admin/stats'),
      ]);

      setUsers(usersRes.data.users || []);
      setStats(statsRes.data || null);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Failed to load dashboard data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  const fetchActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      setActivityError(null);
      const res = await apiClient.get('/college-admin/activity');
      setActivityData(res.data?.dailyActivity || []);
    } catch (err) {
      setActivityError(err.response?.data?.message || 'Failed to load college activity data');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const retryActivityFetch = () => {
    fetchActivity();
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const toggleBlock = async (targetUserId) => {
    try {
      setActionLoadingId(targetUserId);
      const response = await apiClient.patch(`/college-admin/users/${targetUserId}/toggle-block`);
      if (response.data && !response.data.error) {
        setMessage({ text: response.data.message, type: 'success' });
        fetchData();
      }
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Action failed',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const changeRole = async (targetUserId, newRole) => {
    try {
      setActionLoadingId(targetUserId);
      const response = await apiClient.patch(`/college-admin/users/${targetUserId}/role`, { role: newRole });
      if (response.data && !response.data.error) {
        setMessage({ text: response.data.message, type: 'success' });
        fetchData();
      }
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || 'Failed to update role',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const closeAddUserModal = () => {
    setShowAddModal(false);
    resetAddUser();
  };

  const onAddUser = async (data) => {
    try {
      const response = await apiClient.post('/college-admin/users', data);
      if (response.data && !response.data.error) {
        setMessage({ text: 'User added successfully to your college!', type: 'success' });
        closeAddUserModal();
        fetchData();
      }
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Failed to add user', type: 'error' });
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] text-[#111827] pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={4} tableRows={8} tableCols={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#111827] pt-20 pb-16 px-4 sm:px-6 lg:px-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {loading && users.length > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-orange-500 animate-pulse z-50" />
      )}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D7] pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center gap-1">
                <Building className="w-3 h-3" /> College Administrator
              </span>
              {stats?.college?.code && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-neutral-100 text-[#57534E] border border-[#E8E2D7]">
                  {stats.college.code}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111827] flex items-center gap-3">
              🏛️ {stats?.college?.name || user?.collegeName || 'College Admin Dashboard'}
            </h1>
            <p className="text-sm text-[#57534E] mt-1">
              Welcome back, <span className="text-[#111827] font-semibold">{user?.fullName || user?.userName}</span>. Manage your college faculty, reviewers, and quality metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white border border-[#E8E2D7] text-[#57534E] hover:bg-neutral-50 shadow-sm transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition-all shadow-orange-500/10"
            >
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {message.text && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage({ text: '', type: '' })}
              className="p-1 rounded-lg hover:bg-black/5 text-[#78716C]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <PendingTeachersPanel />

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E8E2D7] shadow-sm">
              <div className="flex items-center justify-between text-[#78716C] mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-[#111827]">{stats.users?.total || 0}</div>
              <div className="text-xs text-[#78716C] mt-1">{stats.users?.blocked || 0} blocked</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E8E2D7] shadow-sm">
              <div className="flex items-center justify-between text-[#78716C] mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Teachers</span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">{stats.users?.teachers || 0}</div>
              <div className="text-xs text-[#78716C] mt-1">Active faculty</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E8E2D7] shadow-sm">
              <div className="flex items-center justify-between text-[#78716C] mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Reviewers</span>
                <Shield className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-indigo-600">{stats.users?.reviewers || 0}</div>
              <div className="text-xs text-[#78716C] mt-1">Department reviewers</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E8E2D7] shadow-sm">
              <div className="flex items-center justify-between text-[#78716C] mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Papers Checked</span>
                <FileText className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-orange-600">{stats.papers?.total || 0}</div>
              <div className="text-xs text-[#78716C] mt-1">{stats.papers?.last30Days || 0} in last 30d</div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E8E2D7] shadow-sm">
              <div className="flex items-center justify-between text-[#78716C] mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Quality</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{stats.papers?.avgScore ? `${stats.papers.avgScore}%` : 'N/A'}</div>
              <div className="text-xs text-[#78716C] mt-1">Evaluation score</div>
            </div>
          </div>
        )}

        {/* Paper Upload Activity Skyline */}
        <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                  <Activity className="w-4 h-4" />
                </span>
                <h2 className="text-lg font-bold text-[#111827]">College Paper Upload Activity</h2>
              </div>
              <p className="text-xs text-[#78716C] mt-1">
                Daily exam paper uploads across faculty over the last 12 months.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={retryActivityFetch}
                disabled={activityLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] text-xs font-medium text-[#57534E] hover:bg-neutral-100 transition-colors"
                title="Refresh college activity skyline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${activityLoading ? 'animate-spin text-orange-500' : 'text-[#78716C]'}`} />
                {activityLoading ? 'Updating…' : 'Refresh'}
              </button>
            </div>
          </div>

          {activityError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{activityError}</span>
              </div>
              <button
                onClick={retryActivityFetch}
                className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : activityLoading && activityData.length === 0 ? (
            <div className="h-64 rounded-xl bg-stone-50 border border-[#E8E2D7] animate-pulse flex items-center justify-center text-[#78716C] text-sm">
              Loading contribution skyline…
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-xl bg-[#FAF7F2] p-2 sm:p-4 border border-[#E8E2D7]">
              <ContributionSkyline
                data={activityData}
                unit="paper upload"
                unitPlural="paper uploads"
                title="College Paper Upload Activity"
                palette="github"
                className="border-0 bg-transparent text-[#111827]"
              />
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-[#E8E2D7] shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              type="text"
              placeholder="Search faculty name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#111827] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-[#78716C]" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-sm text-[#57534E] focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              <option value="all">All Roles</option>
              <option value="teacher">Teachers</option>
              <option value="reviewer">Reviewers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#57534E]">
              <thead className="bg-[#FAF7F2] text-xs uppercase font-semibold tracking-wider text-[#78716C] border-b border-[#E8E2D7]">
                <tr>
                  <th scope="col" className="py-3.5 px-4 font-semibold">User</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Email</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Role</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Department</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE1]">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#78716C]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-[#A8A29E]" />
                        <p className="font-medium text-[#111827]">No users found in your college</p>
                        <p className="text-xs text-[#78716C]">Click "Add User" above to invite faculty.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u._id === user?._id;
                    const isSuperAdmin = u.role === 'super_admin';

                    return (
                      <tr key={u._id} className={`hover:bg-[#FAF7F2]/60 transition-colors ${u.isBlocked ? 'bg-red-50/40' : ''}`}>
                        <td className="py-4 px-4 font-medium text-[#111827]">
                          <div className="font-semibold text-[#111827]">{u.fullName || u.userName}</div>
                          {u.position && <div className="text-xs text-[#78716C]">{u.position}</div>}
                        </td>
                        <td className="py-4 px-4 text-[#57534E]">{u.email}</td>
                        <td className="py-4 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u._id, e.target.value)}
                            disabled={isSelf || isSuperAdmin || actionLoadingId === u._id}
                            className="px-2.5 py-1 bg-[#FAF7F2] border border-[#E8E2D7] rounded-lg text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50 cursor-pointer"
                          >
                            <option value="teacher">Teacher</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="admin">Admin</option>
                            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                          </select>
                        </td>
                        <td className="py-4 px-4 text-[#78716C]">{u.department || '—'}</td>
                        <td className="py-4 px-4 text-center">
                          {u.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                              <Ban className="w-3 h-3" /> Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => toggleBlock(u._id)}
                            disabled={isSelf || isSuperAdmin || actionLoadingId === u._id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50 ${
                              u.isBlocked
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate__animated animate__fadeIn animate__faster">
          <div className="relative w-full max-w-lg bg-white border border-[#E8E2D7] rounded-2xl shadow-xl p-6 sm:p-8 text-[#111827]">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E8E2D7]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-600">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-[#111827]">Add User to College</h3>
              </div>
              <button
                type="button"
                onClick={closeAddUserModal}
                className="p-2 rounded-xl text-[#78716C] hover:text-[#111827] hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddUser(onAddUser)} className="space-y-1" noValidate>
              <FormInput label="Full Name" name="name" register={registerAddUser} error={addUserErrors.name} placeholder="e.g. Dr. Rajesh Sharma" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput label="Email Address" name="email" type="email" register={registerAddUser} error={addUserErrors.email} placeholder="faculty@college.edu" required />
                <FormInput label="Password" name="password" type="password" register={registerAddUser} error={addUserErrors.password} placeholder="Min 8 chars" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label="Role"
                  name="role"
                  type="select"
                  register={registerAddUser}
                  error={addUserErrors.role}
                  options={[
                    { value: 'teacher', label: 'Teacher' },
                    { value: 'reviewer', label: 'Reviewer' },
                    { value: 'admin', label: 'College Admin' },
                  ]}
                />
                <FormInput
                  label="Position"
                  name="position"
                  type="select"
                  register={registerAddUser}
                  error={addUserErrors.position}
                  options={['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'HoD', 'Other']}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput label="Department" name="department" register={registerAddUser} error={addUserErrors.department} placeholder="e.g. Computer Science" />
                <FormInput label="Phone Number" name="phone" type="tel" register={registerAddUser} error={addUserErrors.phone} placeholder="10-digit phone" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D7]">
                <button
                  type="button"
                  onClick={closeAddUserModal}
                  className="px-4 py-2 text-sm text-[#78716C] hover:text-[#111827] rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {isAddingUser ? 'Adding User...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
