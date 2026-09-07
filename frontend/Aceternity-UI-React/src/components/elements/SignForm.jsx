"use client";
import React, { useState, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { cn } from "../../utils/cn.js";
import apiClient from "../../api/client";
import { useAuth } from "../../context/AuthContext";

const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

export function SignupFormDemo() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // Turnstile
  const turnstileRef   = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState("");

  // Pre-existing login credentials for reference
  const demoAccounts = [
    { email: "test@user1.com", password: "password123" },
    { email: "test@user2.com", password: "password123" },
    { email: "test@user3.com", password: "password123" },
    { email: "test@user4.com", password: "password123" },
    { email: "test@user5.com", password: "password123" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Guard: Turnstile must be verified before submitting
    const token = turnstileRef.current?.getResponse() || turnstileToken;
    if (!token) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/login', {
        email, 
        password,
        turnstileToken: token
      });

      const data = response.data;
      setSuccess("Login successful!");
      login(data.accessToken, data.user);
      
      setEmail("");
      setPassword("");
      turnstileRef.current?.reset();
      setTurnstileToken("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Error connecting to server";
      setError(message);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

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

      <form className="my-8" onSubmit={handleSubmit}>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </LabelInputContainer>

        <LabelInputContainer className="mb-8">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </LabelInputContainer>

        <div className="flex justify-center mb-8">
          <Turnstile
            id="login-turnstile"
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={(token) => {
              console.log('[Turnstile/Login] verified');
              setTurnstileToken(token);
              if (error) setError('');
            }}
            onExpire={() => {
              console.log('[Turnstile/Login] expired');
              setTurnstileToken("");
            }}
            onError={(err) => {
              console.error('[Turnstile/Login] error:', err);
              setTurnstileToken("");
              setError("CAPTCHA verification failed. Please try again.");
            }}
            options={{ theme: "dark", size: "normal" }}
          />
        </div>

        <button
          className="bg-gradient-to-br relative group/btn from-black dark:from-zinc-900 dark:to-zinc-900 to-neutral-600 block dark:bg-zinc-800 w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset] disabled:opacity-50"
          type="submit"
          disabled={loading || !turnstileToken}
        >
          {loading ? "Signing in..." : "Sign In →"}
          <BottomGradient />
        </button>
      </form>

      <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />

      <div className="mt-6">
        <p className="text-neutral-600 text-xs dark:text-neutral-400 mb-3 font-semibold">
          Demo Accounts (Click to auto-fill):
        </p>
        <div className="space-y-2">
          {demoAccounts.map((account, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleDemoLogin(account.email, account.password)}
              className="w-full text-left px-3 py-2 rounded-md bg-neutral-800 dark:bg-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-800 text-neutral-300 text-xs transition-colors"
            >
              {account.email}
            </button>
          ))}
        </div>
      </div>
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

const LabelInputContainer = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col space-y-2 w-full", className)}>
      {children}
    </div>
  );
};
