"use client";
import React, { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { loginSchema } from "../../schemas/validationSchemas";
import FormInput from "../FormInput";
import { InteractiveHoverButton } from "../ui/interactive-hover-button";

const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

export function SignupFormDemo() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const turnstileRef = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    const token = turnstileRef.current?.getResponse() || turnstileToken;
    if (!token) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await apiClient.post("/auth/login", {
        ...data,
        turnstileToken: token,
      });

      const resData = response.data;
      if (resData.error) {
        setError(resData.message || "Login failed");
        return;
      }

      setSuccess("Login successful!");
      login(resData.user);
      reset();
      turnstileRef.current?.reset();
      setTurnstileToken("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Error connecting to server";
      setError(message);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  // ─── BottomGradient removed - using InteractiveHoverButton instead ───

  return (
    <div className="max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-black bg-opacity-60">
      <h2 className="font-bold text-xl text-neutral-800 dark:text-neutral-200">
        Welcome to QMetric
      </h2>
      <p className="text-neutral-600 text-sm max-w-sm mt-2 dark:text-neutral-300">
        Sign in to your account to continue
      </p>

      {error && (
        <div className="mt-4 p-3 bg-red-500 text-white rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-500 text-white rounded-md text-sm">
          {success}
        </div>
      )}

      <form className="my-8" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormInput
          label="Email Address"
          name="email"
          type="email"
          placeholder="your@email.com"
          register={register}
          error={errors.email}
          required
        />

        <FormInput
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          register={register}
          error={errors.password}
          required
        />

        <div className="flex justify-center mb-8">
          <Turnstile
            id="login-turnstile"
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={(token) => {
              setTurnstileToken(token);
              if (error) setError("");
            }}
            onExpire={() => setTurnstileToken("")}
            onError={() => {
              setTurnstileToken("");
              setError("CAPTCHA verification failed. Please try again.");
            }}
            options={{ theme: "dark", size: "normal" }}
          />
        </div>

        <InteractiveHoverButton
          type="submit"
          fullWidth
          size="md"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting || !turnstileToken}
        >
          Sign In
        </InteractiveHoverButton>
      </form>

    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};
