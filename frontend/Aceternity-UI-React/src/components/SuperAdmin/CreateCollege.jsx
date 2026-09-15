import React, { useState } from 'react';
import apiClient from '../../api/client';
import { Building2, X, Plus, AlertCircle, CheckCircle, MapPin, Tag } from 'lucide-react';

export default function CreateCollege({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('College name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setError('College code is required (e.g., WCE001).');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/admin/colleges', {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
      });

      if (res.data && !res.data.error) {
        setSuccess('College created successfully!');
        setTimeout(() => {
          if (onSuccess) onSuccess(res.data.college);
          if (onClose) onClose();
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create college.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate__animated animate__fadeIn animate__faster">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Add New College</h3>
              <p className="text-xs text-zinc-400">Register a new institution in the QMetric system</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* College Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                College Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Walchand College of Engineering"
                  className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* College Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                College Code <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g. WCE001"
                className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white uppercase placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <p className="text-[11px] text-zinc-400">Unique identifier used for teacher registration</p>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Sangli"
                className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Maharashtra"
                className="w-full px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Active Status Toggle */}
            <div className="flex items-center sm:pt-6">
              <label className="relative flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-zinc-300">
                  {formData.isActive ? 'Active College' : 'Inactive'}
                </span>
              </label>
            </div>

            {/* Address */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Full Address
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="Campus address / street details"
                className="w-full px-3.5 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create College</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
