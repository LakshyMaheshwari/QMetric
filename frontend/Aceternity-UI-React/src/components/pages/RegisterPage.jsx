import React, { useState, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
// [DEMO DISABLED] import CsvOnboarding from "../elements/CsvOnboarding"; // ← optional CSV feature
import apiClient from "../../api/client";

// Debug: verify env var is picked up (remove after confirming it works)
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;
console.log('[Turnstile] siteKey loaded:', TURNSTILE_SITE_KEY ? '✅ ' + TURNSTILE_SITE_KEY : '❌ MISSING — restart your dev server');

export default function RegisterPage() {
  // ---------------------------------------------------------------------------
  // Form state – mirrors the User mongoose schema exactly
  // ---------------------------------------------------------------------------
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    password: "",
    fullName: "",
    phone: "",
    collegeName: "",
    position: "Professor",   // default enum value
    employeeId: "",
    department: "",
    stream: "Engineering",   // default enum value
    collegeIdPhoto: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // Turnstile
  const turnstileRef   = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  // [DEMO DISABLED] Toggle the CSV panel visibility
  // const [showCsvPanel, setShowCsvPanel] = useState(false);

  // [DEMO DISABLED] Tracks the state of the bulk-register API call
  // null | 'loading' | { summary, created, failed }
  // const [bulkStatus, setBulkStatus] = useState(null);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "collegeIdPhoto") {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // =========================================================================
  // [DEMO DISABLED] CSV Onboarding handlers — uncomment block to re-enable
  // =========================================================================
  //
  // /**
  //  * CsvOnboarding callback – called when the user confirms the CSV preview.
  //  *
  //  * For SINGLE-row CSVs  → merges the row into formData (manual submit later).
  //  * For MULTI-row CSVs   → sends all rows straight to POST /auth/bulk-register.
  //  *
  //  * @param {Object|Object[]} csvData  Canonical-keyed object (single) or array (bulk)
  //  */
  // const handleCsvConfirm = async (csvData) => {
  //   // CsvOnboarding passes parsedRows (full array) for bulk, single object for single
  //   const rows = Array.isArray(csvData) ? csvData : [csvData];
  //
  //   if (rows.length === 1) {
  //     // ── Single row → pre-fill the form for manual review ──────────────────
  //     const row = rows[0];
  //     setFormData((prev) => ({
  //       ...prev,
  //       ...(row.userName    && { userName:    row.userName    }),
  //       ...(row.email       && { email:       row.email       }),
  //       ...(row.fullName    && { fullName:    row.fullName    }),
  //       ...(row.phone       && { phone:       row.phone       }),
  //       ...(row.collegeName && { collegeName: row.collegeName }),
  //       ...(row.position    && { position:    row.position    }),
  //       ...(row.employeeId  && { employeeId:  row.employeeId  }),
  //       ...(row.department  && { department:  row.department  }),
  //       ...(row.stream      && { stream:      row.stream      }),
  //       // password and collegeIdPhoto are intentionally excluded – must be entered manually
  //     }));
  //     setShowCsvPanel(false);
  //     return;
  //   }
  //
  //   // ── Multiple rows → call /auth/bulk-register directly ─────────────────
  //   setBulkStatus("loading");
  //   setShowCsvPanel(false);
  //
  //   try {
  //     const response = await apiClient.post("/auth/bulk-register", {
  //       users: rows,
  //       defaultPassword: undefined,
  //       turnstileToken: turnstileRef.current?.getResponse() ?? "",
  //     }, {
  //       headers: {
  //         'X-Admin-Secret': process.env.REACT_APP_ADMIN_SECRET_KEY || 'qmetric_admin_secret_key_2025'
  //       },
  //       validateStatus: () => true
  //     });
  //
  //     const result = response.data;
  //
  //     if (response.status !== 200 && response.status !== 201 && response.status !== 207) {
  //       setBulkStatus({ error: result.message || "Bulk registration failed." });
  //     } else {
  //       setBulkStatus(result);
  //     }
  //   } catch (err) {
  //     setBulkStatus({ error: "Failed to connect to the server." });
  //   }
  // };
  //
  // /** Called when the user clicks "Cancel / Fill Manually" inside CsvOnboarding. */
  // const handleCsvCancel = () => {
  //   setShowCsvPanel(false);
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Guard: Turnstile must be verified before submitting
    const token = turnstileRef.current?.getResponse();
    if (!token) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      // Include the Turnstile token so the backend can verify it
      data.append("turnstileToken", token);

      const response = await apiClient.post("/auth/create-account", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSuccess("Registration successful! You can now log in.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "An error occurred during registration.";
      setError(msg);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-3xl w-full mx-auto space-y-8 bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800">

        {/* Page header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create an Account
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-400">
            Register for QMetric to access the dashboard.
          </p>
        </div>

        {/* ================================================================ */}
        {/* [DEMO DISABLED] CSV Onboarding — uncomment block below to re-enable */}
        {/* ================================================================ */}
        {/*
        <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 border border-zinc-700 px-5 py-3">
          <div>
            <p className="text-sm font-medium text-white">
              Have a data CSV file?
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Auto-fill the form in seconds — no manual typing needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCsvPanel((v) => !v)}
            className="
              ml-4 shrink-0 px-4 py-2 rounded-md text-sm font-semibold
              border border-indigo-500/60 text-indigo-300
              hover:bg-indigo-600 hover:text-white hover:border-indigo-600
              transition-colors focus:outline-none focus:ring-2
              focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900
            "
          >
            {showCsvPanel ? "▲ Hide CSV Panel" : "▼ Upload CSV"}
          </button>
        </div>

        {showCsvPanel && (
          <CsvOnboarding
            onConfirm={handleCsvConfirm}
            onCancel={handleCsvCancel}
          />
        )}

        {bulkStatus === "loading" && (
          <div className="flex items-center gap-3 rounded-lg bg-zinc-800 border border-zinc-700 px-5 py-4">
            <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-neutral-300">Registering users… please wait.</p>
          </div>
        )}

        {bulkStatus && bulkStatus !== "loading" && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-5 space-y-4">
            {bulkStatus.error ? (
              <div className="flex items-start gap-2 text-sm text-red-400">
                <span>⚠️</span>
                <span>{bulkStatus.error}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <p className="text-sm font-semibold text-white">Bulk Registration Complete</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-zinc-800 py-3">
                    <p className="text-2xl font-bold text-white">{bulkStatus.summary?.totalReceived ?? 0}</p>
                    <p className="text-xs text-neutral-400 mt-1">Received</p>
                  </div>
                  <div className="rounded-lg bg-green-500/10 border border-green-500/30 py-3">
                    <p className="text-2xl font-bold text-green-400">{bulkStatus.summary?.totalCreated ?? 0}</p>
                    <p className="text-xs text-neutral-400 mt-1">Created</p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 py-3">
                    <p className="text-2xl font-bold text-amber-400">{bulkStatus.summary?.totalSkipped ?? 0}</p>
                    <p className="text-xs text-neutral-400 mt-1">Skipped</p>
                  </div>
                </div>
                {bulkStatus.failed?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Failed rows</p>
                    <div className="overflow-x-auto rounded-lg border border-zinc-700 max-h-48 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-zinc-800 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-neutral-400">#</th>
                            <th className="px-3 py-2 text-left text-neutral-400">Email</th>
                            <th className="px-3 py-2 text-left text-neutral-400">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {bulkStatus.failed.map((row, i) => (
                            <tr key={i} className="hover:bg-zinc-800/40">
                              <td className="px-3 py-2 text-neutral-500 font-mono">{(row.index ?? i) + 1}</td>
                              <td className="px-3 py-2 text-neutral-300">{row.email || "—"}</td>
                              <td className="px-3 py-2 text-red-400">{row.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setBulkStatus(null)}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  ✕ Dismiss
                </button>
              </>
            )}
          </div>
        )}
        */}

        {/* ---------------------------------------------------------------- */}
        {/* Manual registration form                                          */}
        {/* ---------------------------------------------------------------- */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded text-sm text-center">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="userName">Username</Label>
              <Input
                id="userName"
                name="userName"
                type="text"
                required
                placeholder="johndoe123"
                value={formData.userName}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                pattern="[0-9]{10}"
                placeholder="1234567890"
                title="10-digit phone number"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            {/* College Name */}
            <div className="space-y-2">
              <Label htmlFor="collegeName">College Name</Label>
              <Input
                id="collegeName"
                name="collegeName"
                type="text"
                required
                placeholder="University of Technology"
                value={formData.collegeName}
                onChange={handleChange}
              />
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <select
                id="position"
                name="position"
                required
                value={formData.position}
                onChange={handleChange}
                className="flex h-10 w-full border-none bg-zinc-800 text-white shadow-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-600 shadow-[0px_0px_1px_1px_var(--neutral-700)]"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
                <option value="HoD">HoD</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Employee ID */}
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                name="employeeId"
                type="text"
                required
                placeholder="EMP12345"
                value={formData.employeeId}
                onChange={handleChange}
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                type="text"
                required
                placeholder="Computer Science"
                value={formData.department}
                onChange={handleChange}
              />
            </div>

            {/* Stream */}
            <div className="space-y-2">
              <Label htmlFor="stream">Stream</Label>
              <select
                id="stream"
                name="stream"
                required
                value={formData.stream}
                onChange={handleChange}
                className="flex h-10 w-full border-none bg-zinc-800 text-white shadow-input rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-600 shadow-[0px_0px_1px_1px_var(--neutral-700)]"
              >
                <option value="Engineering">Engineering</option>
                <option value="Management">Management</option>
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts</option>
                <option value="Law">Law</option>
                <option value="Medicine">Medicine</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* College ID Photo */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="collegeIdPhoto">College ID Photo</Label>
              <Input
                id="collegeIdPhoto"
                name="collegeIdPhoto"
                type="file"
                accept="image/*"
                required
                onChange={handleChange}
                className="pt-2"
              />
              <p className="text-xs text-neutral-400 mt-1">
                Please upload a clear image of your college ID card for
                verification.
              </p>
            </div>
          </div>

          {/* ── Cloudflare Turnstile ───────────────────────────────────── */}
          <div className="flex justify-center">
            <Turnstile
              id="register-turnstile"
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              onSuccess={(token) => {
                console.log('[Turnstile] ✅ verified, token received');
                setTurnstileToken(token);
              }}
              onExpire={() => {
                console.log('[Turnstile] ⚠️ token expired');
                setTurnstileToken("");
              }}
              onError={(err) => {
                console.error('[Turnstile] ❌ error:', err);
                setTurnstileToken("");
                setError("CAPTCHA verification failed. Please try again.");
              }}
              options={{ theme: "dark", size: "normal" }}
            />
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-white hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Registering…" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
