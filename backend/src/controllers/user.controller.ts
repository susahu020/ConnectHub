import { Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { isConfigured as isCloudinaryConfigured, cloudinary } from '../config/cloudinary';

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: {
        department: true,
        settings: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true }
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true }
        },
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        educations: {
          orderBy: { startDate: 'desc' }
        },
        certifications: {
          orderBy: { issueDate: 'desc' }
        },
        userSkills: {
          orderBy: { order: 'asc' }
        }
      },
    });

    if (!user) {
      res.status(404).json({ message: 'Profile not found.' });
      return;
    }

    const { passwordHash: _, ...safeUser } = user;
    res.status(200).json(safeUser);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      firstName,
      lastName,
      phone,
      designation,
      bio,
      location,
      skills,
      status,
      employeeId,
      coverUrl,
      joiningDate,
      employmentType,
      officeLocation,
      emergencyContact,
      birthday,
      timezone,
      workingHours,
      managerId,
      socialLinks,
      departmentId
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        phone: phone !== undefined ? phone : undefined,
        designation: designation !== undefined ? designation : undefined,
        bio: bio !== undefined ? bio : undefined,
        location: location !== undefined ? location : undefined,
        skills: skills !== undefined ? skills : undefined,
        status: status !== undefined ? status : undefined,
        employeeId: employeeId !== undefined ? employeeId : undefined,
        coverUrl: coverUrl !== undefined ? coverUrl : undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : (joiningDate === null ? null : undefined),
        employmentType: employmentType !== undefined ? employmentType : undefined,
        officeLocation: officeLocation !== undefined ? officeLocation : undefined,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : undefined,
        birthday: birthday ? new Date(birthday) : (birthday === null ? null : undefined),
        timezone: timezone !== undefined ? timezone : undefined,
        workingHours: workingHours !== undefined ? workingHours : undefined,
        managerId: managerId !== undefined ? managerId : undefined,
        socialLinks: socialLinks !== undefined ? socialLinks : undefined,
        departmentId: departmentId !== undefined ? (departmentId || null) : undefined,
      },
      include: {
        department: true,
        settings: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true }
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true }
        },
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        educations: {
          orderBy: { startDate: 'desc' }
        },
        certifications: {
          orderBy: { issueDate: 'desc' }
        },
        userSkills: {
          orderBy: { order: 'asc' }
        }
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: userId!,
        action: 'UPDATE_PROFILE',
        details: 'Updated profile information',
      },
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    res.status(200).json({ message: 'Profile updated successfully.', user: safeUser });
  } catch (error) {
    next(error);
  }
};

export const getDirectory = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, departmentId, location, status, limit = '20', page = '1' } = req.query;

    const parsedLimit = parseInt(limit as string);
    const parsedPage = parseInt(page as string);
    const skip = (parsedPage - 1) * parsedLimit;

    // Filters
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { designation: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (departmentId) {
      whereClause.departmentId = departmentId as string;
    }

    if (location) {
      whereClause.location = { contains: location as string, mode: 'insensitive' };
    }

    if (status) {
      if (status === 'OFFLINE') {
        whereClause.status = { in: ['OFFLINE', 'INVISIBLE'] };
      } else {
        whereClause.status = status as string;
      }
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          designation: true,
          bio: true,
          skills: true,
          avatarUrl: true,
          role: true,
          status: true,
          location: true,
          department: {
            select: { id: true, name: true },
          },
        },
        orderBy: { firstName: 'asc' },
        take: parsedLimit,
        skip: skip,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const maskedUsers = users.map((u: any) => {
      if (u.status === 'INVISIBLE') {
        return { ...u, status: 'OFFLINE' };
      }
      return u;
    });

    res.status(200).json({
      users: maskedUsers,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;

    // Fetch dashboard aggregations in parallel
    const [
      unreadMsgs,
      unreadNotifications,
      pendingTasks,
      totalEmployees,
      onlineEmployees,
      recentFiles,
      recentAnnouncements,
      onlineUsersList,
      recentActivity,
      projects,
    ] = await prisma.$transaction([
      // Unread messages status count
      prisma.messageStatus.count({
        where: { userId, status: 'DELIVERED' },
      }),
      // Unread notifications
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      // Assigned tasks that are not completed
      prisma.task.count({
        where: { assigneeId: userId, status: { not: 'COMPLETED' } },
      }),
      // Total employees
      prisma.user.count(),
      // Online employees
      prisma.user.count({
        where: { status: { in: ['ONLINE', 'AWAY', 'BUSY', 'DND'] } },
      }),
      // Recent files uploaded in user's company/by anyone (up to 5)
      prisma.file.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { uploader: { select: { firstName: true, lastName: true } } },
      }),
      // Recent announcements (up to 5)
      prisma.announcement.findMany({
        where: {
          OR: [
            { departmentId: null },
            { departmentId: req.user?.departmentId || undefined },
          ],
          expiresAt: { gte: new Date() },
        },
        take: 5,
        orderBy: { isPinned: 'desc' },
        include: { creator: { select: { firstName: true, lastName: true } } },
      }),
      // Online users list (excluding current user)
      prisma.user.findMany({
        where: { status: { in: ['ONLINE', 'AWAY', 'BUSY', 'DND'] }, id: { not: userId } },
        select: { id: true, firstName: true, lastName: true, designation: true, status: true },
        take: 10,
      }),
      // Recent activity logs (up to 5)
      prisma.activityLog.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      // Recent projects (up to 5)
      prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { team: { select: { name: true } } },
      }),
    ]);

    // Active tasks details
    const tasks = await prisma.task.findMany({
      where: { assigneeId: userId, status: { not: 'COMPLETED' } },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });

    res.status(200).json({
      unreadMessages: unreadMsgs,
      unreadNotifications,
      pendingTasksCount: pendingTasks,
      totalEmployees,
      onlineEmployees,
      recentFiles,
      recentAnnouncements,
      onlineUsersList,
      tasks,
      recentActivity,
      projects,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { theme, language, pushEnabled, emailEnabled, desktopEnabled } = req.body;

    const settings = await prisma.userSettings.update({
      where: { userId },
      data: {
        theme: theme !== undefined ? theme : undefined,
        language: language !== undefined ? language : undefined,
        pushEnabled: pushEnabled !== undefined ? pushEnabled : undefined,
        emailEnabled: emailEnabled !== undefined ? emailEnabled : undefined,
        desktopEnabled: desktopEnabled !== undefined ? desktopEnabled : undefined,
      },
    });

    res.status(200).json({ message: 'Settings updated successfully.', settings });
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const currentSessionId = req.sessionId;

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gte: new Date() },
      },
      select: {
        id: true,
        sessionId: true,
        deviceName: true,
        browser: true,
        operatingSystem: true,
        ipAddress: true,
        location: true,
        loginTime: true,
        lastActivity: true,
        expiresAt: true,
      },
      orderBy: { lastActivity: 'desc' },
    });

    const parsedSessions = sessions.map((s) => ({
      ...s,
      isCurrent: s.sessionId === currentSessionId,
    }));

    res.status(200).json(parsedSessions);
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params; // This is the session.id
    
    const session = await prisma.session.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (session) {
      // Import dynamically or directly from session service
      const { revokeSession: serviceRevoke } = require('../services/session.service');
      await serviceRevoke(session.sessionId, 'FORCE_OUT', 'Revoked remotely by user');
    }

    res.status(200).json({ message: 'Session revoked successfully.' });
  } catch (error) {
    next(error);
  }
};

const DEFAULT_WIDGETS = [
  { widgetKey: 'stats', x: 0, y: 0, w: 4, h: 1, visible: true },
  { widgetKey: 'tasks', x: 0, y: 1, w: 2, h: 2, visible: true },
  { widgetKey: 'performance', x: 2, y: 1, w: 2, h: 2, visible: true },
  { widgetKey: 'activity_feed', x: 0, y: 3, w: 2, h: 2, visible: true },
  { widgetKey: 'projects', x: 2, y: 3, w: 2, h: 2, visible: true },
  { widgetKey: 'meetings', x: 0, y: 5, w: 2, h: 2, visible: true },
  { widgetKey: 'online', x: 2, y: 5, w: 2, h: 2, visible: true },
  { widgetKey: 'files', x: 0, y: 7, w: 2, h: 2, visible: true },
  { widgetKey: 'announcements', x: 2, y: 7, w: 2, h: 2, visible: true },
  { widgetKey: 'quick_actions', x: 0, y: 9, w: 4, h: 1, visible: true },
];

export const getDashboardLayout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const layouts = await prisma.dashboardWidgetLayout.findMany({
      where: { userId },
    });

    if (layouts.length === 0) {
      res.status(200).json(DEFAULT_WIDGETS);
      return;
    }

    res.status(200).json(layouts);
  } catch (error) {
    next(error);
  }
};

export const saveDashboardLayout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { layouts } = req.body; // Array of { widgetKey, x, y, w, h, visible }

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!Array.isArray(layouts)) {
      res.status(400).json({ message: 'Layouts array is required' });
      return;
    }

    await prisma.$transaction(
      layouts.map((ly) =>
        prisma.dashboardWidgetLayout.upsert({
          where: {
            userId_widgetKey: {
              userId,
              widgetKey: ly.widgetKey,
            },
          },
          update: {
            x: ly.x,
            y: ly.y,
            w: ly.w,
            h: ly.h,
            visible: ly.visible,
          },
          create: {
            userId,
            widgetKey: ly.widgetKey,
            x: ly.x,
            y: ly.y,
            w: ly.w,
            h: ly.h,
            visible: ly.visible,
          },
        })
      )
    );

    res.status(200).json({ message: 'Dashboard layout saved successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getProfileById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        settings: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true }
        },
        directReports: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true }
        },
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        educations: {
          orderBy: { startDate: 'desc' }
        },
        certifications: {
          orderBy: { issueDate: 'desc' }
        },
        userSkills: {
          orderBy: { order: 'asc' }
        }
      },
    });

    if (!user) {
      res.status(404).json({ message: 'Profile not found.' });
      return;
    }

    const { passwordHash: _, ...safeUser } = user;
    res.status(200).json(safeUser);
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'image',
          folder: 'connecthub_avatars',
        });
        fileUrl = result.secure_url;
        fs.unlinkSync(file.path);
      } catch (err) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        fileUrl = `${serverUrl}/uploads/${file.filename}`;
      }
    } else {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      fileUrl = `${serverUrl}/uploads/${file.filename}`;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: fileUrl },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_AVATAR',
        details: 'Uploaded new profile avatar',
      },
    });

    res.status(200).json({ message: 'Avatar uploaded successfully.', avatarUrl: fileUrl });
  } catch (error) {
    next(error);
  }
};

export const uploadCover = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'image',
          folder: 'connecthub_covers',
        });
        fileUrl = result.secure_url;
        fs.unlinkSync(file.path);
      } catch (err) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        fileUrl = `${serverUrl}/uploads/${file.filename}`;
      }
    } else {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      fileUrl = `${serverUrl}/uploads/${file.filename}`;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { coverUrl: fileUrl },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_COVER',
        details: 'Uploaded new profile cover photo',
      },
    });

    res.status(200).json({ message: 'Cover banner uploaded successfully.', coverUrl: fileUrl });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SKILLS CRUD
// ==========================================
export const addSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { skillName, level, yearsOfExp, category, order } = req.body;
    const skill = await prisma.userSkill.create({
      data: {
        userId,
        skillName,
        level,
        yearsOfExp: yearsOfExp ? parseInt(yearsOfExp) : 0,
        category,
        order: order ? parseInt(order) : 0,
      }
    });
    res.status(201).json(skill);
  } catch (error) {
    next(error);
  }
};

export const updateSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { level, yearsOfExp, category, order, isVerified } = req.body;
    
    const skill = await prisma.userSkill.update({
      where: { id },
      data: {
        level: level !== undefined ? level : undefined,
        yearsOfExp: yearsOfExp !== undefined ? parseInt(yearsOfExp) : undefined,
        category: category !== undefined ? category : undefined,
        order: order !== undefined ? parseInt(order) : undefined,
        isVerified: isVerified !== undefined ? isVerified : undefined,
      }
    });
    res.status(200).json(skill);
  } catch (error) {
    next(error);
  }
};

export const deleteSkill = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.userSkill.delete({ where: { id } });
    res.status(200).json({ message: 'Skill deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPERIENCE CRUD
// ==========================================
export const addExperience = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { company, designation, department, description, technologies, achievements, startDate, endDate, isCurrent } = req.body;
    const exp = await prisma.experience.create({
      data: {
        userId,
        company,
        designation,
        department,
        description,
        technologies: Array.isArray(technologies) ? technologies : [],
        achievements,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: !!isCurrent,
      }
    });
    res.status(201).json(exp);
  } catch (error) {
    next(error);
  }
};

export const updateExperience = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { company, designation, department, description, technologies, achievements, startDate, endDate, isCurrent } = req.body;
    const exp = await prisma.experience.update({
      where: { id },
      data: {
        company: company !== undefined ? company : undefined,
        designation: designation !== undefined ? designation : undefined,
        department: department !== undefined ? department : undefined,
        description: description !== undefined ? description : undefined,
        technologies: Array.isArray(technologies) ? technologies : undefined,
        achievements: achievements !== undefined ? achievements : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        isCurrent: isCurrent !== undefined ? !!isCurrent : undefined,
      }
    });
    res.status(200).json(exp);
  } catch (error) {
    next(error);
  }
};

export const deleteExperience = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.experience.delete({ where: { id } });
    res.status(200).json({ message: 'Experience deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EDUCATION CRUD
// ==========================================
export const addEducation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { institution, degree, branch, startDate, endDate, grade } = req.body;
    const edu = await prisma.education.create({
      data: {
        userId,
        institution,
        degree,
        branch,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        grade,
      }
    });
    res.status(201).json(edu);
  } catch (error) {
    next(error);
  }
};

export const updateEducation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { institution, degree, branch, startDate, endDate, grade } = req.body;
    const edu = await prisma.education.update({
      where: { id },
      data: {
        institution: institution !== undefined ? institution : undefined,
        degree: degree !== undefined ? degree : undefined,
        branch: branch !== undefined ? branch : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        grade: grade !== undefined ? grade : undefined,
      }
    });
    res.status(200).json(edu);
  } catch (error) {
    next(error);
  }
};

export const deleteEducation = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.education.delete({ where: { id } });
    res.status(200).json({ message: 'Education deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CERTIFICATIONS CRUD
// ==========================================
export const addCertification = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { name, issuedBy, issueDate, expiryDate, credentialUrl, certificateUrl } = req.body;
    const cert = await prisma.certification.create({
      data: {
        userId,
        name,
        issuedBy,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        credentialUrl,
        certificateUrl,
      }
    });
    res.status(201).json(cert);
  } catch (error) {
    next(error);
  }
};

export const updateCertification = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, issuedBy, issueDate, expiryDate, credentialUrl, certificateUrl } = req.body;
    const cert = await prisma.certification.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        issuedBy: issuedBy !== undefined ? issuedBy : undefined,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
        credentialUrl: credentialUrl !== undefined ? credentialUrl : undefined,
        certificateUrl: certificateUrl !== undefined ? certificateUrl : undefined,
      }
    });
    res.status(200).json(cert);
  } catch (error) {
    next(error);
  }
};

export const deleteCertification = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.certification.delete({ where: { id } });
    res.status(200).json({ message: 'Certification deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ACTIVITY LOGS
// ==========================================
export const getUserActivityLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetUserId = (req.query.userId as string) || req.user?.id!;
    const { search, limit = '20', page = '1' } = req.query;

    const parsedLimit = parseInt(limit as string);
    const parsedPage = parseInt(page as string);
    const skip = (parsedPage - 1) * parsedLimit;

    const whereClause: any = { userId: targetUserId };

    if (search) {
      whereClause.OR = [
        { action: { contains: search as string, mode: 'insensitive' } },
        { details: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [activities, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: parsedLimit,
        skip: skip,
      }),
      prisma.activityLog.count({ where: whereClause }),
    ]);

    res.status(200).json({
      activities,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfileById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const {
      firstName,
      lastName,
      phone,
      designation,
      bio,
      location,
      skills,
      status,
      employeeId,
      coverUrl,
      joiningDate,
      employmentType,
      officeLocation,
      emergencyContact,
      birthday,
      timezone,
      workingHours,
      managerId,
      socialLinks,
      departmentId
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        phone: phone !== undefined ? phone : undefined,
        designation: designation !== undefined ? designation : undefined,
        bio: bio !== undefined ? bio : undefined,
        location: location !== undefined ? location : undefined,
        skills: skills !== undefined ? skills : undefined,
        status: status !== undefined ? status : undefined,
        employeeId: employeeId !== undefined ? employeeId : undefined,
        coverUrl: coverUrl !== undefined ? coverUrl : undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : (joiningDate === null ? null : undefined),
        employmentType: employmentType !== undefined ? employmentType : undefined,
        officeLocation: officeLocation !== undefined ? officeLocation : undefined,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : undefined,
        birthday: birthday ? new Date(birthday) : (birthday === null ? null : undefined),
        timezone: timezone !== undefined ? timezone : undefined,
        workingHours: workingHours !== undefined ? workingHours : undefined,
        managerId: managerId !== undefined ? managerId : undefined,
        socialLinks: socialLinks !== undefined ? socialLinks : undefined,
        departmentId: departmentId !== undefined ? (departmentId || null) : undefined,
      },
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    res.status(200).json({ message: 'Profile updated successfully.', user: safeUser });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatarById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    let fileUrl = '';
    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: 'image',
          folder: 'connecthub_avatars',
        });
        fileUrl = result.secure_url;
        fs.unlinkSync(file.path);
      } catch (err) {
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        fileUrl = `${serverUrl}/uploads/${file.filename}`;
      }
    } else {
      const serverUrl = `${req.protocol}://${req.get('host')}`;
      fileUrl = `${serverUrl}/uploads/${file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: fileUrl },
    });

    res.status(200).json({ message: 'Avatar uploaded successfully.', avatarUrl: fileUrl, user: updatedUser });
  } catch (error) {
    next(error);
  }
};

