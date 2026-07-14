'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  X, 
  Calendar, 
  User, 
  CheckSquare, 
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  History,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Briefcase,
  Layers,
  FolderOpen,
  List,
  Kanban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  Trash2,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';

export default function TasksPage() {
  const { user } = useAuthStore();
  const isWritePermitted = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'CALENDAR' | 'GANTT'>('KANBAN');

  // Task Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterAssignee, setFilterAssignee] = useState('ALL');

  // Project selection states
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Project settings edit states
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState('ACTIVE');

  // Task selection details states
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [commentValue, setCommentValue] = useState('');

  // Subtask & Time states
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [logTimeMinutes, setLogTimeMinutes] = useState<string>('');
  const [blockerTaskId, setBlockerTaskId] = useState<string>('');

  // Task creation states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Gantt collapsible states
  const [collapsedGanttSections, setCollapsedGanttSections] = useState<Record<string, boolean>>({});

  // 1. Fetch Projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // Auto-select first project disabled to show Projects list landing page first
  // useEffect(() => {
  //   if (projects && projects.length > 0 && !selectedProject) {
  //     setSelectedProject(projects[0]);
  //   }
  // }, [projects]);

  // 2. Fetch tasks filtered by selected project
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', selectedProject?.id],
    queryFn: () => {
      if (!selectedProject) return [];
      return api.getTasks(`projectId=${selectedProject.id}`);
    },
    enabled: !!selectedProject,
  });

  // Filter tasks based on Search input and dropdown status filters
  const filteredTasks = tasks?.filter((t: any) => {
    const matchesSearch = !searchQuery.trim() || 
                          t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'ALL' || t.assigneeId === filterAssignee;
    return matchesSearch && matchesPriority && matchesAssignee;
  }) || [];

  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      toast.error('No tasks available to export.');
      return;
    }
    const headers = ['Task Title', 'Assignee', 'Priority', 'Status', 'Due Date', 'Progress (%)', 'Description'];
    const rows = filteredTasks.map(t => [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.replace(/"/g, '""') : 'Unassigned'}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}"`,
      `"${t.progress}%"`,
      `"${(t.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedProject?.name || 'project'}_tasks_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Tasks exported successfully.');
  };

  // 3. Fetch colleagues for directory selection dropdowns
  const { data: colleagues } = useQuery({
    queryKey: ['directory-users-tasks'],
    queryFn: () => api.getDirectory('limit=100'),
  });

  // Project Creation Mutation
  const createProjectMutation = useMutation({
    mutationFn: (body: any) => api.createProject(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedProject(data);
      toast.success('Project workspace created.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create project.');
    }
  });

  const handleProjectCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProjectMutation.mutate({
      name: newProjectName,
      description: newProjectDesc,
    });
  };

  // Sync edit project form states
  useEffect(() => {
    if (selectedProject) {
      setEditProjectName(selectedProject.name || '');
      setEditProjectDesc(selectedProject.description || '');
      setEditProjectStatus(selectedProject.status || 'ACTIVE');
    }
  }, [selectedProject]);

  // Project Update Mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateProject(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProject(data);
      setProjectSettingsOpen(false);
      toast.success('Project settings updated.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update project settings.');
    }
  });

  // Project Delete Mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProject(null);
      setProjectSettingsOpen(false);
      toast.success('Project workspace deleted.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete project.');
    }
  });

  const handleProjectUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectName.trim() || !selectedProject) return;
    updateProjectMutation.mutate({
      id: selectedProject.id,
      body: {
        name: editProjectName,
        description: editProjectDesc,
        status: editProjectStatus,
      }
    });
  };

  const handleProjectDelete = async () => {
    if (!selectedProject) return;
    if (await confirm({
      title: 'Delete Project',
      message: `Are you absolutely sure you want to delete the project "${selectedProject.name}"? This will delete all its tasks forever.`,
      confirmText: 'Delete Project',
      type: 'danger'
    })) {
      deleteProjectMutation.mutate(selectedProject.id);
    }
  };

  // Open task detail panel
  const handleOpenTaskDetail = async (id: string) => {
    try {
      const task = await api.getTaskDetails(id);
      setSelectedTask(task);
    } catch (err) {
      toast.error('Failed to load task details.');
    }
  };

  // Task Update Mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateTask(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject?.id] });
      if (selectedTask && selectedTask.id === data.id) {
        handleOpenTaskDetail(data.id);
      }
      toast.success('Task status updated.');
    },
  });

  // Task Creation Mutation
  const createTaskMutation = useMutation({
    mutationFn: (body: any) => api.createTask(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject?.id] });
      setCreateModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('NORMAL');
      setTaskAssigneeId('');
      setTaskDueDate('');
      toast.success('Task assigned successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create task.');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskAssigneeId) return;

    createTaskMutation.mutate({
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      assigneeId: taskAssigneeId,
      dueDate: taskDueDate || null,
      projectId: selectedProject.id,
      status: 'TODO',
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateTaskMutation.mutate({ id, body: { status: newStatus } });
  };

  // Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      handleStatusChange(id, status);
    }
  };

  // Add Comment
  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentValue.trim() || !selectedTask) return;

    try {
      await api.addTaskComment(selectedTask.id, commentValue);
      setCommentValue('');
      handleOpenTaskDetail(selectedTask.id);
    } catch (err) {
      toast.error('Failed to post comment.');
    }
  };

  // Subtask management
  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !selectedTask) return;

    try {
      await api.createSubtask(selectedTask.id, newSubtaskTitle);
      setNewSubtaskTitle('');
      handleOpenTaskDetail(selectedTask.id);
      refetchTasks();
    } catch (err) {
      toast.error('Failed to create checklist item.');
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      await api.toggleSubtask(subtaskId);
      handleOpenTaskDetail(selectedTask.id);
      refetchTasks();
    } catch (err) {
      toast.error('Failed to update checklist item.');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await api.deleteSubtask(subtaskId);
      handleOpenTaskDetail(selectedTask.id);
      refetchTasks();
    } catch (err) {
      toast.error('Failed to delete checklist item.');
    }
  };

  // Time logging
  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseInt(logTimeMinutes);
    if (isNaN(min) || min <= 0 || !selectedTask) {
      toast.error('Please enter a valid number of logged minutes.');
      return;
    }

    try {
      await api.logTaskTime(selectedTask.id, min);
      setLogTimeMinutes('');
      handleOpenTaskDetail(selectedTask.id);
      refetchTasks();
      toast.success('Time logged.');
    } catch (err) {
      toast.error('Failed to log time.');
    }
  };

  // Dependency Management
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerTaskId || !selectedTask) return;

    try {
      await api.addTaskDependency(selectedTask.id, blockerTaskId);
      setBlockerTaskId('');
      handleOpenTaskDetail(selectedTask.id);
      refetchTasks();
      toast.success('Blocker dependency linked.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to link dependency.');
    }
  };

  const handleRemoveDependency = async (blockedTaskId: string) => {
    if (!selectedTask) return;
    try {
      await api.removeTaskDependency(selectedTask.id, blockedTaskId);
      handleOpenTaskDetail(selectedTask.id);
      refetchTasks();
      toast.success('Blocker link removed.');
    } catch (err) {
      toast.error('Failed to remove dependency.');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'HIGH': return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
      case 'NORMAL': return 'text-primary bg-primary/5 border-primary/20';
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const isBlocked = (task: any) => {
    return task.dependencies?.some((dep: any) => dep.dependsOnTask?.status !== 'COMPLETED');
  };

  // Calendar cell computations
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();

    const days: any[] = [];
    // Pad previous days
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Real days
    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Compile Gantt Axis columns (days of the current month)
  const ganttDaysCount = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const ganttDaysArray = Array.from({ length: ganttDaysCount }, (_, i) => i + 1);

  const columns = [
    { title: 'To Do', status: 'TODO', color: 'border-t-slate-400 bg-slate-50/40 dark:bg-slate-900/10' },
    { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-t-primary bg-primary/5' },
    { title: 'In Review', status: 'REVIEW', color: 'border-t-orange-400 bg-orange-50/10' },
    { title: 'Completed', status: 'COMPLETED', color: 'border-t-green-400 bg-green-50/10' },
  ];

  if (!selectedProject) {
    return (
      <div className="space-y-8 animate-fade-in text-left">
        {/* Projects Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <Layers className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-black tracking-tight text-slate-850 dark:text-slate-100">Projects Directory</h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-normal">
              Select a workspace from the list below to access its Kanban tasks, month calendar agendas, and Gantt charts.
            </p>
          </div>
          {isWritePermitted && (
            <button
              onClick={() => setProjectModalOpen(true)}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>

        {/* Projects Grid */}
        {loadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="border rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-900/10 space-y-4 animate-pulse-slow">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border rounded-3xl bg-slate-50/10 dark:bg-slate-900/5 border-dashed">
            <div className="p-4 bg-primary/10 rounded-full text-primary">
              <Briefcase className="h-10 w-10 stroke-1" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No projects created yet</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-normal">Get started by creating your first project workspace directory.</p>
            </div>
            <button
              onClick={() => setProjectModalOpen(true)}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md"
            >
              Initialize Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map((proj: any) => {
              const totalTasks = proj.tasks?.length || 0;
              const completedTasks = proj.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;
              const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              return (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className="group border rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-100 dark:bg-slate-800 group-hover:bg-primary transition-all" />
                  
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 group-hover:text-primary transition-all">{proj.name}</h4>
                      <span className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-450 uppercase tracking-wide">
                        {proj.status || 'Active'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold">
                      <span>Tasks: {completedTasks}/{totalTasks} ({progressPercentage}%)</span>
                      <span className="text-primary opacity-0 group-hover:opacity-100 transition-all flex items-center space-x-0.5">
                        <span>Open Workspace</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Project Creation Modal inside the landing page */}
        {projectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative">
              <button onClick={() => setProjectModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
                <X className="h-5 w-5" />
              </button>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Create Project Workspace</h3>
                <p className="text-xs text-slate-400">Initialize a new project pipeline board.</p>
              </div>
              <form onSubmit={handleProjectCreateSubmit} className="space-y-4 text-xs font-semibold text-left">
                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mobile Application"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Description</label>
                  <textarea
                    placeholder="Brief scope summary..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                  Create Workspace
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub header toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Workspace select */}
        <div className="flex items-center space-x-3 text-left">
          <button
            onClick={() => setSelectedProject(null)}
            className="p-1.5 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-350 flex items-center space-x-1 transition-all mr-1.5 shrink-0 font-bold text-[10px]"
            title="Back to Projects Directory"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider pr-0.5">Projects</span>
          </button>
          <Briefcase className="h-6 w-6 text-primary shrink-0" />
          <div className="relative group">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const proj = projects?.find((p: any) => p.id === e.target.value);
                if (proj) setSelectedProject(proj);
              }}
              className="bg-transparent text-lg font-black focus:outline-none pr-6 cursor-pointer border-b border-dashed border-slate-400"
            >
              {loadingProjects ? (
                <option>Loading workspaces...</option>
              ) : projects?.length === 0 ? (
                <option>No projects initialized</option>
              ) : (
                projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              )}
            </select>
          </div>
          {isWritePermitted && (
            <>
              <button
                onClick={() => setProjectModalOpen(true)}
                className="p-1 border border-primary/20 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-all ml-1.5 shrink-0"
                title="Create Project Workspace"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setProjectSettingsOpen(true)}
                className="p-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-lg hover:bg-slate-100 transition-all ml-1.5 shrink-0"
                title="Project Workspace Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* View Mode controls & Add Task */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border rounded-xl overflow-hidden bg-white dark:bg-slate-900 text-xs font-bold shadow-xs">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-2 flex items-center space-x-1.5 transition-all ${
                viewMode === 'KANBAN' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-2 flex items-center space-x-1.5 transition-all ${
                viewMode === 'LIST' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Flat List</span>
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3 py-2 flex items-center space-x-1.5 transition-all ${
                viewMode === 'CALENDAR' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('GANTT')}
              className={`px-3 py-2 flex items-center space-x-1.5 transition-all ${
                viewMode === 'GANTT' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Gantt Schedule</span>
            </button>
          </div>

          {selectedProject && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Quick Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        {[
          { label: 'Total Tasks', value: filteredTasks.length, icon: '📋', color: 'bg-blue-50/50 dark:bg-blue-950/15 text-blue-600 border-blue-100 dark:border-blue-900/30' },
          { label: 'In Progress', value: filteredTasks.filter((t: any) => t.status === 'IN_PROGRESS').length, icon: '⚡', color: 'bg-primary/5 text-primary border-primary/10' },
          { label: 'Overdue Tasks', value: filteredTasks.filter((t: any) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date()).length, icon: '⚠️', color: 'bg-red-50/50 dark:bg-red-950/15 text-red-500 border-red-100 dark:border-red-900/30' },
          { label: 'Logged Hours', value: `${(filteredTasks.reduce((sum, t) => sum + (t.timeLogs?.reduce((s: number, l: any) => s + l.minutes, 0) || 0), 0) / 60).toFixed(1)} hrs`, icon: '⏱️', color: 'bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-500 border-emerald-100 dark:border-emerald-900/30' }
        ].map((card, idx) => (
          <div key={idx} className={`p-4 border rounded-2xl flex items-center justify-between shadow-2xs ${card.color}`}>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-450">{card.label}</span>
              <p className="text-lg font-black tracking-tight leading-none">{card.value}</p>
            </div>
            <span className="text-xl leading-none">{card.icon}</span>
          </div>
        ))}
      </div>

      {/* Task Search, Filters and Export Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-2xs text-xs font-bold text-slate-700 dark:text-slate-350">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search tasks by title/desc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            />
            {/* Search Magnifier SVG Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.603 10.603z" />
            </svg>
          </div>

          {/* Priority Filter select */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Assignee Filter select */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-slate-400 uppercase">Assignee:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-2.5 py-1.5 border rounded-lg bg-slate-50 dark:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">All Colleagues</option>
              {colleagues?.users?.map((col: any) => (
                <option key={col.id} value={col.id}>
                  {col.firstName} {col.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action buttons (CSV Export & Clear Filters) */}
        <div className="flex items-center space-x-2 shrink-0">
          {(searchQuery || filterPriority !== 'ALL' || filterAssignee !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterPriority('ALL');
                setFilterAssignee('ALL');
              }}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition-all font-semibold"
            >
              Clear Filters
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 rounded-xl flex items-center space-x-1.5 transition-all text-xs font-bold"
          >
            {/* Download Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* VIEW: KANBAN BOARD */}
      {viewMode === 'KANBAN' && (
        loadingTasks ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-14rem)] overflow-y-auto pb-6">
            {columns.map((col) => (
              <div 
                key={col.status} 
                className={`flex flex-col rounded-2xl border border-t-4 p-4 shadow-sm space-y-4 animate-pulse-slow ${col.color}`}
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
                  <span className="h-5 w-5 bg-slate-200/50 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-extrabold text-slate-400">0</span>
                </div>
                <div className="space-y-3">
                  {[1, 2].map((n) => (
                    <div key={n} className="bg-white dark:bg-slate-900 border rounded-xl p-4 space-y-3 shadow-sm">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-14rem)] overflow-y-auto pb-6">
            {columns.map((col) => {
              const colTasks = filteredTasks.filter((t: any) => t.status === col.status);
              return (
                <div 
                  key={col.status} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, col.status)}
                  className={`flex flex-col rounded-2xl border border-t-4 p-4 shadow-sm space-y-4 transition-colors duration-200 ${col.color} animate-fade-in`}
                >
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
                  <span className="h-5 min-w-5 bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-330 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px]">
                  {colTasks.map((task: any) => {
                    const blocked = isBlocked(task);
                    const completedSubtasks = task.subtasks?.filter((s: any) => s.isCompleted).length || 0;
                    const totalSubtasks = task.subtasks?.length || 0;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => handleOpenTaskDetail(task.id)}
                        className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-3 group relative"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                              {task.priority}
                            </span>
                            <div className="h-6 w-6 bg-slate-100 dark:bg-slate-850 rounded-full flex items-center justify-center font-bold text-[10px] uppercase text-slate-500 overflow-hidden border">
                              {task.assignee.firstName[0]}{task.assignee.lastName[0]}
                            </div>
                          </div>

                          {/* Blocker alert badge */}
                          {blocked && (
                            <div className="flex items-center space-x-1 text-[9px] text-red-500 font-extrabold uppercase bg-red-50 dark:bg-red-950/20 border border-red-200 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Blocked</span>
                            </div>
                          )}

                          {/* Overdue alert badge */}
                          {task.status !== 'COMPLETED' && task.dueDate && new Date(task.dueDate) < new Date() && (
                            <div className="flex items-center space-x-1 text-[9px] text-red-500 font-extrabold uppercase bg-red-50 dark:bg-red-950/20 border border-red-200 px-1.5 py-0.5 rounded w-max">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>Overdue</span>
                            </div>
                          )}

                          <h4 className="font-bold text-xs leading-snug group-hover:text-primary transition-all line-clamp-2">
                            {task.title}
                          </h4>
                        </div>

                        {/* Subtasks metrics */}
                        {totalSubtasks > 0 && (
                          <p className="text-[9px] text-slate-400 font-bold flex items-center space-x-1">
                            <CheckSquare className="h-3 w-3 text-emerald-500" />
                            <span>{completedSubtasks} / {totalSubtasks} Checklist Items</span>
                          </p>
                        )}

                        {/* Milestone progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-bold text-slate-450">
                            <span>Milestone Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Limit'}</span>
                          </span>
                          <select
                            onClick={(e) => e.stopPropagation()}
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="bg-transparent border-none text-slate-400 font-bold focus:outline-none hover:text-primary"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">Progress</option>
                            <option value="REVIEW">Review</option>
                            <option value="COMPLETED">Done</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-[10px] text-slate-400 border border-dashed rounded-xl">
                      Drag tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* VIEW: FLAT LIST */}
      {viewMode === 'LIST' && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 uppercase font-extrabold text-[9px] tracking-wider">
                <th className="p-4">Task Name</th>
                <th className="p-4">Assignee</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Blockers</th>
                <th className="p-4">Checklist</th>
                <th className="p-4">Logged Work</th>
                <th className="p-4">Milestone</th>
              </tr>
            </thead>
            <tbody>
              {loadingTasks ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="animate-pulse-slow border-b">
                    <td className="p-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" /></td>
                    <td className="p-4"><div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-full" /></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" /></td>
                    <td className="p-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                    <td className="p-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-10" /></td>
                    <td className="p-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                    <td className="p-4"><div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                    <td className="p-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
                  </tr>
                ))
              ) : filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <CheckSquare className="h-10 w-10 text-slate-350 dark:text-slate-700 stroke-1" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No matching tasks found</p>
                      <p className="text-[10px] text-muted-foreground max-w-xs mx-auto leading-normal">Adjust search queries or filters to explore alternative tasks.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task: any) => {
                  const blocked = isBlocked(task);
                  const totalLogged = task.timeLogs?.reduce((sum: number, l: any) => sum + l.minutes, 0) || 0;
                  const loggedHours = (totalLogged / 60).toFixed(1);

                  return (
                    <tr
                      key={task.id}
                      onClick={() => handleOpenTaskDetail(task.id)}
                      className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-bold max-w-[200px] truncate">{task.title}</td>
                      <td className="p-4 font-medium">{task.assignee.firstName} {task.assignee.lastName}</td>
                      <td className="p-4">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="p-4 text-slate-450">
                        {task.dueDate ? (
                          <span className={task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date() ? 'text-red-500 font-bold flex items-center space-x-1' : ''}>
                            {task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date() && <AlertTriangle className="h-3 w-3 shrink-0" />}
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-4">
                        {blocked ? (
                          <span className="text-[9px] font-extrabold text-red-500 uppercase bg-red-50 px-2 py-0.5 border border-red-200 rounded">Blocked</span>
                        ) : (
                          <span className="text-[9px] text-slate-400">Clear</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-400 font-bold">
                        {task.subtasks?.filter((s: any) => s.isCompleted).length || 0} / {task.subtasks?.length || 0}
                      </td>
                      <td className="p-4 font-semibold text-slate-500">{loggedHours} hr(s)</td>
                      <td className="p-4 w-[160px]">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${task.progress}%` }} />
                          </div>
                          <span className="font-bold text-[9px] text-slate-400">{task.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW: MONTH CALENDAR */}
      {viewMode === 'CALENDAR' && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-black text-sm uppercase tracking-wide">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center space-x-1">
              <button onClick={prevMonth} className="p-1.5 border rounded-lg hover:bg-slate-50 text-slate-500">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={nextMonth} className="p-1.5 border rounded-lg hover:bg-slate-50 text-slate-500">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-extrabold uppercase text-slate-400 pb-2">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2 auto-rows-[minmax(90px,auto)]">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={idx} className="bg-slate-50/20 dark:bg-slate-950/20 rounded-xl" />;

              const dayStr = day.toDateString();
              const dayTasks = filteredTasks.filter((t: any) => t.dueDate && new Date(t.dueDate).toDateString() === dayStr);

              return (
                <div key={idx} className="border p-2 rounded-xl bg-slate-50/30 dark:bg-slate-800/10 flex flex-col space-y-1.5">
                  <span className="font-bold text-[10px] text-slate-400">{day.getDate()}</span>
                  <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px]">
                    {dayTasks.map((t: any) => (
                      <div
                        key={t.id}
                        onClick={() => handleOpenTaskDetail(t.id)}
                        className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold truncate cursor-pointer hover:bg-primary/20 transition-all"
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: GANTT TIMELINE SCHEDULE */}
      {viewMode === 'GANTT' && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-sm overflow-x-auto p-4 space-y-4 animate-fade-in">
          {/* Timeline header */}
          <div className="flex items-center justify-between border-b pb-4 shrink-0 min-w-[900px]">
            <div className="space-y-1 text-left">
              <h3 className="font-black text-sm uppercase tracking-wide text-slate-850 dark:text-slate-200">
                Gantt Project Timeline Schedule
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Active Month: {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <button onClick={prevMonth} className="p-1.5 border rounded-lg hover:bg-slate-50 text-slate-500">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={nextMonth} className="p-1.5 border rounded-lg hover:bg-slate-50 text-slate-500">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-w-[950px] space-y-4">
            {/* Header X-Axis days grid */}
            <div className="flex items-center border-b pb-2 shrink-0">
              <div className="w-60 text-[10px] font-extrabold uppercase text-slate-400 shrink-0">Task Name & Assignee</div>
              <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${ganttDaysCount}, minmax(40px, 1fr))` }}>
                {ganttDaysArray.map((dayNum) => (
                  <span key={dayNum} className="text-[9px] text-center text-slate-400 font-black">{dayNum}</span>
                ))}
              </div>
            </div>

            {/* Accordion groups by status */}
            {loadingTasks ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center space-x-4 animate-pulse-slow">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4 shrink-0" />
                    <div className="flex-grow h-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              [
                { title: 'To Do', status: 'TODO', color: 'border-l-slate-400 bg-slate-100/20 text-slate-550' },
                { title: 'In Progress', status: 'IN_PROGRESS', color: 'border-l-primary bg-primary/5 text-primary' },
                { title: 'In Review', status: 'REVIEW', color: 'border-l-orange-400 bg-orange-50/5 text-orange-500' },
                { title: 'Completed', status: 'COMPLETED', color: 'border-l-green-400 bg-green-50/5 text-green-500' },
              ].map((grp) => {
                const groupTasks = filteredTasks.filter((t: any) => t.status === grp.status);
                const isCollapsed = collapsedGanttSections[grp.status] || false;

                return (
                  <div key={grp.status} className="space-y-1.5 border rounded-xl overflow-hidden shadow-xs">
                    {/* Accordion Header */}
                    <div
                      onClick={() => setCollapsedGanttSections(prev => ({ ...prev, [grp.status]: !isCollapsed }))}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/10 border-b select-none transition-all ${grp.color}`}
                    >
                      <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider">
                        <ChevronRight className={`h-4 w-4 transform transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
                        <span>{grp.title}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[9px] font-extrabold">{groupTasks.length}</span>
                      </div>
                    </div>

                    {/* Group tasks timelines */}
                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {groupTasks.length === 0 ? (
                          <div className="p-4 text-center text-[10px] text-slate-400 italic">No tasks in this stage</div>
                        ) : (
                          groupTasks.map((t: any) => {
                            const created = new Date(t.createdAt);
                            const due = t.dueDate ? new Date(t.dueDate) : created;
                            const year = currentDate.getFullYear();
                            const month = currentDate.getMonth();

                            let startDay = 1;
                            if (created.getFullYear() === year && created.getMonth() === month) {
                              startDay = created.getDate();
                            }

                            let endDay = ganttDaysCount;
                            if (due.getFullYear() === year && due.getMonth() === month) {
                              endDay = due.getDate();
                            }

                            const span = Math.max(1, endDay - startDay + 1);

                            // Priority Color styles
                            const getGanttBarColors = (priority: string) => {
                              switch (priority) {
                                  case 'LOW':
                                    return 'bg-slate-500/15 border-slate-500/30 text-slate-600 dark:text-slate-400';
                                  case 'HIGH':
                                    return 'bg-orange-500/15 border-orange-500/30 text-orange-650 dark:text-orange-400';
                                  case 'URGENT':
                                    return 'bg-red-500/15 border-red-500/30 text-red-650 dark:text-red-400';
                                  default: // NORMAL
                                    return 'bg-primary/15 border-primary/30 text-primary dark:text-primary';
                              }
                            };

                            return (
                              <div key={t.id} className="flex items-center hover:bg-slate-50/30 dark:hover:bg-slate-800/5 shrink-0 transition-colors">
                                {/* Task name & Assignee bubble */}
                                <div className="w-60 px-4 py-3 flex items-center space-x-3 shrink-0 text-left border-r dark:border-slate-800/50 h-full min-h-[50px]">
                                  <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[9px] uppercase text-slate-500 border overflow-hidden shrink-0">
                                    {t.assignee?.firstName[0]}{t.assignee?.lastName[0]}
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      onClick={() => handleOpenTaskDetail(t.id)}
                                      className="text-xs font-bold truncate text-slate-700 dark:text-slate-350 cursor-pointer hover:text-primary hover:underline leading-tight"
                                      title={t.title}
                                    >
                                      {t.title}
                                    </p>
                                    <p className="text-[9px] text-slate-400 leading-none mt-1">Assignee: {t.assignee?.firstName} {t.assignee?.lastName}</p>
                                  </div>
                                </div>

                                {/* Timeline days grid with overlay */}
                                <div className="flex-1 grid relative h-full min-h-[50px]" style={{ gridTemplateColumns: `repeat(${ganttDaysCount}, minmax(40px, 1fr))` }}>
                                  {/* Grid columns background with weekend shading */}
                                  {ganttDaysArray.map((dayNum) => {
                                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    return (
                                      <div key={dayNum} className={`border-r border-slate-100 dark:border-slate-800/40 h-full min-h-[50px] ${isWeekend ? 'bg-slate-50/40 dark:bg-slate-950/20' : ''}`} />
                                    );
                                  })}

                                  {/* Today vertical line highlight */}
                                  {currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() && (
                                    <div
                                      className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-20 pointer-events-none"
                                      style={{
                                        gridColumnStart: new Date().getDate(),
                                        gridColumnEnd: new Date().getDate() + 1,
                                        left: '50%',
                                      }}
                                      title="Today"
                                    />
                                  )}

                                  {/* Gantt timeline bar */}
                                  <div
                                    onClick={() => handleOpenTaskDetail(t.id)}
                                    className={`absolute top-2.5 bottom-2.5 rounded-lg flex items-center justify-center cursor-pointer transition-all border font-bold z-10 text-[9px] shadow-2xs hover:scale-[1.01] ${getGanttBarColors(t.priority)}`}
                                    style={{
                                      gridColumnStart: startDay,
                                      gridColumnEnd: startDay + span,
                                      left: '2px',
                                      right: '2px',
                                    }}
                                    title={`${t.title} (${t.progress}%)`}
                                  >
                                    <span className="truncate px-2">{t.progress}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. Project Creation Modal */}
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative">
            <button onClick={() => setProjectModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Create Project Workspace</h3>
              <p className="text-xs text-slate-400">Initialize a new project pipeline board.</p>
            </div>
            <form onSubmit={handleProjectCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Application"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description</label>
                <textarea
                  placeholder="Specify core scope of the project..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <button type="submit" disabled={createProjectMutation.isPending} className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-md">
                Initialize Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Task Creation Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-lg space-y-5 shadow-2xl relative">
            <button onClick={() => setCreateModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Assign New Task</h3>
              <p className="text-xs text-slate-400">Initialize task for: <span className="font-bold text-primary">{selectedProject?.name}</span></p>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Draft UI Wireframes"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description</label>
                <textarea
                  placeholder="Specify core scopes and requirements of task..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Assigned Employee</label>
                  <select
                    required
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="">-- Choose Employee --</option>
                    {colleagues?.users?.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 uppercase text-[10px]">Task Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-md">
                Allocate Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Task Details Dialog Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setSelectedTask(null)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>

            {/* Header info */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(selectedTask.priority)}`}>
                  {selectedTask.priority}
                </span>
                {isBlocked(selectedTask) && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider text-red-500 bg-red-50">Blocked</span>
                )}
              </div>
              <h3 className="font-extrabold text-xl leading-snug">{selectedTask.title}</h3>
              <p className="text-xs text-muted-foreground">
                Task assigned to <span className="font-bold text-foreground">{selectedTask.assignee.firstName} {selectedTask.assignee.lastName}</span>
              </p>
            </div>

            {/* Main grid split: Details / Subtasks / Logging */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t">
              {/* Left Column: Scope & Comments */}
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs uppercase text-slate-400">Task Scope</h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border">
                    {selectedTask.description || 'No description provided.'}
                  </p>
                </div>

                {/* Subtask Checklist */}
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-bold text-xs uppercase text-slate-450 flex items-center space-x-1.5">
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    <span>Checklist Items</span>
                  </h4>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {selectedTask.subtasks?.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No checklist items created.</p>
                    ) : (
                      selectedTask.subtasks?.map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all text-xs">
                          <div className="flex items-center space-x-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={sub.isCompleted}
                              onChange={() => handleToggleSubtask(sub.id)}
                              className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            <span className={`truncate font-semibold ${sub.isCompleted ? 'line-through text-slate-400' : ''}`}>{sub.title}</span>
                          </div>
                          <button onClick={() => handleDeleteSubtask(sub.id)} className="p-1 hover:bg-red-50 text-red-500 rounded">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddSubtask} className="flex space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="Add checklist item..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold shadow">
                      Add
                    </button>
                  </form>
                </div>

                {/* Discussion */}
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
                    <MessageSquare className="h-4 w-4 text-indigo-500" />
                    <span>Discussion ({selectedTask.comments?.length || 0})</span>
                  </h4>

                  <div className="max-h-[120px] overflow-y-auto space-y-2.5 pr-2">
                    {selectedTask.comments?.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No comments posted yet.</p>
                    ) : (
                      selectedTask.comments?.map((comment: any) => (
                        <div key={comment.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border rounded-xl text-[10px] space-y-1">
                          <div className="flex justify-between font-bold text-slate-450">
                            <span>{comment.user.firstName} {comment.user.lastName}</span>
                            <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 leading-normal">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddCommentSubmit} className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Ask or comment..."
                      value={commentValue}
                      onChange={(e) => setCommentValue(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
                    />
                    <button type="submit" className="px-3 bg-primary text-white rounded-xl text-xs font-bold shadow">
                      Post
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Time Logs & Dependency Links */}
              <div className="space-y-6 border-l pl-6">
                {/* Time log tracker */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
                    <Play className="h-4 w-4 text-emerald-500" />
                    <span>Work Time Logs</span>
                  </h4>

                  {/* Log time form */}
                  <form onSubmit={handleLogTime} className="flex space-x-2">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Logged Minutes..."
                      value={logTimeMinutes}
                      onChange={(e) => setLogTimeMinutes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
                    />
                    <button type="submit" className="px-3 bg-primary text-white rounded-xl text-xs font-bold shadow shrink-0">
                      Log minutes
                    </button>
                  </form>

                  {/* Logs list */}
                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                    {selectedTask.timeLogs?.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No time logs logged.</p>
                    ) : (
                      selectedTask.timeLogs?.map((log: any) => (
                        <div key={log.id} className="p-2 border rounded-lg bg-slate-50/50 dark:bg-slate-800/10 flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-slate-600 dark:text-slate-350">{log.user.firstName}: {log.minutes} min(s)</span>
                          <span className="text-[9px] text-slate-400">{new Date(log.loggedAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dependencies Link blocker */}
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center space-x-1.5">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <span>Dependencies Blockers</span>
                  </h4>

                  <form onSubmit={handleAddDependency} className="space-y-2">
                    <select
                      required
                      value={blockerTaskId}
                      onChange={(e) => setBlockerTaskId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none"
                    >
                      <option value="">-- Select Blocker Task --</option>
                      {tasks
                        ?.filter((t: any) => t.id !== selectedTask.id)
                        ?.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                    <button type="submit" className="w-full py-1.5 bg-primary text-white rounded-xl text-xs font-bold shadow">
                      Link Blocker Task
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                    {selectedTask.dependencies?.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">Clear. No dependencies.</p>
                    ) : (
                      selectedTask.dependencies?.map((dep: any) => (
                        <div key={dep.dependsOnTaskId} className="p-2 border border-orange-200 bg-orange-50/10 rounded-xl flex items-center justify-between text-[10px]">
                          <span className="font-bold text-orange-600 truncate max-w-[140px]">{dep.dependsOnTask?.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDependency(dep.dependsOnTaskId)}
                            className="p-1 hover:bg-slate-100 rounded text-red-500 font-bold"
                          >
                            Unlink
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Workspace Settings Modal */}
      {projectSettingsOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left">
            <button onClick={() => setProjectSettingsOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-850 dark:text-slate-200">Project Workspace Settings</h3>
              <p className="text-xs text-slate-400">Modify metadata or remove this workspace pipeline.</p>
            </div>
            
            <form onSubmit={handleProjectUpdateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Project Name</label>
                <input
                  type="text"
                  required
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description</label>
                <textarea
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Project Status</label>
                <select
                  value={editProjectStatus}
                  onChange={(e) => setEditProjectStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={handleProjectDelete}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-550 dark:bg-red-950/20 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/30 font-bold rounded-xl transition-all"
                >
                  Delete Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
