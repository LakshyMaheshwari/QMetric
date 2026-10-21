import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2,
  Upload,
  FileText,
  Check,
  Target,
  BookOpen,
  Loader2,
  AlertCircle,
  Clock3,
  Sparkles
} from 'lucide-react';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// SectionCard component moved OUTSIDE to prevent re-mounting and losing focus on keystrokes
const SectionCard = ({ badge, title, subtitle, icon, children }) => (
  <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-3 mb-5">
      {badge && (
        <span className="w-7 h-7 flex items-center justify-center bg-orange-100 border border-orange-200 text-orange-700 text-xs font-black rounded-xl">
          {badge}
        </span>
      )}

      {icon && (
        <div className="w-7 h-7 flex items-center justify-center bg-orange-100 text-orange-600 rounded-xl">
          {icon}
        </div>
      )}

      <div>
        <h2 className="text-[#111827] font-bold text-lg">{title}</h2>
        {subtitle && (
          <p className="text-[#57534E] text-xs mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>

    {children}
  </div>
);

const UploadPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    "College Name": "",
    "Branch": "",
    "Year Of Study": "",
    "Semester": "",
    "Course Name": "",
    "Course Code": "",
    "Course Teacher": ""
  });

  const [courseOutcomes, setCourseOutcomes] = useState([]);
  const [modules, setModules] = useState([]);
  const [numCOs, setNumCOs] = useState('');
  const [numModules, setNumModules] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Backend upload limit (25 MB)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  // CSS classes
  const labelClass =
    "block text-[#374151] text-xs font-bold uppercase tracking-wider mb-2";

  const inputClass =
    "w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl text-[#111827] placeholder-[#A8A29E] focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-sm";

  // ─── Keep affiliated teacher's college name synchronized ─────
  useEffect(() => {
    if (user?.collegeName) {
      setFormData((prev) => ({
        ...prev,
        "College Name": prev["College Name"] || user.collegeName
      }));
    }
  }, [user]);

  // Helper function
  const getCurrentWeightSum = () =>
    courseOutcomes.reduce(
      (sum, co) => sum + (parseFloat(co.weight) || 0),
      0
    );

  // Validation function
  const validateForm = () => {
    setError('');

    // Check required fields
    const requiredFields = [
      "College Name",
      "Branch",
      "Course Name",
      "Course Code"
    ];

    for (let field of requiredFields) {
      if (!formData[field] || !formData[field].trim()) {
        setError(`${field} is required.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
    }

    // Validate course outcomes
    if (courseOutcomes.length === 0) {
      setError("Please specify at least one Course Outcome.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    // Validate course outcomes have required fields
    for (let i = 0; i < courseOutcomes.length; i++) {
      const co = courseOutcomes[i];

      if (!co.weight || parseFloat(co.weight) <= 0) {
        setError(`Course Outcome ${i + 1} must have a valid weight percentage greater than 0.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }

      if (!co.blooms) {
        setError(`Please select a Bloom's level for Course Outcome ${i + 1}.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
    }

    // Validate weight sum
    const totalWeight = courseOutcomes.reduce(
      (sum, co) => sum + (parseFloat(co.weight) || 0),
      0
    );

    if (Math.abs(totalWeight - 100) > 0.01) {
      setError(`Course Outcome weights must sum to exactly 100%. Currently they sum to ${totalWeight.toFixed(1)}%.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    // Validate modules
    if (modules.length === 0) {
      setError("Please specify at least one Course Module.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }

    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];

      if (!module.name || !module.name.trim()) {
        setError(`Module ${i + 1} name is required.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }

      if (!module.hours || parseFloat(module.hours) <= 0) {
        setError(`Module ${i + 1} must have valid teaching hours greater than 0.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
    }

    return true;
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const createCO = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    weight: "",
    blooms: ""
  });

  const createModule = () => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: "",
    hours: ""
  });

  const handleNumCOsChange = (e) => {
    const num = parseInt(e.target.value) || 0;
    setNumCOs(e.target.value);

    if (num > 0 && num <= 20) {
      setCourseOutcomes(
        Array.from({ length: num }, () => createCO())
      );
      setError('');
    } else if (num > 20) {
      setError('Maximum 20 course outcomes allowed.');
    } else {
      setCourseOutcomes([]);
    }
  };

  const handleNumModulesChange = (e) => {
    const num = parseInt(e.target.value) || 0;
    setNumModules(e.target.value);

    if (num > 0 && num <= 20) {
      setModules(
        Array.from({ length: num }, () => createModule())
      );
      setError('');
    } else if (num > 20) {
      setError('Maximum 20 modules allowed.');
    } else {
      setModules([]);
    }
  };

  const deleteCO = (index) => {
    setCourseOutcomes(courseOutcomes.filter((_, i) => i !== index));
  };

  const handleCOChange = (index, field, value) => {
    const updated = [...courseOutcomes];
    updated[index][field] = value;
    setCourseOutcomes(updated);
    setError('');
  };

  const deleteModule = (index) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const handleModuleChange = (index, field, value) => {
    const updated = [...modules];
    updated[index][field] = value;
    setModules(updated);
    setError('');
  };

  // ─── Quick Fill Sample Metadata ────────────────────────────
  const fillSampleData = () => {
    setFormData({
      "College Name": user?.collegeName || "Engineering Institute of Technology",
      "Branch": "Computer Science & Engineering",
      "Year Of Study": "3rd Year",
      "Semester": "5th Semester",
      "Course Name": "Database Management Systems",
      "Course Code": "CS301",
      "Course Teacher": user?.fullName || user?.userName || "Dr. Rajesh Sharma"
    });

    setNumCOs('3');
    setCourseOutcomes([
      { id: 'sample-co1', weight: '30', blooms: 'Understand' },
      { id: 'sample-co2', weight: '30', blooms: 'Apply' },
      { id: 'sample-co3', weight: '40', blooms: 'Analyze' }
    ]);

    setNumModules('3');
    setModules([
      { id: 'sample-m1', name: 'Relational Model & SQL', hours: '12' },
      { id: 'sample-m2', name: 'Database Design & Normalization', hours: '14' },
      { id: 'sample-m3', name: 'Transaction Management & Concurrency', hours: '14' }
    ]);

    setError('');
  };

  // ─── File validation ────────────────────────────────────────
  const isValidFileType = (f) => {
    const validMimeTypes = [
      'text/csv',
      'application/csv',
      'text/plain'
    ];

    const validExtensions = ['.csv'];

    const ext = f.name
      ? '.' + f.name.split('.').pop().toLowerCase()
      : '';

    return (
      validMimeTypes.includes(f.type) ||
      validExtensions.includes(ext)
    );
  };

  const selectFile = (f) => {
    if (!f) return;

    if (!isValidFileType(f)) {
      setFile(null);
      setError('Please upload a CSV file (.csv). Excel files (.xlsx, .xls) are not supported.');
      return;
    }

    if (f.size > MAX_FILE_SIZE) {
      setFile(null);
      setError('File too large. Maximum upload size is 25 MB.');
      return;
    }

    setFile(f);
    setError('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    selectFile(f);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    selectFile(f);
    e.target.value = '';
  };

  const handleDropzoneClick = () => {
    if (!file) {
      fileInputRef.current?.click();
    }
  };

  // ─── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isUploading) return;

    if (!file) {
      setError("Please select or drop an examination paper CSV file (.csv).");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum upload size is 25 MB.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!validateForm()) return;

    setIsUploading(true);
    setError('');

    // Transform course outcomes and modules into backend's expected format
    const transformedSequence = [
      ...courseOutcomes.map((co, index) => ({
        name: `CO${index + 1}`,
        type: "CO",
        weight: parseFloat(co.weight),
        blooms: [co.blooms]
      })),
      ...modules.map((module, index) => ({
        name: `Module ${index + 1}`,
        moduleName: module.name.trim(),
        type: "Module",
        hours: parseFloat(module.hours)
      }))
    ];

    // Prepare form data to send to the backend
    const formDataToSend = new FormData();
    formDataToSend.append("file", file);
    formDataToSend.append("FormData", JSON.stringify(formData));
    formDataToSend.append("Sequence", JSON.stringify(transformedSequence));

    try {
      const response = await apiClient.post(
        '/upload/totext',
        formDataToSend
      );

      const paperId =
        response.data?.data?._id ||
        response.data?._id ||
        response.data?.id;

      // Reset form
      setFile(null);
      setCourseOutcomes([]);
      setModules([]);
      setNumCOs('');
      setNumModules('');

      setFormData({
        "College Name": "",
        "Branch": "",
        "Year Of Study": "",
        "Semester": "",
        "Course Name": "",
        "Course Code": "",
        "Course Teacher": ""
      });

      if (paperId) {
        navigate(`/result/${paperId}`);
      } else {
        navigate('/papers');
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message || err.response?.data?.error;
      const reason = err.response?.data?.reason;

      if (reason === 'pending_approval' || (serverMessage && serverMessage.includes('awaiting approval'))) {
        setError('Your account is awaiting approval from your college admin. Paper uploads will be enabled once your college approves your account.');
      } else if (err.response?.status === 403) {
        setError(serverMessage || 'Access denied. You do not have permission to upload question papers.');
      } else if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again to upload.');
      } else if (err.response?.status === 413) {
        setError('The uploaded file exceeds the 25 MB size limit. Please upload a smaller file.');
      } else {
        setError(serverMessage || err.message || 'Server error while processing the uploaded paper. Please check the file format.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Sample file ────────────────────────────────────────────
  const downloadSample = () => {
    const csv = [
      ['Question', 'CO', 'Marks', 'Difficulty', 'Module'],
      ['What is the definition of a Relational Database Management System?', 'CO1', '5', 'Easy', 'Module 1'],
      ['Explain the difference between primary key and foreign key with examples.', 'CO2', '10', 'Medium', 'Module 2'],
      ['Analyze the following relational schema and normalize it to 3NF.', 'CO3', '15', 'Hard', 'Module 3']
    ]
      .map((r) => r.join(','))
      .join('\n');

    const a = Object.assign(
      document.createElement('a'),
      {
        href: URL.createObjectURL(
          new Blob([csv], { type: 'text/csv' })
        ),
        download: 'sample_paper_format.csv'
      }
    );

    a.click();
    URL.revokeObjectURL(a.href);
  };

  const bloomsLevels = [
    'Remember',
    'Understand',
    'Apply',
    'Analyze',
    'Evaluate',
    'Create'
  ];

  const requiredFields = [
    "College Name",
    "Branch",
    "Course Name",
    "Course Code"
  ];

  const weightSum = getCurrentWeightSum();
  const weightOk = Math.abs(weightSum - 100) <= 0.01;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#111827] pt-20 pb-16" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 mb-6">
        <div className="bg-white border border-[#E8E2D7] rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20 text-white">
              <Upload size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#111827]">
                Upload Question Paper
              </h1>
              <p className="text-xs text-[#57534E] mt-0.5">
                Provide course parameters, CO mappings, and syllabus modules for automated rule-based evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={fillSampleData}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100/80 text-orange-700 border border-orange-200 text-xs font-semibold transition-all shadow-sm"
              title="Pre-fill standard course metadata for testing"
            >
              <Sparkles size={14} className="text-orange-500" />
              Fill Sample Data
            </button>
            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-[#57534E] border border-[#E8E2D7] text-xs font-semibold transition-all shadow-sm"
              title="Download CSV format template"
            >
              <FileText size={14} className="text-[#78716C]" />
              Sample Format
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-5 relative">
        {/* ── Pending Approval Banner ── */}
        {user?.role === 'teacher' && user?.collegeApprovalStatus === 'pending' && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
            <Clock3 className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-amber-800 font-bold text-sm">Account Awaiting Approval</p>
              <p className="text-amber-700 text-sm mt-0.5 leading-relaxed">
                Your affiliation request with <strong>{user?.collegeName || 'your college'}</strong> is currently pending administrator verification. Paper uploads will be enabled once your college approves your account.
              </p>
            </div>
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-red-800 font-bold text-sm">Upload Error</p>
              <p className="text-red-700 text-sm mt-0.5 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ── 1. Course Information ── */}
        <SectionCard
          badge="1"
          title="Course Information"
          subtitle="Basic details about the course and institution"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(formData).map((key) => (
              <div key={key}>
                <label className={labelClass}>
                  {key}
                  {requiredFields.includes(key) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                <input
                  type="text"
                  name={key}
                  value={formData[key]}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder={`Enter ${key.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── 2. Course Outcomes ── */}
        <SectionCard
          icon={<Target size={16} />}
          title="Course Outcomes"
          subtitle="Define learning objectives with weights and cognitive levels. Weights must sum to 100%."
        >
          <div className="mb-5">
            <label className={labelClass}>
              Number of Course Outcomes
              <span className="text-red-500">*</span>
            </label>

            <input
              type="number"
              value={numCOs}
              onChange={handleNumCOsChange}
              min="1"
              max="20"
              placeholder="Enter number (1–20)"
              className={`${inputClass} md:w-56`}
            />
          </div>

          {courseOutcomes.length > 0 && (
            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#E8E2D7]">
              <span className="text-[#57534E] text-sm font-medium">
                Total Weight:
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  weightOk
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {weightSum.toFixed(1)}%
                {weightOk
                  ? ' ✓ Good to go'
                  : ' — must reach 100%'}
              </span>
            </div>
          )}

          {courseOutcomes.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-[#E8E2D7] rounded-2xl bg-[#FAF7F2]/60">
              <Target
                className="text-orange-400 mx-auto mb-3"
                size={34}
              />

              <p className="text-[#111827] font-bold text-sm">
                No course outcomes defined yet
              </p>

              <p className="text-[#57534E] text-xs mt-1">
                Enter the number above to get started, or click "Fill Sample Data" above
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {courseOutcomes.map((co, index) => (
                <div
                  key={co.id}
                  className="bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold rounded-lg">
                        CO{index + 1}
                      </span>

                      <span className="text-[#111827] text-sm font-bold">
                        Course Outcome {index + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteCO(index)}
                      className="p-1.5 text-[#78716C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                      title="Delete Course Outcome"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>
                        Weight (%)
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="number"
                        placeholder="0–100"
                        value={co.weight}
                        onChange={(e) =>
                          handleCOChange(
                            index,
                            'weight',
                            e.target.value
                          )
                        }
                        className={inputClass}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Bloom's Level
                        <span className="text-red-500">*</span>
                      </label>

                      <select
                        value={co.blooms}
                        onChange={(e) =>
                          handleCOChange(
                            index,
                            'blooms',
                            e.target.value
                          )
                        }
                        className={`${inputClass} cursor-pointer`}
                      >
                        <option value="">
                          Select Level
                        </option>

                        {bloomsLevels.map((level) => (
                          <option
                            key={level}
                            value={level}
                          >
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── 3. Modules ── */}
        <SectionCard
          icon={<BookOpen size={16} />}
          title="Course Modules"
          subtitle="Organize your course content into modules with corresponding teaching hours."
        >
          <div className="mb-5">
            <label className={labelClass}>
              Number of Modules
              <span className="text-red-500">*</span>
            </label>

            <input
              type="number"
              value={numModules}
              onChange={handleNumModulesChange}
              min="1"
              max="20"
              placeholder="Enter number (1–20)"
              className={`${inputClass} md:w-56`}
            />
          </div>

          {modules.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-[#E8E2D7] rounded-2xl bg-[#FAF7F2]/60">
              <BookOpen
                className="text-orange-400 mx-auto mb-3"
                size={34}
              />

              <p className="text-[#111827] font-bold text-sm">
                No modules defined yet
              </p>

              <p className="text-[#57534E] text-xs mt-1">
                Enter the number above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((module, index) => (
                <div
                  key={module.id}
                  className="bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold rounded-lg">
                        M{index + 1}
                      </span>

                      <span className="text-[#111827] text-sm font-bold">
                        Module {index + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteModule(index)}
                      className="p-1.5 text-[#78716C] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                      title="Delete Module"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className={labelClass}>
                        Module Name
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="text"
                        placeholder="Enter module name or topic..."
                        value={module.name}
                        onChange={(e) =>
                          handleModuleChange(
                            index,
                            'name',
                            e.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>
                        Teaching Hours
                        <span className="text-red-500">*</span>
                      </label>

                      <input
                        type="number"
                        placeholder="Hours"
                        value={module.hours}
                        onChange={(e) =>
                          handleModuleChange(
                            index,
                            'hours',
                            e.target.value
                          )
                        }
                        className={inputClass}
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── 4. File Upload ── */}
        <SectionCard
          icon={<Upload size={16} />}
          title="Upload Paper File"
          subtitle="Upload your question paper as a CSV file (.csv)"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />

          <div
            onClick={handleDropzoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 select-none ${
              dragOver
                ? 'border-orange-500 bg-orange-50/50'
                : file
                  ? 'border-emerald-500/70 bg-emerald-50/40'
                  : 'border-[#E8E2D7] hover:border-orange-400 hover:bg-[#FAF7F2] cursor-pointer'
            }`}
          >
            {file ? (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto">
                  <FileText className="text-emerald-700" size={26} />
                </div>

                <div>
                  <p className="text-[#111827] font-bold text-base">
                    {file.name}
                  </p>
                  <p className="text-[#57534E] text-sm mt-0.5">
                    Ready to analyze · {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
                  >
                    <Trash2 size={13} />
                    Remove file
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-14 h-14 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mx-auto text-orange-600 shadow-sm">
                  <Upload size={26} />
                </div>

                <div>
                  <p className="text-[#111827] font-bold text-base">
                    Drop your question paper here
                  </p>
                  <p className="text-[#57534E] text-sm mt-1">
                    or click anywhere in this box to browse
                  </p>
                  <p className="text-[#78716C] text-xs mt-2">
                    Supported: .csv only · Max 25 MB
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm shadow-md shadow-orange-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <FileText size={16} />
                    Choose File
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Submit ── */}
        <div className="flex justify-center pb-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className={`inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base transition-all ${
              !file || isUploading
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Uploading & Analysing...
              </>
            ) : (
              <>
                <Check size={20} />
                Submit Paper for Analysis
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;