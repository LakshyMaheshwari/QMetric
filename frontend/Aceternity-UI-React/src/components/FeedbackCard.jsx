import React, { useState } from 'react';
import './FeedbackCard.css';

/**
 * FeedbackCard — standalone feedback form component.
 * Plain CSS version (no shadcn/ui dependency) styled to match the
 * dark theme used throughout QMetric.
 *
 * Props:
 *   onSubmit(data)  — called with { rating, feedback } on form submit
 *   isLoading       — disables the button and shows "Submitting…"
 */
const FeedbackCard = ({ onSubmit, isLoading = false }) => {
  const [rating, setRating] = useState(50);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ rating, feedback });
    }
  };

  // Map 0-100 to a colour that transitions red → yellow → green
  const getRatingColor = (val) => {
    if (val < 40) return '#ef4444';   // red
    if (val < 70) return '#f59e0b';   // amber
    return '#22c55e';                 // green
  };

  return (
    <div className="fb-card">
      {/* Header */}
      <div className="fb-card__header">
        <div className="fb-card__icon-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="fb-card__title">Share Your Feedback</h2>
          <p className="fb-card__description">Help us improve QMetric for everyone</p>
        </div>
      </div>

      {/* Rating Slider */}
      <div className="fb-card__section">
        <label className="fb-card__label">How satisfied are you with QMetric?</label>

        <div className="fb-slider-wrapper">
          <input
            id="rating-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="fb-slider"
            style={{ '--thumb-color': getRatingColor(rating), '--fill-color': getRatingColor(rating), '--val': rating }}
          />
          <div className="fb-slider-labels">
            <span>Not satisfied</span>
            <span>Very satisfied</span>
          </div>
          <div className="fb-rating-badge" style={{ backgroundColor: getRatingColor(rating) + '22', border: `1px solid ${getRatingColor(rating)}44`, color: getRatingColor(rating) }}>
            {rating}%
          </div>
        </div>
      </div>

      {/* Text Area */}
      <div className="fb-card__section">
        <label htmlFor="feedback-text" className="fb-card__label">Your feedback</label>
        <textarea
          id="feedback-text"
          className="fb-textarea"
          placeholder="Tell us what you think — what worked well, what could be better..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={5}
        />
        <span className="fb-char-count">{feedback.length} characters</span>
      </div>

      {/* Submit Button */}
      <button
        className="fb-btn"
        onClick={handleSubmit}
        disabled={isLoading || !feedback.trim()}
      >
        {isLoading ? (
          <>
            <span className="fb-btn__spinner" />
            Submitting…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Submit Feedback
          </>
        )}
      </button>
    </div>
  );
};

export default FeedbackCard;
