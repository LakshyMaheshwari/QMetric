import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '../api/client';
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  User,
  BookOpen,
  Award,
  MessageSquare,
  History
} from 'lucide-react';
import { reviewPaperSchema } from '../schemas/validationSchemas';
import FormInput from './FormInput';

const getQuestionsCount = (paper) => {
  const collectedDataQuestions = Array.isArray(paper?.questions)
    ? paper.questions.flatMap((item) =>
        Array.isArray(item?.QuestionData) ? item.QuestionData : []
      )
    : [];

  if (collectedDataQuestions.length > 0) {
    return collectedDataQuestions.length;
  }

  if (Array.isArray(paper?.questions)) {
    return paper.questions.length;
  }

  const rawQuestions = paper?.['Collected Data']?.[0]?.QuestionData;
  return Array.isArray(rawQuestions) ? rawQuestions.length : 0;
};

const getQualityScore = (paper) => {
  const score = Number(
    paper?.qualityScore ?? paper?.['Collected Data']?.[0]?.FinalScore ?? 0
  );
  return Number.isFinite(score) ? score : 0;
};

const ReviewPaperModal = ({ paper, onClose, onComplete }) => {
  const [error, setError] = useState('');

  const reviewStatus = paper?.reviewStatus || 'pending';
  const isReadOnly = reviewStatus !== 'pending';
  const defaultAction = isReadOnly ? reviewStatus : 'approved';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reviewPaperSchema),
    defaultValues: {
      action: defaultAction,
      comments: paper?.reviewComments || '',
    },
  });

  const action = watch('action');
  const comments = watch('comments') || '';

  const courseTitle =
    paper?.courseName || paper?.['Course Name'] || 'Untitled Course';
  const courseCode = paper?.courseCode || paper?.['Course Code'] || '';
  const teacherName =
    paper?.userId?.fullName ||
    paper?.userId?.userName ||
    paper?.['Course Teacher'] ||
    'Unknown Teacher';
  const department =
    paper?.userId?.department || paper?.['Branch'] || 'Academic Dept';
  const questionsCount = getQuestionsCount(paper);
  const qualityScore = getQualityScore(paper);
  const statusLabel = reviewStatus.replace('_', ' ');

  const onSubmit = async (formData) => {
    if (isReadOnly) return;
    setError('');

    try {
      const response = await apiClient.put(
        `/reviewer/papers/${paper._id}/review`,
        {
          action: formData.action,
          comments: (formData.comments || '').trim(),
        }
      );

      if (response.data && !response.data.error) {
        onComplete(response.data.paper || paper);
      } else {
        setError(response.data?.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Review submission error:', err);
      setError(
        err.response?.data?.message || 'Failed to submit review. Please try again.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto animate__animated animate__fadeIn animate__faster"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      <div className="bg-white border border-[#E8E2D7] rounded-2xl w-full max-w-xl shadow-xl overflow-hidden my-8 text-[#111827]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D7] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#111827]">
                {isReadOnly ? 'View Assessment Paper' : 'Review Assessment Paper'}
              </h3>
              <p className="text-xs text-[#78716C]">
                {isReadOnly
                  ? 'Review details and previous feedback'
                  : 'Evaluate quality, consistency, and compliance'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#78716C] hover:text-[#111827] rounded-xl hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Paper summary */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-base font-bold text-[#111827] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  {courseTitle}
                </h4>
                {courseCode && (
                  <span className="text-xs font-mono text-orange-700 bg-orange-100/60 border border-orange-200 px-2 py-0.5 rounded mt-1 inline-block">
                    {courseCode}
                  </span>
                )}
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold border capitalize bg-white text-[#57534E] border-[#E8E2D7]">
                {statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E8E2D7] text-xs">
              <div className="flex items-center gap-2 text-[#78716C]">
                <User className="w-3.5 h-3.5 text-[#A8A29E]" />
                <span>
                  Uploaded by: <strong className="text-[#111827]">{teacherName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#78716C]">
                <span>
                  Dept: <strong className="text-[#111827]">{department}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#78716C]">
                <FileText className="w-3.5 h-3.5 text-[#A8A29E]" />
                <span>
                  Questions: <strong className="text-[#111827]">{questionsCount} items</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#78716C]">
                <Award className="w-3.5 h-3.5 text-[#A8A29E]" />
                <span>
                  Quality Score:{' '}
                  <strong
                    className={
                      qualityScore >= 75
                        ? 'text-emerald-600'
                        : qualityScore >= 50
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }
                  >
                    {qualityScore}%
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Previous reviews */}
          {paper?.reviewHistory && paper.reviewHistory.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7] text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-[#57534E] font-semibold">
                <History className="w-3.5 h-3.5 text-orange-500" />
                <span>Previous Reviews ({paper.reviewHistory.length})</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                {paper.reviewHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-[#E8E2D7] text-[#57534E] text-[11px] flex justify-between items-start gap-3"
                  >
                    <div>
                      <span
                        className={`font-semibold capitalize ${
                          item.action === 'approved'
                            ? 'text-emerald-600'
                            : item.action === 'rejected'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {item.action?.replace('_', ' ')}:
                      </span>{' '}
                      <span className="text-[#111827]">
                        {item.comments || 'No remarks provided'}
                      </span>
                    </div>
                    <span className="text-[#A8A29E] text-[10px] whitespace-nowrap">
                      {item.timestamp
                        ? new Date(item.timestamp).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read-only message */}
          {isReadOnly && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm">
              This paper has already been reviewed and is now read-only.
            </div>
          )}

          {/* Review form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <input type="hidden" {...register('action')} />

            {/* Review decision */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2">
                Review Decision
                {!isReadOnly && <span className="text-red-500"> *</span>}
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setValue('action', 'approved', { shouldValidate: true })}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    action === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm'
                      : 'bg-[#FAF7F2] border-[#E8E2D7] text-[#57534E] hover:bg-neutral-100'
                  } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Approve
                </button>

                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setValue('action', 'needs_revision', { shouldValidate: true })}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    action === 'needs_revision'
                      ? 'bg-amber-50 text-amber-700 border-amber-400 ring-2 ring-amber-400/20 shadow-sm'
                      : 'bg-[#FAF7F2] border-[#E8E2D7] text-[#57534E] hover:bg-neutral-100'
                  } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Revision
                </button>

                <button
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setValue('action', 'rejected', { shouldValidate: true })}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    action === 'rejected'
                      ? 'bg-red-50 text-red-700 border-red-400 ring-2 ring-red-400/20 shadow-sm'
                      : 'bg-[#FAF7F2] border-[#E8E2D7] text-[#57534E] hover:bg-neutral-100'
                  } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  Reject
                </button>
              </div>

              {errors.action && (
                <p className="mt-1 text-xs text-red-500" role="alert">
                  {errors.action.message}
                </p>
              )}
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#78716C]" />
                <span>
                  {isReadOnly ? 'Review Comments' : 'Comments & Feedback for Teacher'}
                </span>
              </label>

              <FormInput
                name="comments"
                type="textarea"
                register={register}
                error={errors.comments}
                placeholder={
                  isReadOnly
                    ? ''
                    : 'Provide constructive feedback, question clarity issues, or revision notes...'
                }
                rows={4}
                disabled={isReadOnly}
              />

              <div className="flex justify-between text-[11px] text-[#78716C] -mt-2 mb-2">
                <span>
                  {isReadOnly
                    ? 'Previous reviewer feedback'
                    : 'Feedback will be visible to the course instructor'}
                </span>
                <span>{comments.length}/2000</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E2D7]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-[#78716C] hover:text-[#111827] rounded-xl hover:bg-neutral-100 transition-colors"
              >
                Close
              </button>

              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewPaperModal;