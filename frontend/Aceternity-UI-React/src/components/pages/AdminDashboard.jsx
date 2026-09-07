import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import {
  Users, UserPlus, Shield, Ban, Trash2, Loader2,
  ChevronUp, ChevronDown, X, RefreshCw, CheckCircle
} from 'lucide-react';

const ROLES = ['teacher', 'reviewer', 'admin'];

// ─── Role badge colors ────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const colors = {
    admin:    'bg-purple-500/20 text-purple-300 border-purple-500/30',
    reviewer: 'bg-blue-500/20   text-blue-300   border-blue-500/30',
    teacher:  'bg-green-500/20  text-green-300  border-green-500/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[role] || colors.teacher}`}>
      {role}
    </span>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'teacher',
    collegeName: '', department: '', phone: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await apiClient.post('/admin/users', form);
      if (res.data && !res.data.error) {
        onSuccess(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" /> Add New User
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name"     value={form.name}     onChange={handleChange} required placeholder="Full Name *" type="text"     className="w-full bg-gray-800 border border-gray-600 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="email"    value={form.email}    onChange={handleChange} required placeholder="Email *"     type="email"    className="w-full bg-gray-800 border border-gray-600 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="password" value={form.password} onChange={handleChange} required placeholder="Password * (min 6 chars)" type="password" minLength="6" className="w-full bg-gray-800 border border-gray-600 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <select name="role" value={form.role} onChange={handleChange} className="w-full bg-gray-800 border border-gray-600 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <input name="collegeName" value={form.collegeName} onChange={handleChange} placeholder="College (optional)" type="text" className="bg-gray-800 border border-gray-600 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input name="department"  value={form.department}  onChange={handleChange} placeholder="Dept. (optional)"   type="text" className="bg-gray-800 border border-gray-600 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone (optional)" type="text" className="w-full bg-gray-800 border border-gray-600 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <div className="flex gap-3 pt-3 border-t border-gray-700">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
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
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleBlock = async (userId) => {
    setActionLoading(userId + '-block');
    try {
      const res = await apiClient.put(`/admin/users/${userId}/block`);
      setUsers(prev => prev.map(u => u._id === userId ? res.data.user : u));
      showToast(res.data.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update block status', 'error');
    } finally {
      setActionLoading('');
    }
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
    } finally {
      setActionLoading('');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // Filter + sort
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
      ? <ChevronUp className="w-3 h-3 text-blue-400" />
      : <ChevronDown className="w-3 h-3 text-blue-400" />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 text-sm">{users.length} total users</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchUsers} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors shadow-lg"
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast.text && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium
            ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
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
            className="w-full md:w-96 bg-gray-900 border border-gray-700 text-white px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
          />
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/60 border-b border-gray-700">
                  <tr>
                    {[['fullName','Name'], ['email','Email'], ['role','Role'], ['department','Dept.'], ['createdAt','Joined']].map(([field, label]) => (
                      <th key={field} onClick={() => handleSort(field)} className="px-4 py-3 text-left text-gray-400 font-medium cursor-pointer hover:text-white select-none">
                        <span className="flex items-center gap-1">{label} <SortIcon field={field} /></span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filtered.map(u => (
                    <tr key={u._id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{u.fullName || u.userName}</div>
                        <div className="text-xs text-gray-500">{u.collegeName}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role || 'teacher'}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                          disabled={actionLoading === u._id + '-role'}
                          className="bg-gray-800 border border-gray-600 text-white text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.department || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${u.isBlocked ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
                          {u.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleBlock(u._id)}
                            disabled={!!actionLoading}
                            title={u.isBlocked ? 'Unblock' : 'Block'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${u.isBlocked ? 'text-green-400 hover:bg-green-500/10' : 'text-yellow-400 hover:bg-yellow-500/10'}`}
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
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
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

        <p className="text-gray-600 text-xs mt-4 text-center">
          Showing {filtered.length} of {users.length} users
        </p>
      </div>

      {/* Add User Modal */}
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
