import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import CreateCollege from './CreateCollege';
import {
  Building2, Plus, Search, Filter, RefreshCw, FileText,
  Users, CheckCircle, XCircle, Trash2, Edit2, MapPin,
  Shield, Check, X, AlertCircle
} from 'lucide-react';

export default function Colleges() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [colleges, setColleges] = useState([]);
  const [summary, setSummary] = useState({
    totalColleges: 0,
    activeColleges: 0,
    inactiveColleges: 0,
    totalTeachers: 0,
    totalPapers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals / Editing state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', code: '', city: '', state: '', address: '', isActive: true });
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Super Admin security guard
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const fetchColleges = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/admin/colleges', { params });
      if (res.data && !res.data.error) {
        setColleges(res.data.colleges || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching colleges:', err);
      setError(err.response?.data?.message || 'Failed to load colleges');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  const handleToggleStatus = async (college) => {
    try {
      setUpdatingId(college._id);
      const res = await apiClient.put(`/admin/colleges/${college._id}`, {
        isActive: !college.isActive,
      });
      if (res.data && !res.data.error) {
        setColleges((prev) =>
          prev.map((c) => (c._id === college._id ? { ...c, isActive: !c.isActive } : c))
        );
        setSuccess(`Updated status for ${college.name}`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartEdit = (college) => {
    setEditingCollege(college._id);
    setEditForm({
      name: college.name || '',
      code: college.code || '',
      city: college.city || '',
      state: college.state || '',
      address: college.address || '',
      isActive: college.isActive ?? true,
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      setUpdatingId(id);
      const res = await apiClient.put(`/admin/colleges/${id}`, editForm);
      if (res.data && !res.data.error) {
        setColleges((prev) =>
          prev.map((c) => (c._id === id ? { ...c, ...res.data.college } : c))
        );
        setEditingCollege(null);
        setSuccess('College updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update college');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (college) => {
    if (!window.confirm(`Are you sure you want to delete "${college.name}"?`)) return;

    try {
      setDeletingId(college._id);
      const res = await apiClient.delete(`/admin/colleges/${college._id}`);
      if (res.data && !res.data.error) {
        setColleges((prev) => prev.filter((c) => c._id !== college._id));
        setSuccess('College deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete college');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Super Admin Portal
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-500" />
              Manage Colleges
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Multi-tenant management for registered colleges, institutions, and tenant stats.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchColleges}
              disabled={loading}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700 flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add College</span>
            </button>
          </div>
        </div>

        {/* System Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Colleges</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">{summary.totalColleges}</div>
            <div className="text-xs text-zinc-500 mt-1">{summary.activeColleges} active institutions</div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Status</span>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{summary.activeColleges}</div>
            <div className="text-xs text-zinc-500 mt-1">{summary.inactiveColleges} inactive</div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Teachers</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">{summary.totalTeachers}</div>
            <div className="text-xs text-zinc-500 mt-1">Across all registered colleges</div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-md">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Papers Processed</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300">{summary.totalPapers}</div>
            <div className="text-xs text-zinc-500 mt-1">System-wide evaluations</div>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, code, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                  <th scope="col" className="py-3.5 px-4 font-semibold">College Info</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Code</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold">Location</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-center">Teachers</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-center">Papers</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th scope="col" className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {loading && colleges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                        <span>Loading colleges...</span>
                      </div>
                    </td>
                  </tr>
                ) : colleges.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="w-8 h-8 text-zinc-600" />
                        <p className="font-medium text-zinc-300">No colleges found</p>
                        <p className="text-xs text-zinc-500">Add a college or adjust your search filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  colleges.map((college) => {
                    const isEditing = editingCollege === college._id;

                    return (
                      <tr key={college._id} className="hover:bg-zinc-800/40 transition-colors">
                        {/* College Info */}
                        <td className="py-4 px-4 font-medium text-white max-w-xs">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <div>
                              <div className="font-semibold text-white">{college.name}</div>
                              {college.address && (
                                <div className="text-xs text-zinc-400 truncate max-w-xs">{college.address}</div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Code */}
                        <td className="py-4 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.code}
                              onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                              className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs uppercase text-white font-mono"
                            />
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-zinc-800 border border-zinc-700 text-blue-300">
                              {college.code}
                            </span>
                          )}
                        </td>

                        {/* Location */}
                        <td className="py-4 px-4 text-xs text-zinc-400">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="City"
                                value={editForm.city}
                                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-20 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                              />
                              <input
                                type="text"
                                placeholder="State"
                                value={editForm.state}
                                onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                                className="w-24 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span>
                                {[college.city, college.state].filter(Boolean).join(', ') || '—'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Teachers Count */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {college.totalTeachers ?? 0}
                          </span>
                        </td>

                        {/* Papers Count */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {college.totalPapers ?? 0}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(college)}
                            disabled={updatingId === college._id}
                            className="cursor-pointer"
                            title="Click to toggle status"
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

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(college._id)}
                                disabled={updatingId === college._id}
                                className="p-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingCollege(null)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEdit(college)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                                title="Edit College"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(college)}
                                disabled={deletingId === college._id}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                                title="Delete College"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
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

      {/* Create College Modal */}
      {showCreateModal && (
        <CreateCollege
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newCollege) => {
            setColleges((prev) => [newCollege, ...prev]);
            setSummary((prev) => ({
              ...prev,
              totalColleges: prev.totalColleges + 1,
              activeColleges: prev.activeColleges + (newCollege.isActive ? 1 : 0),
            }));
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
