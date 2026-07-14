import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking database state...');

  // Check if seeding is already done (e.g. from a previous container boot)
  const existingTeam = await prisma.team.findFirst();
  if (existingTeam) {
    console.log('Database already has data. Checking if custom roles need to be seeded...');
    const existingRoles = await prisma.customRole.findFirst();
    if (!existingRoles) {
      await seedCustomRolesAndPermissions();
    }
    console.log('Database check complete. Skipping full seeder.');
    return;
  }

  console.log('Seeding database with sample enterprise data...');

  // Hash passwords
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Departments
  const deptEngineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: {
      name: 'Engineering',
      description: 'Software development, design, and operations team.',
    },
  });

  const deptMarketing = await prisma.department.upsert({
    where: { name: 'Marketing' },
    update: {},
    create: {
      name: 'Marketing',
      description: 'Brand growth, advertisements, and client acquisition.',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: {
      name: 'Human Resources',
      description: 'Employee onboarding, relations, and talent acquisition.',
    },
  });

  console.log('Departments created.');

  // 2. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@connecthub.com' },
    update: {},
    create: {
      email: 'admin@connecthub.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Smith',
      role: 'ADMIN',
      designation: 'Principal IT Administrator',
      phone: '+15550100',
      location: 'New York HQ',
      isVerified: true,
      skills: ['Security', 'Cloud Operations', 'Database Admin'],
      settings: { create: {} },
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@connecthub.com' },
    update: {},
    create: {
      email: 'manager@connecthub.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Jones',
      role: 'MANAGER',
      designation: 'Engineering Manager',
      phone: '+15550200',
      location: 'San Francisco Office',
      isVerified: true,
      departmentId: deptEngineering.id,
      skills: ['Leadership', 'System Design', 'Agile Product Design'],
      settings: { create: {} },
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@connecthub.com' },
    update: {},
    create: {
      email: 'employee@connecthub.com',
      passwordHash,
      firstName: 'Charlie',
      lastName: 'Brown',
      role: 'EMPLOYEE',
      designation: 'Full Stack Engineer',
      phone: '+15550300',
      location: 'Remote',
      isVerified: true,
      departmentId: deptEngineering.id,
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
      settings: { create: {} },
    },
  });

  console.log('Users created.');

  await seedCustomRolesAndPermissions();

  // Assign Manager to Department
  await prisma.department.update({
    where: { id: deptEngineering.id },
    data: { managerId: manager.id },
  });

  // 3. Create Teams
  const teamAlpha = await prisma.team.create({
    data: {
      name: 'Team Alpha',
      description: 'Core product development team.',
      departmentId: deptEngineering.id,
      members: {
        create: [
          { userId: manager.id, role: 'LEADER' },
          { userId: employee.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('Teams created.');

  // 3.5 Create Project
  const projectLaunch = await prisma.project.create({
    data: {
      name: 'ConnectHub Launch',
      description: 'Main product design, development, and release lifecycle.',
      teamId: teamAlpha.id,
      status: 'IN_PROGRESS',
    },
  });

  console.log('Project created.');

  // 4. Create Group chats
  const groupGeneral = await prisma.group.create({
    data: {
      name: 'Engineering Lounge',
      description: 'Casual talk and technical discussions.',
      type: 'DEPARTMENT',
      createdById: manager.id,
      departmentId: deptEngineering.id,
      members: {
        create: [
          { userId: manager.id, role: 'ADMIN' },
          { userId: employee.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('Groups created.');

  // 5. Create Announcements
  await prisma.announcement.create({
    data: {
      title: 'Company Launch Event 2026',
      content: 'We are excited to host our annual launch event next month. Looking forward to see you all.',
      priority: 'HIGH',
      isPinned: true,
      createdById: admin.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  await prisma.announcement.create({
    data: {
      title: 'New Engineering Architecture Guidelines',
      content: 'We have updated our backend design guidelines to support NextJS 15. Please review the shared documents in the files folder.',
      priority: 'NORMAL',
      createdById: manager.id,
      departmentId: deptEngineering.id,
    },
  });

  console.log('Announcements created.');

  // 6. Create Tasks
  await prisma.task.create({
    data: {
      title: 'Design ConnectHub Database Schema',
      description: 'Establish normalized PostgreSQL schemas and relations for users, sessions, chats, and activities.',
      priority: 'URGENT',
      status: 'COMPLETED',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      assigneeId: employee.id,
      creatorId: manager.id,
      departmentId: deptEngineering.id,
      projectId: projectLaunch.id,
      progress: 100,
      history: {
        create: [
          { userId: manager.id, action: 'CREATED', details: 'Task initialized' },
          { userId: employee.id, action: 'UPDATED', details: 'Moved task to COMPLETED' },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      title: 'Build Socket.IO presence indicators',
      description: 'Implement backend tracker for active socket IDs and update user online/offline status updates dynamically.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      assigneeId: employee.id,
      creatorId: manager.id,
      departmentId: deptEngineering.id,
      projectId: projectLaunch.id,
      progress: 40,
    },
  });

  console.log('Tasks created.');

  console.log('Seeding completed successfully!');
}

async function seedCustomRolesAndPermissions() {
  console.log('Seeding default roles & permissions...');

  const adminRole = await prisma.customRole.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full system administration capabilities.',
    },
  });

  const employeeRole = await prisma.customRole.upsert({
    where: { name: 'Employee' },
    update: {},
    create: {
      name: 'Employee',
      description: 'Standard employee portal access.',
    },
  });

  const managerRole = await prisma.customRole.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Management portal access with employee permissions.',
      parentId: employeeRole.id,
    },
  });

  const MODULES = ['Dashboard', 'Users', 'Groups', 'Announcements', 'Tasks', 'Files', 'Messages', 'Notifications', 'Reports', 'Admin', 'Analytics', 'Settings'];
  const ACTIONS = ['Create', 'Read', 'Update', 'Delete', 'Export', 'Import', 'Approve', 'Assign', 'Archive', 'Publish'];

  const adminPermissions: any[] = [];
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      adminPermissions.push({ roleId: adminRole.id, module, action, isEnabled: true });
    }
  }

  const employeePermissions: any[] = [
    ...['Dashboard', 'Users', 'Groups', 'Announcements', 'Tasks', 'Files', 'Messages', 'Notifications', 'Settings'].flatMap(m => 
      ['Read'].map(a => ({ roleId: employeeRole.id, module: m, action: a, isEnabled: true }))
    ),
    ...['Create', 'Update', 'Delete'].map(a => ({ roleId: employeeRole.id, module: 'Messages', action: a, isEnabled: true })),
    { roleId: employeeRole.id, module: 'Tasks', action: 'Update', isEnabled: true },
    ...['Create', 'Delete'].map(a => ({ roleId: employeeRole.id, module: 'Files', action: a, isEnabled: true })),
    { roleId: employeeRole.id, module: 'Groups', action: 'Create', isEnabled: true },
  ];

  const managerPermissions: any[] = [
    ...['Tasks', 'Announcements', 'Groups', 'Files'].flatMap(m =>
      ['Create', 'Update', 'Delete', 'Assign', 'Publish'].map(a => ({ roleId: managerRole.id, module: m, action: a, isEnabled: true }))
    ),
  ];

  const allPermissions = [...adminPermissions, ...employeePermissions, ...managerPermissions];
  for (const perm of allPermissions) {
    await prisma.customPermission.upsert({
      where: {
        roleId_module_action: {
          roleId: perm.roleId,
          module: perm.module,
          action: perm.action,
        },
      },
      update: { isEnabled: perm.isEnabled },
      create: perm,
    });
  }

  // Link seed users if they exist
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@connecthub.com' } });
  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { customRoleId: adminRole.id },
    });
  }

  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@connecthub.com' } });
  if (managerUser) {
    await prisma.user.update({
      where: { id: managerUser.id },
      data: { customRoleId: managerRole.id },
    });
  }

  const employeeUser = await prisma.user.findUnique({ where: { email: 'employee@connecthub.com' } });
  if (employeeUser) {
    await prisma.user.update({
      where: { id: employeeUser.id },
      data: { customRoleId: employeeRole.id },
    });
  }

  console.log('Custom roles & permissions successfully seeded.');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
