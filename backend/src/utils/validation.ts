import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    designation: z.string().optional(),
    phone: z.string().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    designation: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    skills: z.array(z.string()).optional(),
    status: z.enum(['ONLINE', 'OFFLINE', 'AWAY', 'BUSY', 'DND']).optional(),
    
    employeeId: z.string().nullable().optional(),
    coverUrl: z.string().nullable().optional(),
    joiningDate: z.string().nullable().optional(),
    employmentType: z.string().nullable().optional(),
    officeLocation: z.string().nullable().optional(),
    emergencyContact: z.string().nullable().optional(),
    birthday: z.string().nullable().optional(),
    timezone: z.string().optional(),
    workingHours: z.string().nullable().optional(),
    managerId: z.string().nullable().optional(),
    departmentId: z.string().nullable().optional(),
    socialLinks: z.record(z.string().nullable()).optional(),
  }),
});

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
    dueDate: z.string().optional().nullable(),
    assigneeId: z.string().min(1, 'Assignee is required'),
    departmentId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']).optional(),
    dueDate: z.string().optional().nullable(),
    assigneeId: z.string().optional(),
    projectId: z.string().optional().nullable(),
    progress: z.number().min(0).max(100).optional(),
  }),
});

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
    isPinned: z.boolean().optional(),
    expiresAt: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
  }),
});

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Group name is required'),
    description: z.string().optional(),
    type: z.enum(['DEPARTMENT', 'PROJECT', 'CUSTOM']).optional(),
    isBroadcast: z.boolean().optional(),
    avatarUrl: z.string().optional(),
    memberIds: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
  }).refine(data => (data.memberIds && data.memberIds.length > 0) || (data.userIds && data.userIds.length > 0), {
    message: 'At least one member is required',
    path: ['memberIds']
  }),
});
