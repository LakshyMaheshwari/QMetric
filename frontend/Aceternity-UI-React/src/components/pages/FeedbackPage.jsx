import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FeedbackCard from '../FeedbackCard';
import './FeedbackPage.css';

// API base URL — matches the URL used in Navbar.jsx
const API_BASE = 'https://qmetric-2.onrender.com';

/**
 * FeedbackPage — accessible at /feedback.
 * Redirects to '/' (triggers login modal via Navbar) if the user is
 * not authenticated. Submits feedback to POST /feedback.
 */
const FeedbackPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect unauthenticated users back to home
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // ── Submit handler ────────────────────────────────────────
  const handleFeedbackSubmit = async ({ rating, feedback }) => {
    setIsSubmitting(true);
    setSubmitStatus(null);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // JWT sent as Bearer token — token comes from AuthContext
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, feedback }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || 'Failed to submit feedback.');
      }

      setSubmitStatus('success');
    } catch (err) {
      setSubmitStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not logged in, useEffect will redirect — render nothing meanwhile
  if (!user) return null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="fp-page">
      {/* Background decorative blobs */}
      <div className="fp-blob fp-blob--1" />
      <div className="fp-blob fp-blob--2" />

      <div className="fp-container">
        {/* Page header */}
        <div className="fp-header">
          <h1 className="fp-header__title">
            We&rsquo;d love your{' '}
            <span className="fp-header__highlight">feedback</span>
          </h1>
          <p className="fp-header__subtitle">
            Logged in as <strong>{user.userName}</strong> &mdash; your feedback helps us
            prioritise what matters most.
          </p>
        </div>

        {/* Success state */}
        {submitStatus === 'success' ? (
          <div className="fp-success">
            <div className="fp-success__icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="fp-success__title">Thank you!</h2>
            <p className="fp-success__body">
              Your feedback has been submitted successfully. We really appreciate it.
            </p>
            <button
              className="fp-success__btn"
              onClick={() => {
                setSubmitStatus(null);
                setErrorMessage('');
              }}
            >
              Submit another response
            </button>
          </div>
        ) : (
          <>
            {/* Error banner */}
            {submitStatus === 'error' && (
              <div className="fp-error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Feedback form */}
            <FeedbackCard onSubmit={handleFeedbackSubmit} isLoading={isSubmitting} />
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
