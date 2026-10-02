import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import {
  Building, Users, UserCheck, Shield, FileText, Ban,
  Plus, Search, Filter, RefreshCw, X, AlertCircle, CheckCircle,
  Award
} from 'lucide-react';
import { DashboardSkeleton } from '../SkeletonLoader';
import PendingTeachersPanel from './PendingTeachersPanel';
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
      if (search.trim()) params.search = search.trim();
      if (roleFilter && roleFilter !== 'all') params.role = roleFilter;

      const [usersRes, statsRes] = await Promise.all([
        apiClient.get('/college-admin/users', { params }),
        apiClient.get('/college-admin/stats'),
      ]);

      if (usersRes.data && !usersRes.data.error) {
        setUsers(usersRes.data.users || []);
      }
      if (statsRes.data && !statsRes.data.error) {
        setStats(statsRes.data.stats);
      }
    } catch (error) {
      console.error('Error fetching college admin data:', error);
      setMessage({ text: error.response?.data?.message || 'Failed to fetch college users', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleBlock = async (userId) => {
    try {
      setActionLoadingId(userId);
      const response = await apiClient.put(`/college-admin/users/${userId}/block`);
      if (response.data && !response.data.error) {
        setMessage({ text: response.data.message, type: 'success' });
        fetchData();
      }
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Failed to update block status', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const changeRole = async (userId, newRole) => {
    try {
      setActionLoadingId(userId);
      const response = await apiClient.put(`/college-admin/users/${userId}/role`, { role: newRole });
      if (response.data && !response.data.error) {
        setMessage({ text: response.data.message, type: 'success' });
        fetchData();
      }
    } catch (error) {
      setMessage({ text: error.response?.data?.message || 'Failed to update user role', type: 'error' });
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
      <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <DashboardSkeleton cards={4} tableRows={8} tableCols={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {loading && users.length > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse z-50" />
      )}
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <Building className="w-3 h-3" /> College Administrator
              </span>
              {stats?.college?.code && (
                <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {stats.college.code}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              🏛️ {stats?.college?.name || user?.collegeName || 'College Admin Dashboard'}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Welcome back, <span className="text-zinc-200 font-medium">{user?.fullName || user?.userName}</span>. Manage your college faculty, reviewers, and quality metrics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700 flex items-center justify-center"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {message.text && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${
              message.type === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ text: '', type: '' })} className="hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <PendingTeachersPanel />

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{stats.users?.total || 0}</div>
              <div className="text-xs text-zinc-500 mt-1">{stats.users?.blocked || 0} blocked</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Teachers</span>
                <UserCheck className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-400">{stats.users?.teachers || 0}</div>
              <div className="text-xs text-zinc-500 mt-1">Active faculty</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Reviewers</span>
                <Shield className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-indigo-300">{stats.users?.reviewers || 0}</div>
              <div className="text-xs text-zinc-500 mt-1">Department reviewers</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Papers Checked</span>
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-300">{stats.papers?.total || 0}</div>
              <div className="text-xs text-zinc-500 mt-1">{stats.papers?.last30Days || 0} in last 30d</div>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Avg Quality</span>
                <Award className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400">{stats.papers?.avgScore ? `${stats.papers.avgScore}%` : 'N/A'}</div>
              <div className="text-xs text-zinc-500 mt-1">Evaluation score</div>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900/70 p-4 rounded-2xl border border-zinc-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search faculty name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-zinc-800/80 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">All Roles</option>
              <option value="teacher">Teachers</option>
              <option value="reviewer">Reviewers</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-3.5 px-4 font-semibold">User</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Email</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Role</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Department</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-zinc-600" />
                        <p className="font-medium text-zinc-300">No users found in your college</p>
                        <p className="text-xs text-zinc-500">Click "Add User" above to invite faculty.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelf = u._id === user?._id;
                    const isSuperAdmin = u.role === 'super_admin';

                    return (
                      <tr key={u._id} className={`hover:bg-zinc-800/40 transition-colors ${u.isBlocked ? 'bg-red-950/10' : ''}`}>
                        <td className="py-4 px-4 font-medium text-white">
                          <div className="font-semibold text-white">{u.fullName || u.userName}</div>
                          {u.position && <div className="text-xs text-zinc-400">{u.position}</div>}
                        </td>
                        <td className="py-4 px-4 text-zinc-300">{u.email}</td>
                        <td className="py-4 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u._id, e.target.value)}
                            disabled={isSelf || isSuperAdmin || actionLoadingId === u._id}
                            className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                          >
                            <option value="teacher">Teacher</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="admin">Admin</option>
                            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                          </select>
                        </td>
                        <td className="py-4 px-4 text-zinc-400">{u.department || '—'}</td>
                        <td className="py-4 px-4 text-center">
                          {u.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                              <Ban className="w-3 h-3" /> Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/30">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => toggleBlock(u._id)}
                            disabled={isSelf || isSuperAdmin || actionLoadingId === u._id}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                              u.isBlocked
                                ? 'bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white border border-green-600/30'
                                : 'bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-600/30'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate__animated animate__fadeIn animate__faster">
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Add User to College</h3>
              </div>
              <button
                type="button"
                onClick={closeAddUserModal}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={closeAddUserModal}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg disabled:opacity-50 flex items-center gap-2"
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
