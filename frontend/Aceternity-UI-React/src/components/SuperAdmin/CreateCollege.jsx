import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '../../api/client';
import { Building2, X, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { createCollegeSchema } from '../../schemas/validationSchemas';
import FormInput from '../FormInput';

export default function CreateCollege({ onClose, onSuccess }) {
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCollegeSchema),
    defaultValues: { name: '', code: '', city: '', state: '' },
  });

  const handleClose = () => {
    reset();
    setAddress('');
    setIsActive(true);
    onClose?.();
  };

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');

    try {
      const res = await apiClient.post('/super-admin/colleges', {
        ...data,
        address: address.trim(),
        isActive,
        name: data.name.trim(),
      });

      if (res.data && !res.data.error) {
        setSuccess('College created successfully!');
        setTimeout(() => {
          reset();
          if (onSuccess) onSuccess(res.data.college);
          if (onClose) onClose();
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create college.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate__animated animate__fadeIn animate__faster">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-white">
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
          <button type="button" onClick={handleClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormInput label="College Name" name="name" register={register} error={errors.name} placeholder="e.g. Walchand College of Engineering" required />
            </div>

            <div>
              <FormInput label="College Code" name="code" register={register} error={errors.code} placeholder="e.g. WCE001" required />
              <p className="text-[11px] text-zinc-400 -mt-2 mb-2">Unique identifier used for teacher registration</p>
            </div>

            <FormInput label="City" name="city" register={register} error={errors.city} placeholder="e.g. Sangli" />

            <FormInput label="State" name="state" register={register} error={errors.state} placeholder="e.g. Maharashtra" />

            <div className="flex items-center sm:pt-6">
              <label className="relative flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                <span className="ml-3 text-sm font-medium text-zinc-300">
                  {isActive ? 'Active College' : 'Inactive'}
                </span>
              </label>
            </div>

            <div className="sm:col-span-2 mb-4">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Full Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Campus address / street details"
                className="w-full px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
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
