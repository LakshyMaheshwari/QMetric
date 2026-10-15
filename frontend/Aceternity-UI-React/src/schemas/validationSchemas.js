import { z } from 'zod';

// ─── Login Schema ─────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

// ─── Register Schema ──────────────────────────────────────────────
export const registerSchema = z
  .object({
    role: z.enum(['student', 'teacher'], {
      errorMap: () => ({ message: 'Please select a valid account type' }),
    }),

    userName: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Only letters, numbers, and underscores allowed'
      ),

    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-z]/, 'Must contain a lowercase letter')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/\d/, 'Must contain a number'),

    fullName: z
      .string()
      .min(2, 'Full name is required')
      .max(100),

    phone: z
      .string()
      .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),

    signupIntent: z
      .enum(['affiliated', 'independent'])
      .optional(),

    collegeId: z
      .string()
      .optional()
      .or(z.literal('')),

    position: z
      .enum(
        [
          'Professor',
          'Senior Professor',
          'Associate Professor',
          'Assistant Professor',
          'Senior Lecturer',
          'Lecturer',
          'HoD',
          'Dean',
          'Director',
          'Principal',
          'Vice Principal',
          'Academic Coordinator',
          'Visiting Faculty',
          'Research Faculty',
          'Teaching Assistant',
          'Other',
        ],
        {
          errorMap: () => ({
            message: 'Please select a valid position',
          }),
        }
      )
      .optional(),

    employeeId: z
      .string()
      .optional()
      .or(z.literal('')),

    department: z
      .string()
      .optional()
      .or(z.literal('')),

    stream: z
      .string()
      .optional()
      .or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // Students do not need teacher-specific fields.
    if (data.role !== 'teacher') return;

    if (!data.signupIntent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['signupIntent'],
        message: 'Please select a teacher affiliation type',
      });
      return;
    }

    if (!data.position) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['position'],
        message: 'Please select your position',
      });
    }

    if (data.signupIntent === 'affiliated') {
      if (!data.collegeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['collegeId'],
          message: 'Please select your registered college',
        });
      }

      if (!data.department?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['department'],
          message: 'Department is required for affiliated teachers',
        });
      }

      if (!data.stream) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['stream'],
          message: 'Stream is required for affiliated teachers',
        });
      }
    }
  });

// ─── Profile Update Schema ────────────────────────────────────────
export const profileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name is required')
    .max(100),

  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),

  collegeName: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),

  department: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),
});

// ─── Admin Create User Schema ─────────────────────────────────────
export const createUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name is required')
    .max(100),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),

  role: z.enum(['teacher', 'reviewer', 'admin'], {
    errorMap: () => ({
      message: 'Please select a valid role',
    }),
  }),

  department: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),

  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),

  collegeName: z
    .string()
    .max(100)
    .optional()
    .or(z.literal('')),
});

// ─── College admin add user (includes position) ───────────────────
export const createCollegeUserSchema = createUserSchema.extend({
  position: z
    .string()
    .optional()
    .or(z.literal('')),
});

// ─── Create College Schema ────────────────────────────────────────
export const createCollegeSchema = z.object({
  name: z
    .string()
    .min(2, 'College name is required')
    .max(100),

  code: z
    .string()
    .min(2, 'Code is required')
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, 'Only letters and numbers')
    .transform((val) => val.toUpperCase()),

  city: z
    .string()
    .max(50)
    .optional()
    .or(z.literal('')),

  state: z
    .string()
    .max(50)
    .optional()
    .or(z.literal('')),
});

// ─── Review Paper Schema ──────────────────────────────────────────
export const reviewPaperSchema = z.object({
  action: z.enum(['approved', 'rejected', 'needs_revision']),

  comments: z
    .string()
    .max(2000, 'Comments must be under 2000 characters')
    .optional()
    .or(z.literal('')),
});