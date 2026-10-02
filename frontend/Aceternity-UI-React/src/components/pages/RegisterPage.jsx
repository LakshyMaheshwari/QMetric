import React, { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import apiClient from "../../api/client";
import { registerSchema } from "../../schemas/validationSchemas";
import FormInput from "../FormInput";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;

const POSITION_OPTIONS = [
  "Professor",
  "Senior Professor",
  "Associate Professor",
  "Assistant Professor",
  "Senior Lecturer",
  "Lecturer",
  "HoD",
  "Dean",
  "Director",
  "Principal",
  "Vice Principal",
  "Academic Coordinator",
  "Visiting Faculty",
  "Research Faculty",
  "Teaching Assistant",
  "Other",
];

const STREAM_OPTIONS = [
  "Engineering",
  "Management",
  "Science",
  "Commerce",
  "Arts",
  "Law",
  "Medicine",
  "Other",
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [collegesList, setCollegesList] = useState([]);
  const [loadingColleges, setLoadingColleges] = useState(false);
  const [collegeIdPhoto, setCollegeIdPhoto] = useState(null);
  const [collegeCode, setCollegeCode] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const turnstileRef = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "teacher",
      userName: "",
      email: "",
      password: "",
      fullName: "",
      phone: "",
      signupIntent: "affiliated",
      collegeId: "",
      position: "Professor",
      employeeId: "",
      department: "",
      stream: "Engineering",
    },
  });

  const role = watch("role");
  const selectedCollegeId = watch("collegeId");
  const signupIntent = watch("signupIntent");

  // ─── Load active colleges only when teacher needs college selection ───
  useEffect(() => {
    const fetchActiveColleges = async () => {
      if (role !== "teacher" || signupIntent !== "affiliated") {
        setLoadingColleges(false);
        return;
      }

      try {
        setLoadingColleges(true);

        const res = await apiClient.get("/auth/colleges");

        if (res.data && res.data.colleges) {
          setCollegesList(res.data.colleges);
        }
      } catch (err) {
        console.error("Failed to load active colleges:", err);
      } finally {
        setLoadingColleges(false);
      }
    };

    fetchActiveColleges();
  }, [role, signupIntent]);

  // ─── Resolve selected college details ───────────────────────
  useEffect(() => {
    const selectedCollege = collegesList.find(
      (c) => c._id === selectedCollegeId
    );

    setCollegeCode(selectedCollege ? selectedCollege.code : "");
    setCollegeName(selectedCollege ? selectedCollege.name : "");
  }, [selectedCollegeId, collegesList]);

  // ─── Account type change ────────────────────────────────────
  const handleRoleChange = (value) => {
    setValue("role", value, {
      shouldValidate: false,
      shouldDirty: true,
    });

    setError("");
    setSuccess("");

    clearErrors([
      "signupIntent",
      "collegeId",
      "position",
      "employeeId",
      "department",
      "stream",
    ]);

    if (value === "student") {
      setValue("collegeId", "", {
        shouldValidate: false,
        shouldDirty: true,
      });

      setValue("department", "", {
        shouldValidate: false,
        shouldDirty: true,
      });

      setValue("stream", "", {
        shouldValidate: false,
        shouldDirty: true,
      });

      setCollegeCode("");
      setCollegeName("");
      setCollegeIdPhoto(null);
    }
  };

  // ─── Teacher affiliation type change ────────────────────────
  const handleSignupIntentChange = (value) => {
    // Changing the signup mode should never validate the whole form.
    // The form may still be incomplete at this point.
    setValue("signupIntent", value, {
      shouldValidate: false,
      shouldDirty: true,
    });

    setError("");
    setSuccess("");

    if (value === "independent") {
      setValue("collegeId", "", {
        shouldValidate: false,
        shouldDirty: true,
      });

      setValue("department", "", {
        shouldValidate: false,
        shouldDirty: true,
      });

      setValue("stream", "", {
        shouldValidate: false,
        shouldDirty: true,
      });

      clearErrors(["collegeId", "department", "stream"]);

      setCollegeCode("");
      setCollegeName("");
      setCollegeIdPhoto(null);
    } else {
      clearErrors(["collegeId", "department", "stream"]);
    }
  };

  // ─── Submit ─────────────────────────────────────────────────
  const onSubmit = async (data) => {
    const token =
      turnstileRef.current?.getResponse() || turnstileToken;

    if (!token) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    // College ID is required only for affiliated teachers.
    if (
      data.role === "teacher" &&
      data.signupIntent === "affiliated" &&
      !collegeIdPhoto
    ) {
      setError(
        "College ID photo is required for affiliated teachers."
      );
      return;
    }

    setError("");
    setSuccess("");

    try {
      const formData = new FormData();

      // ─── Common fields ───────────────────────────────────────
      formData.append("role", data.role);
      formData.append("userName", data.userName);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("fullName", data.fullName);
      formData.append("phone", data.phone);

      // ─── Teacher-specific fields ─────────────────────────────
      if (data.role === "teacher") {
        formData.append("signupIntent", data.signupIntent);
        formData.append("position", data.position || "");

        if (data.employeeId) {
          formData.append("employeeId", data.employeeId);
        }

        if (data.signupIntent === "affiliated") {
          formData.append("collegeId", data.collegeId);
          formData.append("collegeCode", collegeCode);
          formData.append("collegeName", collegeName);
          formData.append("department", data.department || "");
          formData.append("stream", data.stream || "");

          if (collegeIdPhoto) {
            formData.append("collegeIdPhoto", collegeIdPhoto);
          }
        } else {
          // Explicitly keep independent teachers unaffiliated.
          formData.delete("collegeId");
          formData.delete("department");
          formData.delete("stream");
        }
      }

      // ─── CAPTCHA ────────────────────────────────────────────
      formData.append("turnstileToken", token);

      const response = await apiClient.post(
        "/auth/create-account",
        formData
      );

      if (response.data?.error) {
        setError(
          response.data.message || "Registration failed."
        );
        return;
      }

      // Active registrations:
      // - Student
      // - Independent teacher
      //
      // Backend has already issued the HttpOnly access cookie.
      if (
        response.data?.canUseFeatures &&
        response.data?.user &&
        response.data?.accountState === "active"
      ) {
        login(response.data.user);
        navigate("/dashboard");
        return;
      }

      // Pending affiliated teacher registration.
      // No login cookie should be issued until approval.
      setSuccess(
        response.data?.message ||
          "Registration successful. Your account is awaiting approval."
      );

      turnstileRef.current?.reset();
      setTurnstileToken("");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "An error occurred during registration.";

      setError(msg);

      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  const selectClass =
    "w-full px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-3xl w-full mx-auto space-y-8 bg-zinc-900 p-8 rounded-xl shadow-2xl border border-zinc-800">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create an Account
          </h2>

          <p className="mt-2 text-center text-sm text-neutral-400">
            Register for QMetric to access the dashboard.
          </p>

          <p className="mt-3 text-center text-sm text-blue-400">
            <Link
              to="/register-college"
              className="hover:text-blue-300"
            >
              Are you a college / exam cell? Register your college
            </Link>
          </p>
        </div>

        <form
          className="mt-8 space-y-6"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
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
            {/* ─── Common account fields ─────────────────────── */}
            <div className="mb-4 md:col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Account Type <span className="text-red-500">*</span>
              </label>

              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`${selectClass} ${
                  errors.role ? "border-red-500" : ""
                }`}
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>

              {errors.role && (
                <p
                  className="mt-1 text-sm text-red-500"
                  role="alert"
                >
                  {errors.role.message}
                </p>
              )}
            </div>

            <FormInput
              label="Username"
              name="userName"
              register={register}
              error={errors.userName}
              placeholder="johndoe123"
              required
            />

            <FormInput
              label="Email address"
              name="email"
              type="email"
              register={register}
              error={errors.email}
              placeholder="john@example.com"
              required
            />

            <FormInput
              label="Password"
              name="password"
              type="password"
              register={register}
              error={errors.password}
              placeholder="••••••••"
              required
            />

            <FormInput
              label="Full Name"
              name="fullName"
              register={register}
              error={errors.fullName}
              placeholder="John Doe"
              required
            />

            <FormInput
              label="Phone Number"
              name="phone"
              type="tel"
              register={register}
              error={errors.phone}
              placeholder="1234567890"
              required
            />

            {/* ─── Teacher-only fields ───────────────────────── */}
            {role === "teacher" && (
              <>
                <div className="mb-4 md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                    Teacher Affiliation{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <select
                    value={signupIntent}
                    onChange={(e) =>
                      handleSignupIntentChange(e.target.value)
                    }
                    className={selectClass}
                  >
                    <option value="affiliated">
                      Affiliated with a College
                    </option>

                    <option value="independent">
                      Independent / Unaffiliated
                    </option>
                  </select>

                  <p className="mt-1 text-xs text-neutral-400">
                    Affiliated teachers can use the college review
                    workflow. Independent teachers can analyze papers
                    without college review routing.
                  </p>
                </div>

                {/* ─── Affiliated college selection ──────────── */}
                {signupIntent === "affiliated" && (
                  <div className="mb-4 md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Select Registered College{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <select
                      {...register("collegeId")}
                      className={`${selectClass} ${
                        errors.collegeId
                          ? "border-red-500"
                          : ""
                      }`}
                      disabled={loadingColleges}
                    >
                      <option value="">
                        {loadingColleges
                          ? "Loading colleges..."
                          : "-- Select your institution --"}
                      </option>

                      {collegesList.map((college) => (
                        <option
                          key={college._id}
                          value={college._id}
                        >
                          {college.name} ({college.code}){" "}
                          {college.city
                            ? `- ${college.city}`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {!loadingColleges &&
                      collegesList.length === 0 && (
                        <p className="mt-1 text-xs text-amber-400">
                          No registered colleges found. Please
                          contact an administrator to register your
                          college first.
                        </p>
                      )}

                    {errors.collegeId && (
                      <p
                        className="mt-1 text-sm text-red-500"
                        role="alert"
                      >
                        {errors.collegeId.message}
                      </p>
                    )}

                    {collegeCode && (
                      <p className="text-xs text-blue-400 mt-1">
                        College Code:{" "}
                        <span className="font-mono font-bold uppercase">
                          {collegeCode}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* ─── Teacher position ──────────────────────── */}
                <FormInput
                  label="Position"
                  name="position"
                  type="select"
                  register={register}
                  error={errors.position}
                  options={POSITION_OPTIONS}
                  required
                />

                <FormInput
                  label="Employee ID"
                  name="employeeId"
                  register={register}
                  error={errors.employeeId}
                  placeholder="EMP12345"
                  required={signupIntent === "affiliated"}
                />

                <FormInput
                  label="Department"
                  name="department"
                  register={register}
                  error={errors.department}
                  placeholder="Computer Science"
                  required={signupIntent === "affiliated"}
                />

                <FormInput
                  label="Stream"
                  name="stream"
                  type="select"
                  register={register}
                  error={errors.stream}
                  options={STREAM_OPTIONS}
                  required={signupIntent === "affiliated"}
                />

                {/* ─── College ID photo ──────────────────────── */}
                {signupIntent === "affiliated" && (
                  <div className="md:col-span-2 mb-4">
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      College ID Photo{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setCollegeIdPhoto(
                          e.target.files?.[0] || null
                        )
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white"
                    />

                    <p className="text-xs text-neutral-400 mt-1">
                      Please upload a clear image of your college
                      ID card for verification.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── CAPTCHA ─────────────────────────────────────── */}
          <div className="flex justify-center">
            <Turnstile
              id="register-turnstile"
              ref={turnstileRef}
              siteKey={
                TURNSTILE_SITE_KEY ||
                "1x00000000000000000000AA"
              }
              onSuccess={(token) =>
                setTurnstileToken(token)
              }
              onExpire={() => setTurnstileToken("")}
              onError={() => {
                setTurnstileToken("");
                setError(
                  "CAPTCHA verification failed. Please try again."
                );
              }}
              options={{
                theme: "dark",
                size: "normal",
              }}
            />
          </div>

          {/* ─── Submit ──────────────────────────────────────── */}
          <div>
            <button
              type="submit"
              disabled={
                isSubmitting || !turnstileToken
              }
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-white hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? "Registering…"
                : "Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}