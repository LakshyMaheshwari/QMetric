import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { Building2, CheckCircle, Search, ShieldCheck } from 'lucide-react';

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

  const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-4xl w-full mx-auto space-y-8 bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-blue-400 mb-3">
            <Building2 className="w-6 h-6" />
            <span className="font-semibold">College / Exam Cell Registration</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Register Your College</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Submit your institution for Super Admin review. Approval creates the college tenant and the first college admin account.
          </p>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm">{error}</div>}

        {application ? (
          <div className="space-y-5">
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 p-5 rounded-xl">
              <div className="flex items-center gap-2 font-semibold mb-2">
                <CheckCircle className="w-5 h-5" /> Application submitted successfully
              </div>
              <p className="text-sm text-green-200/80">
                Save this application ID. You can use it below to check the status later.
              </p>
              <div className="mt-3 p-3 bg-black/30 rounded-lg font-mono text-sm break-all text-white">
                {application._id}
              </div>
              <p className="mt-3 text-sm">Current status: <span className="font-semibold uppercase">{application.status}</span></p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Register a User Account
              </Link>
              <button
                type="button"
                onClick={() => setApplication(null)}
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitApplication} className="space-y-6" noValidate>
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Institution Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="College / Institution Name *" value={form.collegeName} onChange={(e) => updateField('collegeName', e.target.value)} />
                <input className={inputClass} placeholder="College Code *" value={form.collegeCode} onChange={(e) => updateField('collegeCode', e.target.value.toUpperCase())} />
                <input className={`${inputClass} md:col-span-2`} placeholder="Address" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                <input className={inputClass} placeholder="City" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                <input className={inputClass} placeholder="State" value={form.state} onChange={(e) => updateField('state', e.target.value)} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Exam Cell / Admin Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="Contact Person Name *" value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} />
                <input className={inputClass} type="email" placeholder="Official Email *" value={form.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} />
                <input className={inputClass} type="tel" placeholder="10-digit Phone *" value={form.contactPhone} onChange={(e) => updateField('contactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Initial Admin Login</h2>
              <p className="text-xs text-neutral-500 mb-3">This password is stored securely and will be used for the college admin account if the application is approved.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputClass} type="password" placeholder="Password *" value={form.password} onChange={(e) => updateField('password', e.target.value)} />
                <input className={inputClass} type="password" placeholder="Confirm Password *" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold disabled:opacity-60">
              {loading ? 'Submitting Application...' : 'Submit College Registration'}
            </button>
          </form>
        )}

        <div className="border-t border-zinc-800 pt-6">
          <div className="flex items-center gap-2 text-white font-semibold mb-3">
            <Search className="w-5 h-5 text-blue-400" /> Check Application Status
          </div>
          <form onSubmit={lookupApplication} className="flex flex-col sm:flex-row gap-3">
            <input className={`${inputClass} flex-1`} placeholder="Paste application ID" value={lookupId} onChange={(e) => setLookupId(e.target.value)} />
            <button type="submit" disabled={lookupLoading} className="px-5 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-60">
              {lookupLoading ? 'Checking...' : 'Check Status'}
            </button>
          </form>
          {lookupError && <p className="mt-2 text-sm text-red-400">{lookupError}</p>}
          {lookupResult && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold"><ShieldCheck className="w-4 h-4 text-blue-400" /> {lookupResult.collegeName}</div>
              <div className="text-zinc-400">Code: <span className="text-zinc-200">{lookupResult.collegeCode}</span></div>
              <div className="text-zinc-400">Status: <span className="text-zinc-200 uppercase font-semibold">{lookupResult.status}</span></div>
              {lookupResult.rejectionReason && <div className="text-red-400">Reason: {lookupResult.rejectionReason}</div>}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-500">
          Already have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300">Register as a user</Link>
        </p>
      </div>
    </div>
  );
}
