import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { Building2, CheckCircle, Search, ShieldCheck, ArrowLeft } from 'lucide-react';

const initialForm = {
  collegeName: '',
  collegeCode: '',
  address: '',
  city: '',
  state: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  password: '',
  confirmPassword: '',
};

function validate(form) {
  if (!form.collegeName.trim() || !form.collegeCode.trim() || !form.contactName.trim() || !form.contactEmail.trim() || !form.contactPhone || !form.password) {
    return 'Please complete all required fields.';
  }
  if (!/^[A-Za-z0-9]+$/.test(form.collegeCode.trim())) {
    return 'College code must contain only letters and numbers.';
  }
  if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) {
    return 'Please enter a valid contact email.';
  }
  if (!/^\d{10}$/.test(form.contactPhone)) {
    return 'Contact phone must be exactly 10 digits.';
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
    return 'Password must be at least 8 characters and include uppercase, lowercase, and a number.';
  }
  if (form.password !== form.confirmPassword) {
    return 'Passwords do not match.';
  }
  return '';
}

export default function CollegeRegistrationPage() {
  const [form, setForm] = useState(initialForm);
  const [application, setApplication] = useState(null);
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    setError('');
    setApplication(null);

    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      const { confirmPassword, ...payload } = form;
      const response = await apiClient.post('/auth/college-applications', {
        ...payload,
        collegeName: payload.collegeName.trim(),
        collegeCode: payload.collegeCode.trim().toUpperCase(),
        contactName: payload.contactName.trim(),
        contactEmail: payload.contactEmail.trim().toLowerCase(),
        contactPhone: payload.contactPhone.trim(),
      });

      setApplication(response.data.application);
      setForm(initialForm);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit college registration request.');
    } finally {
      setLoading(false);
    }
  };

  const lookupApplication = async (event) => {
    event.preventDefault();
    setLookupError('');
    setLookupResult(null);
    if (!lookupId.trim()) {
      setLookupError('Enter your application ID.');
      return;
    }

    try {
      setLookupLoading(true);
      const response = await apiClient.get(`/auth/college-applications/${lookupId.trim()}`);
      setLookupResult(response.data.application);
    } catch (err) {
      setLookupError(err.response?.data?.message || 'Application not found.');
    } finally {
      setLookupLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] text-[#111827] placeholder-[#A8A29E] text-sm focus:outline-none focus:border-orange-500 transition-all font-medium';

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full mx-auto space-y-8 bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-[#E8E2D7]">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Building2 className="w-4 h-4" />
            <span>Institutional Exam Cell Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tight">Register Your College</h1>
          <p className="mt-2 text-sm text-[#57534E] max-w-xl mx-auto">
            Submit your institution for accreditation and system onboarding. Approval sets up your autonomous college domain and admin exam cell.
          </p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-sm font-medium">{error}</div>}

        {application ? (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-6 rounded-2xl">
              <div className="flex items-center gap-2 font-bold text-base mb-2 text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Application submitted successfully!
              </div>
              <p className="text-sm text-emerald-800/90 leading-relaxed">
                Please securely store your application ID. You can verify review and approval status anytime using the tracker below.
              </p>
              <div className="mt-3 p-3.5 bg-white border border-emerald-200 rounded-xl font-mono text-sm break-all text-[#111827] font-bold">
                {application._id}
              </div>
              <p className="mt-3 text-xs font-semibold text-emerald-800">Current status: <span className="uppercase px-2 py-0.5 bg-emerald-100 rounded-md font-bold text-emerald-900">{application.status}</span></p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="px-5 py-2.5 rounded-full border border-[#E8E2D7] bg-[#FAF7F2] text-[#111827] hover:bg-neutral-100 text-sm font-semibold transition-all">
                Register a User Account
              </Link>
              <button
                type="button"
                onClick={() => setApplication(null)}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitApplication} className="space-y-6" noValidate>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-3 flex items-center gap-2">
                <span>01</span> Institution Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="College / Institution Name *" value={form.collegeName} onChange={(e) => updateField('collegeName', e.target.value)} />
                <input className={inputClass} placeholder="College Code (e.g., WCE) *" value={form.collegeCode} onChange={(e) => updateField('collegeCode', e.target.value.toUpperCase())} />
                <input className={`${inputClass} md:col-span-2`} placeholder="Campus Address" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                <input className={inputClass} placeholder="City" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                <input className={inputClass} placeholder="State" value={form.state} onChange={(e) => updateField('state', e.target.value)} />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-3 flex items-center gap-2">
                <span>02</span> Exam Cell / Admin Contact
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="Contact Person Name *" value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} />
                <input className={inputClass} type="email" placeholder="Official Institutional Email *" value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} />
                <input className={inputClass} type="tel" placeholder="10-digit Phone Number *" value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </div>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1 flex items-center gap-2">
                <span>03</span> Initial College Admin Credentials
              </h2>
              <p className="text-xs text-[#78716C] mb-3">This password is encrypted and will become active once Super Admin authorizes the institution application.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputClass} type="password" placeholder="Create Password *" value={form.password} onChange={(e) => updateField('password', e.target.value)} />
                <input className={inputClass} type="password" placeholder="Confirm Password *" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3.5 rounded-full font-bold text-sm shadow-md shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-60"
            >
              {loading ? 'Submitting Application...' : 'Submit College Registration'}
            </button>
          </form>
        )}

        <div className="border-t border-[#E8E2D7] pt-6">
          <div className="flex items-center gap-2 text-[#111827] font-bold text-sm mb-3">
            <Search className="w-4 h-4 text-orange-500" /> Check Application Status
          </div>
          <form onSubmit={lookupApplication} className="flex flex-col sm:flex-row gap-3">
            <input className={`${inputClass} flex-1`} placeholder="Paste application ID" value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
            <button
              type="submit"
              disabled={lookupLoading}
              className="px-6 py-2.5 rounded-full bg-white border border-[#E8E2D7] hover:border-orange-300 text-[#111827] text-sm font-bold shadow-sm transition-all disabled:opacity-60"
            >
              {lookupLoading ? 'Checking...' : 'Check Status'}
            </button>
          </form>
          {lookupError && <p className="mt-2 text-xs font-semibold text-red-600">{lookupError}</p>}
          {lookupResult && (
            <div className="mt-4 p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] text-sm space-y-2">
              <div className="flex items-center gap-2 text-[#111827] font-bold"><ShieldCheck className="w-4 h-4 text-emerald-600" /> {lookupResult.collegeName}</div>
              <div className="text-[#57534E]">Code: <span className="text-[#111827] font-bold">{lookupResult.collegeCode}</span></div>
              <div className="text-[#57534E]">Status: <span className="uppercase font-bold text-orange-600">{lookupResult.status}</span></div>
              {lookupResult.rejectionReason && <div className="text-red-600 text-xs mt-1">Reason: {lookupResult.rejectionReason}</div>}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#78716C]">
          Already have a college account? <Link to="/register" className="text-orange-600 hover:text-orange-700 font-bold hover:underline">Register individual teacher account</Link>
        </p>
      </div>
    </div>
  );
}
