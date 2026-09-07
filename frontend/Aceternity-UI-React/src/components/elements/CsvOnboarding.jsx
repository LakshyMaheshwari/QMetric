/**
 * CsvOnboarding.jsx
 * ------------------
 * A standalone, optional CSV-based registration helper for QMetric.
 *
 * Flow:
 *   1. IDLE   → user drops / selects a .csv file
 *   2. PARSED → table preview is shown with auto-mapped data
 *   3. CONFIRMED → parent receives the extracted JSON via onConfirm()
 *
 * Props:
 *   onConfirm  (function) – called with the mapped data object when user confirms
 *   onCancel   (function) – called when user clicks "Cancel / Edit Manually"
 *
 * Dependencies:
 *   papaparse      (CSV parsing)
 *   react-dropzone (drag-and-drop UI)
 */

import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";

// ---------------------------------------------------------------------------
// 1. FIELD MAPPING DICTIONARY
//    Each key is a canonical DB field name (matching the User model).
//    Each value is an array of CSV header aliases (case-insensitive).
// ---------------------------------------------------------------------------
const FIELD_ALIASES = {
  userName: [
    "username",
    "user_name",
    "user name",
    "login",
    "handle",
    "userid",
    "user_id",
    "user id",
  ],
  email: [
    "email",
    "e-mail",
    "email_address",
    "emailaddress",
    "mail",
    "e mail",
    "electronic mail",
  ],
  fullName: [
    "fullname",
    "full_name",
    "full name",
    "name",
    "display name",
    "displayname",
    "display_name",
  ],
  phone: [
    "phone",
    "phone_number",
    "phone number",
    "phoneno",
    "phone no",
    "mobile",
    "mobile_number",
    "mobile number",
    "contact",
    "contact_number",
    "contact number",
    "cell",
  ],
  collegeName: [
    "collegename",
    "college_name",
    "college name",
    "college",
    "institution",
    "university",
    "university name",
    "university_name",
    "school",
    "institute",
  ],
  position: [
    "position",
    "designation",
    "role",
    "job_title",
    "job title",
    "title",
    "rank",
  ],
  employeeId: [
    "employeeid",
    "employee_id",
    "employee id",
    "emp_id",
    "emp id",
    "empid",
    "staff_id",
    "staff id",
    "staffid",
    "faculty_id",
    "faculty id",
    "id",
    "faculty code",
    "faculty_code",
  ],
  department: [
    "department",
    "dept",
    "dept.",
    "department_name",
    "department name",
    "division",
  ],
  stream: [
    "stream",
    "faculty_stream",
    "faculty stream",
    "discipline",
    "branch",
    "field",
    "academic_stream",
    "academic stream",
    "course_type",
    "course type",
  ],
};

// Human-readable labels for the preview table headers.
const FIELD_LABELS = {
  userName: "Username",
  email: "Email",
  fullName: "Full Name",
  phone: "Phone",
  collegeName: "College Name",
  position: "Position",
  employeeId: "Employee ID",
  department: "Department",
  stream: "Stream",
};

// ---------------------------------------------------------------------------
// 2. AUTO-MAPPING LOGIC
//    Normalises a CSV header and looks it up in FIELD_ALIASES.
// ---------------------------------------------------------------------------
const normalise = (str) =>
  str.trim().toLowerCase().replace(/[\s_-]+/g, " ");

/**
 * Builds a mapping from CSV header → canonical DB field name.
 * Headers that cannot be matched are mapped to null.
 */
function buildHeaderMap(csvHeaders) {
  // Invert FIELD_ALIASES for O(1) lookup
  const lookup = {};
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    aliases.forEach((alias) => {
      lookup[normalise(alias)] = field;
    });
  });

  return csvHeaders.map((header) => ({
    original: header,
    mapped: lookup[normalise(header)] ?? null,
  }));
}

/**
 * Transforms a raw PapaParse row (object keyed by original headers) into
 * an object keyed by canonical DB field names, using the headerMap.
 */
function mapRow(rawRow, headerMap) {
  const out = {};
  headerMap.forEach(({ original, mapped }) => {
    if (mapped && rawRow[original] !== undefined) {
      // If multiple CSV columns map to the same DB field, last one wins.
      out[mapped] = rawRow[original]?.trim() ?? "";
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// 3. STEP CONSTANTS
// ---------------------------------------------------------------------------
const STEPS = { IDLE: "IDLE", PARSED: "PARSED", CONFIRMED: "CONFIRMED" };

// ---------------------------------------------------------------------------
// 4. COMPONENT
// ---------------------------------------------------------------------------
export default function CsvOnboarding({ onConfirm, onCancel }) {
  const [step, setStep] = useState(STEPS.IDLE);
  const [parsedRows, setParsedRows] = useState([]); // Array of mapped row objects
  const [headerMap, setHeaderMap] = useState([]); // [{original, mapped}]
  const [unmappedHeaders, setUnmappedHeaders] = useState([]); // headers we couldn't map
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");

  // -------------------------------------------------------------------------
  // Dropzone handler
  // -------------------------------------------------------------------------
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setParseError("");

    if (rejectedFiles.length > 0) {
      setParseError("Only .csv files are accepted. Please try again.");
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,          // Use first row as keys
      skipEmptyLines: true,  // Ignore blank rows
      transformHeader: (h) => h.trim(), // Trim whitespace from headers
      complete: ({ data, meta, errors }) => {
        if (errors.length > 0) {
          setParseError(
            `CSV parse error: ${errors[0].message} (row ${errors[0].row ?? "?"}).`
          );
          return;
        }

        if (!data || data.length === 0) {
          setParseError("The CSV file appears to be empty.");
          return;
        }

        const headers = meta.fields ?? [];
        const hMap = buildHeaderMap(headers);
        const unmapped = hMap
          .filter((h) => h.mapped === null)
          .map((h) => h.original);

        const rows = data.map((rawRow) => mapRow(rawRow, hMap));

        setHeaderMap(hMap);
        setUnmappedHeaders(unmapped);
        setParsedRows(rows);
        setStep(STEPS.PARSED);
      },
      error: (err) => {
        setParseError(`Failed to read file: ${err.message}`);
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5 MB
    onDropRejected: (files) => {
      const reason = files[0]?.errors[0]?.message ?? "File rejected.";
      setParseError(reason);
    },
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleConfirm = () => {
    // Pass the full rows array so the parent can decide:
    //   • 1 row  → pre-fill the manual form
    //   • N rows → call the bulk-register API
    onConfirm?.(parsedRows);
    setStep(STEPS.CONFIRMED);
  };

  const handleCancel = () => {
    setStep(STEPS.IDLE);
    setParsedRows([]);
    setHeaderMap([]);
    setFileName("");
    setParseError("");
    onCancel?.();
  };

  // Only the DB fields that were successfully matched
  const mappedFields = [
    ...new Set(headerMap.filter((h) => h.mapped).map((h) => h.mapped)),
  ];

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <div className="w-full rounded-xl border border-zinc-700 bg-zinc-900/60 backdrop-blur-sm p-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-white">
          📄 CSV Auto-Fill
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          Optional
        </span>
      </div>
      <p className="text-sm text-neutral-400">
        Upload a CSV file and we'll auto-fill the form fields for you. You can
        review and confirm before submitting.
      </p>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 1 — IDLE: Drop-zone                                            */}
      {/* ------------------------------------------------------------------ */}
      {step === STEPS.IDLE && (
        <div
          {...getRootProps()}
          className={`
            relative flex flex-col items-center justify-center gap-3
            rounded-lg border-2 border-dashed p-10 cursor-pointer
            transition-all duration-200
            ${
              isDragActive
                ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
                : "border-zinc-600 hover:border-indigo-500 hover:bg-zinc-800/50"
            }
          `}
        >
          <input {...getInputProps()} />
          {/* Upload icon (inline SVG) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-12 w-12 transition-colors ${
              isDragActive ? "text-indigo-400" : "text-zinc-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 15a4 4 0 004 4h10a4 4 0 004-4M16 10l-4-4m0 0l-4 4m4-4v12"
            />
          </svg>
          <p className="text-sm text-neutral-300">
            {isDragActive
              ? "Drop the CSV file here…"
              : "Drag & drop a CSV file, or click to browse"}
          </p>
          <p className="text-xs text-neutral-500">
            Accepted format: .csv · Max size: 5 MB
          </p>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-start gap-2 rounded-md bg-red-500/10 border border-red-500/40 px-4 py-3 text-sm text-red-400">
          <span className="mt-0.5">⚠️</span>
          <span>{parseError}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2 — PARSED: Preview table                                      */}
      {/* ------------------------------------------------------------------ */}
      {step === STEPS.PARSED && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="flex items-center justify-between rounded-md bg-zinc-800 px-4 py-2 text-sm">
            <span className="text-neutral-300">
              📂 <span className="font-medium text-white">{fileName}</span>
              <span className="text-neutral-500 ml-2">
                · {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} found
              </span>
            </span>
            <button
              onClick={() => {
                setStep(STEPS.IDLE);
                setParsedRows([]);
                setHeaderMap([]);
                setFileName("");
              }}
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              ✕ Remove
            </button>
          </div>

          {/* Unmapped headers warning */}
          {unmappedHeaders.length > 0 && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-xs text-amber-400">
              <span className="font-semibold">Heads-up:</span> The following
              columns could not be mapped to any known field and will be
              ignored:{" "}
              <span className="font-mono">{unmappedHeaders.join(", ")}</span>
            </div>
          )}

          {/* Data preview table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-700">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    #
                  </th>
                  {mappedFields.map((field) => (
                    <th
                      key={field}
                      className="px-4 py-2 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {FIELD_LABELS[field] ?? field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {parsedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-neutral-500 font-mono text-xs">
                      {idx + 1}
                    </td>
                    {mappedFields.map((field) => (
                      <td
                        key={field}
                        className="px-4 py-2 text-neutral-200 max-w-[200px] truncate"
                        title={row[field] ?? "—"}
                      >
                        {row[field] || (
                          <span className="text-neutral-600 italic">empty</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Confirmation prompt */}
          <div className="rounded-lg bg-zinc-800/80 border border-zinc-700 px-5 py-4 space-y-3">
            <p className="text-sm font-medium text-white">
              Is this information correct?
            </p>
            <p className="text-xs text-neutral-400">
              Clicking <strong className="text-white">Confirm</strong> will
              pre-fill the registration form with the data above. You can still
              edit any field before submitting.
            </p>

            <div className="flex gap-3 pt-1">
              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className="
                  flex-1 py-2.5 px-4 rounded-md text-sm font-semibold
                  bg-indigo-600 hover:bg-indigo-500 text-white
                  transition-colors focus:outline-none
                  focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-900
                "
              >
                ✓ Confirm &amp; Auto-Fill
              </button>

              {/* Cancel button */}
              <button
                onClick={handleCancel}
                className="
                  flex-1 py-2.5 px-4 rounded-md text-sm font-semibold
                  border border-zinc-600 text-neutral-300
                  hover:bg-zinc-700 hover:text-white transition-colors
                  focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900
                "
              >
                ✕ Cancel / Fill Manually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3 — CONFIRMED: Success banner                                  */}
      {/* ------------------------------------------------------------------ */}
      {step === STEPS.CONFIRMED && (
        <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/30 px-5 py-4">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-400">
              Data confirmed!
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              The form has been pre-filled. Review and submit when ready.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="ml-auto text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            title="Reset CSV onboarding"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
