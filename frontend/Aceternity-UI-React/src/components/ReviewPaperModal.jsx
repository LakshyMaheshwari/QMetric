import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '../api/client';
import {
  X, CheckCircle, AlertTriangle, XCircle, FileText,
  User, BookOpen, Award, MessageSquare, Loader2, History
} from 'lucide-react';
import { reviewPaperSchema } from '../schemas/validationSchemas';
import FormInput from './FormInput';

const ReviewPaperModal = ({ paper, onClose, onComplete }) => {
  const [error, setError] = useState('');

  const defaultAction =
    paper?.reviewStatus && paper.reviewStatus !== 'pending' ? paper.reviewStatus : 'approved';

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

  const courseTitle = paper?.courseName || paper?.['Course Name'] || 'Untitled Course';
  const courseCode = paper?.courseCode || paper?.['Course Code'] || '';
  const teacherName = paper?.userId?.fullName || paper?.userId?.userName || paper?.['Course Teacher'] || 'Unknown Teacher';
  const department = paper?.userId?.department || paper?.['Branch'] || 'Academic Dept';
  const questionsCount = paper?.questionsCount || (Array.isArray(paper?.questions) ? paper.questions.length : 0);
  const qualityScore = paper?.qualityScore || 75;

  const onSubmit = async (data) => {
    setError('');

    try {
      const response = await apiClient.put(`/reviewer/papers/${paper._id}/review`, {
        action: data.action,
        comments: (data.comments || '').trim(),
      });

      if (response.data && !response.data.error) {
        onComplete(response.data.paper || paper);
      } else {
        setError(response.data?.message || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Review submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit review. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Review Assessment Paper</h3>
              <p className="text-xs text-zinc-400">Evaluate quality, consistency, and compliance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-base font-semibold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  {courseTitle}
                </h4>
                {courseCode && (
                  <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                    {courseCode}
                  </span>
                )}
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium border capitalize bg-zinc-800 text-zinc-300 border-zinc-700">
                {paper?.reviewStatus?.replace('_', ' ') || 'Pending'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/50 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span>Uploaded by: <strong className="text-zinc-200">{teacherName}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <span>Dept: <strong className="text-zinc-200">{department}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>Questions: <strong className="text-zinc-200">{questionsCount} items</strong></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Award className="w-3.5 h-3.5 text-zinc-500" />
                <span>Quality Score: <strong className={qualityScore >= 75 ? 'text-green-400' : qualityScore >= 50 ? 'text-yellow-400' : 'text-red-400'}>{qualityScore}%</strong></span>
              </div>
            </div>
          </div>

          {paper?.reviewHistory && paper.reviewHistory.length > 0 && (
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>Previous Reviews ({paper.reviewHistory.length})</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                {paper.reviewHistory.map((item, idx) => (
                  <div key={idx} className="p-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] flex justify-between items-start">
                    <div>
                      <span className={`font-semibold capitalize ${
                        item.action === 'approved' ? 'text-green-400' : item.action === 'rejected' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {item.action?.replace('_', ' ')}:
                      </span>{' '}
                      <span className="text-zinc-300">{item.comments || 'No remarks provided'}</span>
                    </div>
                    <span className="text-zinc-500 text-[10px] whitespace-nowrap ml-2">
                      {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <input type="hidden" {...register('action')} />

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                Review Decision <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setValue('action', 'approved', { shouldValidate: true })}
                  className={`p-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-1.5 transition-all ${
                    action === 'approved'
                      ? 'bg-green-500/15 border-green-500/50 text-green-300 shadow-md shadow-green-500/10'
                      : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('action', 'needs_revision', { shouldValidate: true })}
                  className={`p-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-1.5 transition-all ${
                    action === 'needs_revision'
                      ? 'bg-yellow-500/15 border-yellow-500/50 text-yellow-300 shadow-md shadow-yellow-500/10'
                      : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>Revision</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('action', 'rejected', { shouldValidate: true })}
                  className={`p-3 rounded-xl border text-sm font-medium flex flex-col items-center gap-1.5 transition-all ${
                    action === 'rejected'
                      ? 'bg-red-500/15 border-red-500/50 text-red-300 shadow-md shadow-red-500/10'
                      : 'bg-zinc-800/50 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <XCircle className="w-5 h-5" />
                  <span>Reject</span>
                </button>
              </div>
              {errors.action && (
                <p className="mt-1 text-sm text-red-500" role="alert">{errors.action.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                <span>Comments & Feedback for Teacher</span>
              </label>
              <FormInput
                name="comments"
                type="textarea"
                register={register}
                error={errors.comments}
                placeholder="Provide constructive feedback, question clarity issues, or revision notes..."
                rows={4}
              />
              <div className="flex justify-between text-[11px] text-zinc-500 -mt-2 mb-2">
                <span>Feedback will be visible to the course instructor</span>
                <span>{comments.length}/2000</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Review</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewPaperModal;
