import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { User, Mail, Shield, Save, Loader2, ArrowLeft } from 'lucide-react';
import { ProfileSkeleton } from '../SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { profileSchema } from '../../schemas/validationSchemas';
import FormInput from '../FormInput';
import CollegeAffiliationPanel from './CollegeAffiliationPanel';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [profileMeta, setProfileMeta] = useState({ email: '', role: 'teacher' });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      collegeName: '',
      department: '',
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      reset({
        fullName: user.fullName || user.userName || '',
        phone: user.phone || '',
        collegeName: user.collegeName || '',
        department: user.department || '',
      });
    }
  }, [user, reset]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/auth/profile');
      if (response.data && response.data.user) {
        const u = response.data.user;
        setProfileMeta({
          email: u.email || '',
          role: u.role || 'teacher',
        });
        reset({
          fullName: u.fullName || u.userName || '',
          phone: u.phone || '',
          collegeName: u.collegeName || '',
          department: u.department || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile', error);
      setMessage({ text: 'Failed to load profile data.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setMessage({ text: '', type: '' });

    try {
      const response = await apiClient.put('/auth/profile', data);

      if (response.data && response.data.user) {
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        login(response.data.user);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to update profile. Please try again.';
      setMessage({ text: errorMsg, type: 'error' });
    }
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] py-20 px-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-[#111827]">Account Profile</h1>
              <p className="text-[#57534E] text-sm mt-0.5">Manage your institutional credentials and personal preferences.</p>
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-[#E8E2D7] text-[#57534E] hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>

        <div className="bg-white border border-[#E8E2D7] rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="p-8">
            {message.text && (
              <div className={`mb-6 p-4 rounded-xl flex items-center text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[#374151] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-orange-500" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={profileMeta.email}
                    disabled
                    className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-[#57534E] cursor-not-allowed font-medium text-sm"
                  />
                  <p className="text-[11px] text-[#78716C] mt-1.5">Primary institutional email cannot be changed directly.</p>
                </div>
                <div>
                  <label className="block text-[#374151] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-orange-500" /> Account Role
                  </label>
                  <input
                    type="text"
                    value={profileMeta.role.charAt(0).toUpperCase() + profileMeta.role.slice(1)}
                    disabled
                    className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-[#57534E] cursor-not-allowed font-medium text-sm"
                  />
                </div>
              </div>

              <hr className="border-[#E8E2D7]" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Full Name" name="fullName" register={register} error={errors.fullName} required />
                <FormInput label="Phone Number" name="phone" type="tel" register={register} error={errors.phone} />
                {profileMeta.role === 'teacher' && (
                  <>
                    <FormInput label="College Name" name="collegeName" register={register} error={errors.collegeName} />
                    <FormInput label="Department" name="department" register={register} error={errors.department} />
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-full font-bold text-sm shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <CollegeAffiliationPanel />
      </div>
    </div>
  );
}
