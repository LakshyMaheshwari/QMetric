import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import {
  Users, UserPlus, Shield, Ban, Trash2, Loader2,
  ChevronUp, ChevronDown, X, RefreshCw, CheckCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema } from '../../schemas/validationSchemas';
import FormInput from '../FormInput';

const ROLES = ['teacher', 'reviewer', 'admin'];

// ─── Role badge colors ─────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const colors = {
    admin:    'bg-purple-100 text-purple-700 border-purple-200',
    reviewer: 'bg-blue-100 text-blue-700 border-blue-200',
    teacher:  'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${colors[role] || colors.teacher}`}>
      {role}
    </span>
  );
}

// ─── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSuccess }) {
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'teacher', collegeName: '', department: '', phone: '' },
  });

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (data) => {
    setError('');
    try {
      const res = await apiClient.post('/admin/users', data);
      if (res.data && !res.data.error) { reset(); onSuccess(res.data.user); }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-[#111827] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-500" /> Add New User
          </h3>
          <button type="button" onClick={handleClose} className="text-[#57534E] hover:text-[#111827] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-1" noValidate>
          <FormInput label="Full Name" name="name" register={register} error={errors.name} required />
          <FormInput label="Email" name="email" type="email" register={register} error={errors.email} required />
          <FormInput label="Password" name="password" type="password" register={register} error={errors.password} required />
          <FormInput
            label="Role" name="role" type="select" register={register} error={errors.role}
            options={ROLES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
            required
          />
          <FormInput label="College (optional)" name="collegeName" register={register} error={errors.collegeName} />
          <FormInput label="Department (optional)" name="department" register={register} error={errors.department} />
          <FormInput label="Phone (optional)" name="phone" type="tel" register={register} error={errors.phone} />

          <div className="flex gap-3 pt-3 border-t border-[#E8E2D7]">
            <button type="button" onClick={handleClose}
              className="flex-1 bg-[#FAF7F2] hover:bg-neutral-100 border border-[#E8E2D7] text-[#57534E] py-2.5 rounded-xl transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-semibold shadow-md shadow-orange-500/20">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [toast, setToast]           = useState({ text: '', type: '' });
  const [search, setSearch]         = useState('');
  const [sortField, setSortField]   = useState('createdAt');
  const [sortDir, setSortDir]       = useState('desc');

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users');
      setUsers(res.data.users || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    if (!['admin', 'super_admin'].includes(user.role)) { navigate('/dashboard'); return; }
    fetchUsers();
  }, [user, navigate, fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId + '-role');
    try {
      const res = await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? res.data.user : u));
      showToast(`Role updated to ${newRole}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update role', 'error');
    } finally { setActionLoading(''); }
  };

  const handleToggleBlock = async (userId) => {
    setActionLoading(userId + '-block');
    try {
      const res = await apiClient.put(`/admin/users/${userId}/block`);
      setUsers(prev => prev.map(u => u._id === userId ? res.data.user : u));
      showToast(res.data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update block status', 'error');
    } finally { setActionLoading(''); }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setActionLoading(userId + '-delete');
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      showToast('User deleted');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally { setActionLoading(''); }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = users
    .filter(u => {
      const q = search.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.userName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  function SortIcon({ field }) {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-orange-500" />
      : <ChevronDown className="w-3 h-3 text-orange-500" />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pt-20 pb-10 px-4" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#111827]">Admin Dashboard</h1>
              <p className="text-[#57534E] text-sm">{users.length} total users</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchUsers}
              className="p-2 rounded-xl border border-[#E8E2D7] bg-white text-[#57534E] hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-semibold transition-all shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02]">
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast.text && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold
            ${toast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
            <CheckCircle className="w-4 h-4" />
            {toast.text}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users by name, email, role, or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-96 bg-white border border-[#E8E2D7] text-[#111827] px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 placeholder-[#A8A29E] shadow-sm transition-all"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E8E2D7] rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-[#57534E]">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30 text-orange-400" />
              <p>No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAF7F2] border-b border-[#E8E2D7]">
                  <tr>
                    {[['fullName','Name'], ['email','Email'], ['role','Role'], ['department','Dept.'], ['createdAt','Joined']].map(([field, label]) => (
                      <th key={field} onClick={() => handleSort(field)}
                        className="px-4 py-3 text-left text-[#57534E] font-semibold cursor-pointer hover:text-orange-600 select-none text-xs uppercase tracking-wider">
                        <span className="flex items-center gap-1">{label} <SortIcon field={field} /></span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-[#57534E] font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[#57534E] font-semibold text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {filtered.map(u => (
                    <tr key={u._id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#111827]">{u.fullName || u.userName}</div>
                        <div className="text-xs text-[#78716C]">{u.collegeName}</div>
                      </td>
                      <td className="px-4 py-3 text-[#57534E]">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role || 'teacher'}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                          disabled={actionLoading === u._id + '-role'}
                          className="bg-[#FAF7F2] border border-[#E8E2D7] text-[#111827] text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 disabled:opacity-50 cursor-pointer"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-[#57534E] text-sm">{u.department || '—'}</td>
                      <td className="px-4 py-3 text-[#78716C] text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                          u.isBlocked
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {u.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleBlock(u._id)}
                            disabled={!!actionLoading}
                            title={u.isBlocked ? 'Unblock' : 'Block'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                              u.isBlocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {actionLoading === u._id + '-block'
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Ban className="w-4 h-4" />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(u._id, u.fullName || u.userName)}
                            disabled={!!actionLoading}
                            title="Delete user"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === u._id + '-delete'
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[#78716C] text-xs mt-4 text-center">
          Showing {filtered.length} of {users.length} users
        </p>
      </div>

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onSuccess={(newUser) => {
            setUsers(prev => [newUser, ...prev]);
            setShowModal(false);
            showToast('User created successfully!');
          }}
        />
      )}
    </div>
  );
}
