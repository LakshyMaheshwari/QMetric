import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { User, Mail, Shield, Save, Loader2 } from 'lucide-react';
import { ProfileSkeleton } from '../SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { profileSchema } from '../../schemas/validationSchemas';
import FormInput from '../FormInput';

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
      <div className="min-h-screen bg-gray-950 text-white py-12 px-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white">Your Profile</h1>
            <p className="text-gray-400">Manage your account details and preferences.</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            {message.text && (
              <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Address
                  </label>
                  <input
                    type="email"
                    value={profileMeta.email}
                    disabled
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Account Role
                  </label>
                  <input
                    type="text"
                    value={profileMeta.role.charAt(0).toUpperCase() + profileMeta.role.slice(1)}
                    disabled
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <hr className="border-gray-800" />

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
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
