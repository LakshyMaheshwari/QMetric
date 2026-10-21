import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Clock3, GraduationCap, Upload, Building2 } from 'lucide-react';

export default function CollegeAffiliationPanel() {
  const { user, login } = useAuth();
  const [colleges, setColleges] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState('affiliated');
  const [collegeId, setCollegeId] = useState('');
  const [idPhoto, setIdPhoto] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const needsCollegeOptions = user?.role === 'student' || (user?.role === 'teacher' && !user?.collegeId);

  useEffect(() => {
    if (!needsCollegeOptions) return;
    const loadColleges = async () => {
      try {
        setLoadingColleges(true);
        const res = await apiClient.get('/auth/colleges');
        setColleges(res.data?.colleges || []);
      } catch (err) {
        setMessage({ text: err.response?.data?.message || 'Failed to load colleges.', type: 'error' });
      } finally {
        setLoadingColleges(false);
      }
    };
    loadColleges();
  }, [needsCollegeOptions]);

  const pendingCollege = useMemo(() => {
    const pendingId = user?.pendingAffiliationRequest?.collegeId;
    if (!pendingId) return null;
    const found = colleges.find((college) => String(college._id) === String(pendingId));
    return found?.name || user?.collegeName || 'the selected college';
  }, [user, colleges]);

  if (!user || (user.role !== 'student' && user.role !== 'teacher')) return null;
  if (user.role === 'teacher' && user.collegeId) return null;

  const refreshProfile = async () => {
    const res = await apiClient.get('/auth/profile');
    if (res.data?.user) login(res.data.user);
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });

    if (intent === 'affiliated' && !collegeId) {
      setMessage({ text: 'Please select a college.', type: 'error' });
      return;
    }

    const formData = new FormData();
    if (user.role === 'student') {
      formData.append('signupIntent', intent);
      if (intent === 'affiliated') formData.append('collegeId', collegeId);
      if (intent === 'affiliated' && idPhoto) formData.append('collegeIdPhoto', idPhoto);
    } else {
      formData.append('collegeId', collegeId);
      if (idPhoto) formData.append('collegeIdPhoto', idPhoto);
    }

    try {
      setLoading(true);
      const endpoint = user.role === 'student'
        ? '/auth/profile/upgrade-to-teacher'
        : '/auth/profile/request-affiliation';
      const res = await apiClient.post(endpoint, formData);
      await refreshProfile();
      setMessage({ text: res.data?.message || 'Request submitted successfully.', type: 'success' });
      setCollegeId('');
      setIdPhoto(null);
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Unable to submit request.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (user.role === 'teacher' && user.collegeApprovalStatus === 'pending') {
    return (
      <section className="bg-white border border-[#E8E2D7] rounded-2xl shadow-sm p-8 mt-6">
        <div className="flex items-center gap-3 mb-3">
          <Clock3 className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-bold text-[#111827]">College Affiliation Pending</h2>
        </div>
        <p className="text-[#57534E] text-sm">
          Your request is awaiting approval from <strong className="text-[#111827]">{pendingCollege}</strong>. You can contact the college exam cell directly if you need to follow up.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-[#E8E2D7] rounded-2xl shadow-sm p-8 mt-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
          {user.role === 'student' ? <GraduationCap className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <h2 className="text-xl font-bold text-[#111827]">
          {user.role === 'student' ? 'Teacher Upgrade & College Affiliation' : 'Apply for College Affiliation'}
        </h2>
      </div>
      <p className="text-[#57534E] text-sm mb-5">
        {user.role === 'student'
          ? 'Upgrade your account to teacher access. Independent teachers are activated immediately; affiliated teachers require college approval.'
          : 'You are currently an independent teacher. Select a registered college to request affiliation.'}
      </p>

      {message.text && (
        <div className={`mb-5 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {user.role === 'student' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2">Teacher Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setIntent('independent'); setCollegeId(''); setIdPhoto(null); }}
                className={`p-3.5 rounded-xl border text-left transition-all ${intent === 'independent' ? 'border-orange-500 bg-orange-50/60 text-[#111827] shadow-sm' : 'border-[#E8E2D7] bg-[#FAF7F2] text-[#57534E] hover:bg-neutral-50'}`}
              >
                <div className="font-bold text-sm">Independent Teacher</div>
                <div className="text-xs text-[#78716C] mt-0.5">No college affiliation required. Immediate activation.</div>
              </button>
              <button
                type="button"
                onClick={() => setIntent('affiliated')}
                className={`p-3.5 rounded-xl border text-left transition-all ${intent === 'affiliated' ? 'border-orange-500 bg-orange-50/60 text-[#111827] shadow-sm' : 'border-[#E8E2D7] bg-[#FAF7F2] text-[#57534E] hover:bg-neutral-50'}`}
              >
                <div className="font-bold text-sm">Affiliated Teacher</div>
                <div className="text-xs text-[#78716C] mt-0.5">Requires verified college approval and records.</div>
              </button>
            </div>
          </div>
        )}

        {intent === 'affiliated' && (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2">Select College</label>
              <select
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                disabled={loadingColleges}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-[#111827] text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="">{loadingColleges ? 'Loading colleges...' : 'Select a registered college'}</option>
                {colleges.map((college) => <option key={college._id} value={college._id}>{college.name} ({college.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2">College ID / Staff ID (optional)</label>
              <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl">
                <input type="file" accept="image/*" onChange={(e) => setIdPhoto(e.target.files?.[0] || null)} className="block w-full text-xs text-[#57534E]" />
                <Upload className="w-4 h-4 text-orange-500 shrink-0" />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105 transition-all disabled:opacity-60"
        >
          {loading ? 'Submitting...' : user.role === 'student' ? (intent === 'independent' ? 'Upgrade to Independent Teacher' : 'Request Teacher Approval') : 'Request Affiliation'}
        </button>
      </form>
    </section>
  );
}
