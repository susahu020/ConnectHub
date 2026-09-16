'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { usePermissions } from '../../../hooks/usePermissions';
import { useSocket } from '../../../hooks/useSocket';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmContext';
import { getDaysInMonth } from '../../../components/tasks/taskHelpers';
import { ProjectsLanding } from '../../../components/tasks/ProjectsLanding';
import { WorkspaceToolbar } from '../../../components/tasks/WorkspaceToolbar';
import { MetricsBar } from '../../../components/tasks/MetricsBar';
import { FilterToolbar } from '../../../components/tasks/FilterToolbar';
import { KanbanView } from '../../../components/tasks/views/KanbanView';
import { ListView } from '../../../components/tasks/views/ListView';
import { CalendarView } from '../../../components/tasks/views/CalendarView';
import { TimelineView } from '../../../components/tasks/views/TimelineView';
import { GanttView } from '../../../components/tasks/views/GanttView';
import { CreateProjectModal } from '../../../components/tasks/CreateProjectModal';
import { CreateTaskModal } from '../../../components/tasks/CreateTaskModal';
import { ProjectSettingsModal } from '../../../components/tasks/ProjectSettingsModal';
import { TaskDetailDrawer } from '../../../components/tasks/drawer/TaskDetailDrawer';

export default function TasksPage() {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  // Drives visibility of "New Task" / "New Project" — matches what the
  // backend's checkPermission('Tasks', 'Create') middleware will actually
  // allow (see tasks.routes.ts), instead of a hardcoded ADMIN/MANAGER check
  // that stays correct only for the seed defaults and silently drifts out
  // of sync the moment an Admin customizes a role's Tasks:Create grant.
  const { can } = usePermissions();
  const isWritePermitted = can('Tasks', 'Create');
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'CALENDAR' | 'GANTT' | 'TIMELINE'>('KANBAN');

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

  // Upgraded task metadata states
  const [taskEstimatedHours, setTaskEstimatedHours] = useState('');
  const [taskLabelsInput, setTaskLabelsInput] = useState('');
  const [taskSprintName, setTaskSprintName] = useState('');
  const [taskMilestoneName, setTaskMilestoneName] = useState('');
  const [taskIsRecurring, setTaskIsRecurring] = useState(false);
  const [taskRecurrenceInterval, setTaskRecurrenceInterval] = useState('daily');
  const [taskWatcherIds, setTaskWatcherIds] = useState<string[]>([]);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());

  // Gantt collapsible states
  const [collapsedGanttSections, setCollapsedGanttSections] = useState<Record<string, boolean>>({});

  // 1. Fetch Projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects(),
  });

  // 2. Fetch tasks filtered by selected project
  const { data: tasks, isLoading: loadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', selectedProject?.id],
    queryFn: () => {
      if (!selectedProject) return [];
      return api.getTasks(`projectId=${selectedProject.id}`);
    },
    enabled: !!selectedProject,
  });

  // "My Tasks": a cross-project queue of everything assigned to the current
  // user, since the Kanban/List/etc. views above are otherwise always
  // scoped to one project at a time — there was previously no way to see
  // your own tasks across the whole workspace without opening every
  // project individually. Reuses the same getTasks endpoint (already
  // supports assigneeId filtering with no projectId) and the same
  // Kanban/List/Calendar/Gantt/Timeline view components below.
  const [myTasksMode, setMyTasksMode] = useState(false);
  const { data: myTasks, isLoading: loadingMyTasks } = useQuery({
    queryKey: ['tasks', 'mine', user?.id],
    queryFn: () => api.getTasks(`assigneeId=${user?.id}`),
    enabled: myTasksMode && !!user?.id,
  });

  const activeTasks = myTasksMode ? myTasks : tasks;
  const activeLoadingTasks = myTasksMode ? loadingMyTasks : loadingTasks;

  // Filter tasks based on Search input and dropdown status filters
  const filteredTasks = activeTasks?.filter((t: any) => {
    const matchesSearch =
      !searchQuery.trim() ||
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
    const rows = filteredTasks.map((t: any) => [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.replace(/"/g, '""') : 'Unassigned'}"`,
      `"${t.priority}"`,
      `"${t.status}"`,
      `"${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}"`,
      `"${t.progress}%"`,
      `"${(t.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
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
    },
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
    },
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
    },
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
      },
    });
  };

  const handleProjectDelete = async () => {
    if (!selectedProject) return;
    if (
      await confirm({
        title: 'Delete Project',
        message: `Are you absolutely sure you want to delete the project "${selectedProject.name}"? This will delete all its tasks forever.`,
        confirmText: 'Delete Project',
        type: 'danger',
      })
    ) {
      deleteProjectMutation.mutate(selectedProject.id);
    }
  };

  // Open task detail panel
  const handleOpenTaskDetail = async (id: string) => {
    try {
      const task = await api.getTaskDetails(id);
      setSelectedTask(task);
    } catch (err: any) {
      // 403 = task exists but this user isn't its assignee/creator/watcher/
      // project teammate (or, for managers, in-department) — distinct from
      // a generic load failure so people aren't left thinking it's a bug.
      if (err?.status === 403) {
        toast.error("You don't have access to this task. Only the assignee, creator, watchers, and project teammates can view it.");
      } else if (err?.status === 404) {
        toast.error('This task no longer exists.');
      } else {
        toast.error('Failed to load task details.');
      }
    }
  };

  // Keep whatever's currently open live, without a refresh, when ANOTHER user
  // changes something in this project (a task moved, a comment/subtask added,
  // a dependency changed, the project itself renamed/edited, etc). The
  // ['projects'] and ['tasks', projectId] React Query caches already get
  // invalidated globally by SocketProvider on the generic 'tasks' data_update
  // broadcast (see useSocket.tsx) — that refreshes the project list and the
  // Kanban/List/Calendar/Gantt views automatically. What it can't reach is
  // state that isn't React-Query-backed: the currently open task detail
  // drawer (`selectedTask`, populated via an imperative getTaskDetails call)
  // and the `selectedProject` snapshot that was copied out of the projects
  // list at click time and won't otherwise pick up a rename/status change.
  useEffect(() => {
    if (!socket) return;

    const handleDataUpdate = async ({ module }: { module: string }) => {
      if (module !== 'tasks') return;
      if (!selectedTask?.id) return;
      try {
        const task = await api.getTaskDetails(selectedTask.id);
        setSelectedTask(task);
      } catch (err: any) {
        // Close the drawer instead of leaving it open on stale data. Most
        // often the task (or its parent project) was just deleted by
        // someone else (404); a 403 here means someone else's edit — a
        // reassignment, a watcher removal, a project-team change — just
        // revoked this viewer's access while they had it open.
        setSelectedTask(null);
        if (err?.status === 403) {
          toast.error('You no longer have access to this task.');
        } else {
          toast.error('This task is no longer available.');
        }
      }
    };

    socket.on('data_update', handleDataUpdate);
    return () => {
      socket.off('data_update', handleDataUpdate);
    };
  }, [socket, selectedTask?.id]);

  // Once the projects list refetches (triggered by the same broadcast above),
  // refresh the selectedProject snapshot in place so an open project's header/
  // settings reflect a rename or status change another admin just made,
  // instead of continuing to show what it looked like when it was clicked.
  // If the project itself was deleted by someone else, back out to the
  // projects list rather than leaving the view pointed at a dead project id.
  useEffect(() => {
    if (!selectedProject || !projects) return;
    const fresh = (projects as any[]).find((p) => p.id === selectedProject.id);
    if (!fresh) {
      toast.error('This project was deleted.');
      setSelectedProject(null);
      return;
    }
    if (fresh !== selectedProject && JSON.stringify(fresh) !== JSON.stringify(selectedProject)) {
      setSelectedProject(fresh);
    }
  }, [projects]);

  // Task Update Mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateTask(id, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'mine', user?.id] });
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
      queryClient.invalidateQueries({ queryKey: ['tasks', 'mine', user?.id] });
      setCreateModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('NORMAL');
      setTaskAssigneeId('');
      setTaskDueDate('');
      setTaskEstimatedHours('');
      setTaskLabelsInput('');
      setTaskSprintName('');
      setTaskMilestoneName('');
      setTaskIsRecurring(false);
      setTaskRecurrenceInterval('daily');
      setTaskWatcherIds([]);
      toast.success('Task assigned successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create task.');
    },
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
      estimatedHours: taskEstimatedHours ? parseFloat(taskEstimatedHours) : null,
      labels: taskLabelsInput.split(',').map((s) => s.trim()).filter(Boolean),
      watcherIds: taskWatcherIds,
      sprintName: taskSprintName || null,
      milestoneName: taskMilestoneName || null,
      isRecurring: taskIsRecurring,
      recurrenceInterval: taskIsRecurring ? taskRecurrenceInterval : null,
    });
  };

  // Inline update helper for task drawer metadata edits
  const handleInlineUpdateTask = (id: string, body: any) => {
    updateTaskMutation.mutate(
      { id, body },
      {
        onSuccess: (data) => {
          setSelectedTask(data);
        },
      }
    );
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

  return (
    <>
      {!selectedProject && !myTasksMode ? (
        <ProjectsLanding
          projects={projects}
          loadingProjects={loadingProjects}
          isWritePermitted={isWritePermitted}
          onSelectProject={setSelectedProject}
          onCreateProject={() => setProjectModalOpen(true)}
          onSelectMyTasks={() => setMyTasksMode(true)}
        />
      ) : (
        <div className="space-y-6">
          {myTasksMode ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <button
                  onClick={() => setMyTasksMode(false)}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 mb-1"
                >
                  ← Back to Projects
                </button>
                <h2 className="text-lg font-bold">My Tasks</h2>
                <p className="text-xs text-muted-foreground">Everything assigned to you, across every project.</p>
              </div>
              <div className="flex items-center gap-1.5 bg-muted dark:bg-card border rounded-xl p-1">
                {(['KANBAN', 'LIST', 'CALENDAR', 'GANTT', 'TIMELINE'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                      viewMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary dark:hover:bg-card'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <WorkspaceToolbar
              projects={projects}
              loadingProjects={loadingProjects}
              selectedProject={selectedProject}
              onSelectProject={setSelectedProject}
              onBackToProjects={() => setSelectedProject(null)}
              isWritePermitted={isWritePermitted}
              onCreateProject={() => setProjectModalOpen(true)}
              onOpenProjectSettings={() => setProjectSettingsOpen(true)}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              onAddTask={() => setCreateModalOpen(true)}
            />
          )}

          <MetricsBar filteredTasks={filteredTasks} />

          <FilterToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            filterPriority={filterPriority}
            onFilterPriorityChange={setFilterPriority}
            filterAssignee={filterAssignee}
            onFilterAssigneeChange={setFilterAssignee}
            colleagues={colleagues}
            currentUserId={user?.id}
            onExportCSV={handleExportCSV}
          />

          {viewMode === 'KANBAN' && (
            <KanbanView
              loadingTasks={activeLoadingTasks}
              filteredTasks={filteredTasks}
              onOpenTaskDetail={handleOpenTaskDetail}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onStatusChange={handleStatusChange}
            />
          )}

          {viewMode === 'LIST' && (
            <ListView loadingTasks={activeLoadingTasks} filteredTasks={filteredTasks} onOpenTaskDetail={handleOpenTaskDetail} />
          )}

          {viewMode === 'CALENDAR' && (
            <CalendarView
              currentDate={currentDate}
              calendarDays={calendarDays}
              filteredTasks={filteredTasks}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onOpenTaskDetail={handleOpenTaskDetail}
            />
          )}

          {viewMode === 'GANTT' && (
            <GanttView
              currentDate={currentDate}
              ganttDaysCount={ganttDaysCount}
              ganttDaysArray={ganttDaysArray}
              loadingTasks={activeLoadingTasks}
              filteredTasks={filteredTasks}
              collapsedSections={collapsedGanttSections}
              onToggleSection={(status) =>
                setCollapsedGanttSections((prev) => ({ ...prev, [status]: !prev[status] }))
              }
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onOpenTaskDetail={handleOpenTaskDetail}
            />
          )}

          {viewMode === 'TIMELINE' && (
            <TimelineView filteredTasks={filteredTasks} onOpenTaskDetail={handleOpenTaskDetail} />
          )}
        </div>
      )}

      <CreateProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        name={newProjectName}
        onNameChange={setNewProjectName}
        description={newProjectDesc}
        onDescriptionChange={setNewProjectDesc}
        onSubmit={handleProjectCreateSubmit}
        isPending={createProjectMutation.isPending}
      />

      {selectedProject && (
        <CreateTaskModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          projectName={selectedProject?.name}
          onSubmit={handleCreateSubmit}
          colleagues={colleagues}
          title={taskTitle}
          onTitleChange={setTaskTitle}
          description={taskDesc}
          onDescriptionChange={setTaskDesc}
          assigneeId={taskAssigneeId}
          onAssigneeIdChange={setTaskAssigneeId}
          priority={taskPriority}
          onPriorityChange={(v) => setTaskPriority(v as any)}
          dueDate={taskDueDate}
          onDueDateChange={setTaskDueDate}
          estimatedHours={taskEstimatedHours}
          onEstimatedHoursChange={setTaskEstimatedHours}
          labelsInput={taskLabelsInput}
          onLabelsInputChange={setTaskLabelsInput}
          sprintName={taskSprintName}
          onSprintNameChange={setTaskSprintName}
          milestoneName={taskMilestoneName}
          onMilestoneNameChange={setTaskMilestoneName}
          isRecurring={taskIsRecurring}
          onIsRecurringChange={setTaskIsRecurring}
          recurrenceInterval={taskRecurrenceInterval}
          onRecurrenceIntervalChange={setTaskRecurrenceInterval}
          watcherIds={taskWatcherIds}
          onWatcherIdsChange={setTaskWatcherIds}
        />
      )}

      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          allTasks={tasks}
          colleagues={colleagues}
          onInlineUpdate={(body) => handleInlineUpdateTask(selectedTask.id, body)}
          commentValue={commentValue}
          onCommentValueChange={setCommentValue}
          onAddComment={handleAddCommentSubmit}
          newSubtaskTitle={newSubtaskTitle}
          onNewSubtaskTitleChange={setNewSubtaskTitle}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          logTimeMinutes={logTimeMinutes}
          onLogTimeMinutesChange={setLogTimeMinutes}
          onLogTime={handleLogTime}
          blockerTaskId={blockerTaskId}
          onBlockerTaskIdChange={setBlockerTaskId}
          onAddDependency={handleAddDependency}
          onRemoveDependency={handleRemoveDependency}
        />
      )}

      {projectSettingsOpen && selectedProject && (
        <ProjectSettingsModal
          open={projectSettingsOpen}
          onClose={() => setProjectSettingsOpen(false)}
          name={editProjectName}
          onNameChange={setEditProjectName}
          description={editProjectDesc}
          onDescriptionChange={setEditProjectDesc}
          status={editProjectStatus}
          onStatusChange={setEditProjectStatus}
          onSubmit={handleProjectUpdateSubmit}
          onDelete={handleProjectDelete}
        />
      )}
    </>
  );
}
