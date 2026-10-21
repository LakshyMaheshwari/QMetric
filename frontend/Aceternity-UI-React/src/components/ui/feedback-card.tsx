'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Angry, Check, Frown, Laugh, Loader2, Smile, Lock, LogIn } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

const feedback = [
  { happiness: 4, emoji: Laugh, color: 'text-emerald-600' },
  { happiness: 3, emoji: Smile, color: 'text-green-500' },
  { happiness: 2, emoji: Frown, color: 'text-amber-500' },
  { happiness: 1, emoji: Angry, color: 'text-rose-500' }
]

export const Component = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const textRef = useRef<HTMLTextAreaElement>(null)
  const [happiness, setHappiness] = useState<null | number>(null)

  const [isSubmitted, setSubmissionState] = useState(false)
  const { submitFeedback, isLoading, isSent } = useSubmitFeedback()

  useEffect(() => {
    if (!happiness) {
      if (textRef.current) textRef.current.value = ''
    }
  }, [happiness])

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null
    let submissionStateTimeout: NodeJS.Timeout | null = null

    if (isSent) {
      setSubmissionState(true)

      timeout = setTimeout(() => {
        setHappiness(null)
        if (textRef.current) textRef.current.value = ''
      }, 2000)

      submissionStateTimeout = setTimeout(() => {
        setSubmissionState(false)
      }, 2200)
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
      if (submissionStateTimeout) {
        clearTimeout(submissionStateTimeout)
      }
    }
  }, [isSent])

  const handleEmojiClick = (rating: number) => {
    setHappiness((prev) => (rating === prev ? null : rating))
  }

  const handleSubmit = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    submitFeedback(happiness!, textRef.current?.value || '')
  }

  return (
    <motion.div
      layout
      initial={{ borderRadius: '2rem' }}
      animate={happiness ? { borderRadius: '1rem' } : { borderRadius: '2rem' }}
      className={cn(
        'w-fit max-w-[calc(100vw-2rem)] overflow-hidden border border-[#E8E2D7] py-2 px-1 shadow-md shadow-orange-500/5 bg-white transition-colors duration-200'
      )}>
      <span className="flex items-center justify-center gap-3 pl-4 pr-2">
        <div className="text-sm font-semibold text-slate-800">Like our service?</div>
        <div className="flex items-center gap-0.5 text-slate-400">
          {feedback.map((e) => {
            const EmojiIcon = e.emoji
            const isSelected = happiness === e.happiness
            return (
              <button
                type="button"
                onClick={() => handleEmojiClick(e.happiness)}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95',
                  isSelected
                    ? `${e.color} bg-orange-50/80 ring-2 ring-orange-300/60 shadow-sm`
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/80'
                )}
                key={e.happiness}
                aria-label={`Rating ${e.happiness}`}>
                <EmojiIcon size={20} />
              </button>
            )
          })}
        </div>
      </span>
      <motion.div
        aria-hidden={!happiness}
        initial={false}
        className="overflow-hidden"
        transition={{ ease: 'easeInOut', duration: 0.3 }}
        style={{ maxWidth: 'calc(100vw - 2.5rem)' }}
        animate={
          happiness
            ? { height: isAuthenticated ? 210 : 175, width: 520, opacity: 1 }
            : { height: 0, width: 0, opacity: 0 }
        }>
        {happiness && (
          <div className="px-3 h-full w-full">
            <AnimatePresence mode="wait">
              {!isAuthenticated ? (
                <motion.div
                  key="unauthenticated"
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-full w-full flex-col items-center justify-center gap-2.5 py-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-orange-600 shadow-sm">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Sign in to Submit Feedback</p>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-[320px]">
                      Feedback submissions require an authenticated account. Please sign in to share your thoughts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="mt-1 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02] transition-all">
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In to Continue
                  </button>
                </motion.div>
              ) : !isSubmitted ? (
                <motion.span key="form" exit={{ opacity: 0 }} initial={{ opacity: 1 }} className="block pt-2">
                  <textarea
                    ref={textRef}
                    placeholder={`Share your thoughts, suggestions, or feedback as ${user?.userName || 'user'}...`}
                    className="min-h-32 w-full resize-none rounded-xl border border-[#E8E2D7] bg-[#FAF7F2]/60 p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                  />
                  <div className="flex h-fit w-full items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 truncate max-w-[240px]">
                      Posting as <span className="font-semibold text-slate-700">{user?.userName || user?.email}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className={cn(
                        'flex h-9 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all',
                        {
                          'opacity-70 cursor-not-allowed': isLoading
                        }
                      )}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </button>
                  </div>
                </motion.span>
              ) : (
                <motion.div
                  key="success"
                  variants={container}
                  initial="hidden"
                  animate="show"
                  className="flex h-full w-full flex-col items-center justify-start gap-2 pt-9 text-sm font-normal text-slate-700">
                  <motion.div
                    variants={item}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                    <Check strokeWidth={2.5} size={18} className="stroke-white" />
                  </motion.div>
                  <motion.div variants={item} className="font-bold text-slate-800 text-base">
                    Your feedback has been received!
                  </motion.div>
                  <motion.div variants={item} className="text-xs text-slate-500">
                    Thank you for helping us improve QPQA.
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export const FeedbackCard = Component

const container = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      staggerChildren: 0.04
    }
  }
}

const item = {
  hidden: { y: 10 },
  show: { y: 0 }
}

const useSubmitFeedback = () => {
  const [feedbackData, setFeedbackData] = useState<{ happiness: number; feedback: string } | null>(null)
  const [isLoading, setLoadingState] = useState(false)
  const [error, setError] = useState<{ error: any } | null>(null)
  const [isSent, setRequestState] = useState(false)

  const sendFeedbackApi = (data: { happiness: number; feedback: string }) =>
    new Promise((res) => setTimeout(() => res(data), 1000))

  useEffect(() => {
    if (feedbackData) {
      setLoadingState(true)
      setRequestState(false)

      sendFeedbackApi(feedbackData)
        .then(() => {
          setRequestState(true)
          setError(null)
        })
        .catch(() => {
          setRequestState(false)
          setError({ error: 'some error' })
        })
        .finally(() => setLoadingState(false))
    }
  }, [feedbackData])

  return {
    submitFeedback: (happiness: number, feedback: string) => setFeedbackData({ happiness, feedback }),
    isLoading,
    error,
    isSent
  }
}

export default Component
