'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Settings2, 
  Trash2, 
  Plus, 
  X,
  Compass,
  Trello,
  UserCheck,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';

export default function WorkflowsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Form State
  const [flowName, setFlowName] = useState('');
  const [flowTrigger, setFlowTrigger] = useState('TASK_COMPLETED');
  const [flowAction, setFlowAction] = useState('NOTIFY_MANAGER');

  // Workflows configure company-wide automation policy — admin only, same as the Admin Panel.
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [user, router]);

  // Queries
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows-list'],
    queryFn: () => api.getWorkflows(),
    enabled: user?.role === 'ADMIN',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) => api.createWorkflow(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows-list'] });
      setCreateModalOpen(false);
      setFlowName('');
      toast.success('Workflow automation created!');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      api.updateWorkflow(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows-list'] });
      toast.success('Workflow status updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows-list'] });
      toast.success('Workflow deleted.');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowName.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    createMutation.mutate({
      name: flowName,
      trigger: flowTrigger,
      action: flowAction,
      isActive: true,
    });
  };

  const getTriggerLabel = (trig: string) => {
    switch (trig) {
      case 'TASK_COMPLETED': return 'When Task is Completed';
      case 'EMPLOYEE_JOINED': return 'When Employee Joins (Onboarding)';
      case 'DOCUMENT_UPLOADED': return 'When Document is Uploaded';
      default: return trig;
    }
  };

  const getActionLabel = (act: string) => {
    switch (act) {
      case 'NOTIFY_MANAGER': return 'Notify Manager';
      case 'ASSIGN_ONBOARDING_TASKS': return 'Assign Onboarding Checklist';
      case 'NOTIFY_TEAM': return 'Notify Teammates';
      default: return act;
    }
  };

  const getTriggerIcon = (trig: string) => {
    switch (trig) {
      case 'TASK_COMPLETED': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'EMPLOYEE_JOINED': return <UserCheck className="h-5 w-5 text-info" />;
      case 'DOCUMENT_UPLOADED': return <FileText className="h-5 w-5 text-amber-500" />;
      default: return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left p-1">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Workflow Automation</h1>
          <p className="text-xs text-muted-foreground font-semibold">Build rules to automatically run tasks and notify teams when platform events occur.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-2 shrink-0 md:self-end hover:bg-primary/95 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Create Automation</span>
        </button>
      </div>

      {/* Rules Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-xs text-slate-400 italic">
            Retrieving automation rules...
          </div>
        ) : workflows.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 border rounded-3xl p-12 text-center space-y-3">
            <Sparkles className="h-8 w-8 text-primary mx-auto animate-pulse" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">No active automations</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Define recipes to connect events in ConnectHub. For example: When a task is marked completed, notify the direct report's manager automatically.
            </p>
          </div>
        ) : (
          workflows.map((flow: any) => (
            <div 
              key={flow.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-4 transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                flow.isActive ? 'border-slate-200 dark:border-slate-800' : 'border-slate-205 dark:border-slate-800/40 opacity-70'
              }`}
            >
              {/* Card Top: Header & Toggle switch */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Recipe
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={flow.isActive}
                      onChange={(e) => toggleMutation.mutate({ id: flow.id, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <h3 className="font-extrabold text-xs text-slate-850 dark:text-slate-100 truncate pr-6" title={flow.name}>
                  {flow.name}
                </h3>
              </div>

              {/* Recipe Flow UI */}
              <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 p-3 rounded-2xl space-y-2 text-left">
                {/* Trigger */}
                <div className="flex items-start space-x-2.5">
                  <div className="mt-0.5 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border shrink-0">
                    {getTriggerIcon(flow.trigger)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">When</p>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-350 truncate">{getTriggerLabel(flow.trigger)}</p>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="pl-4 border-l border-dashed border-slate-300 dark:border-slate-700 h-4 my-0.5" />

                {/* Action */}
                <div className="flex items-start space-x-2.5">
                  <div className="mt-0.5 p-1 bg-primary text-white rounded-lg shadow-sm shrink-0">
                    <Play className="h-3 w-3 fill-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Do</p>
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-350 truncate">{getActionLabel(flow.action)}</p>
                  </div>
                </div>
              </div>

              {/* Card Footer Delete Button */}
              <div className="flex items-center justify-between border-t dark:border-slate-800 pt-3">
                <span className="text-[8px] text-slate-400 font-semibold">
                  Added: {new Date(flow.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    if (confirm('Delete this workflow automation permanently?')) {
                      deleteMutation.mutate(flow.id);
                    }
                  }}
                  className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE WORKFLOW MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-5 shadow-2xl relative text-left">
            <button 
              onClick={() => setCreateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-105 p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-850 dark:text-slate-200">Configure Automation Rule</h3>
              <p className="text-[10px] text-slate-400">Specify trigger actions to automate your ConnectHub workspace operations.</p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider">Workflow Label/Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notify manager on tasks complete"
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider">When (Event Trigger)</label>
                <select
                  value={flowTrigger}
                  onChange={(e) => setFlowTrigger(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold"
                >
                  <option value="TASK_COMPLETED">When Task status becomes COMPLETED</option>
                  <option value="EMPLOYEE_JOINED">When New Employee completes Onboarding</option>
                  <option value="DOCUMENT_UPLOADED">When Document/File is Uploaded</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 uppercase text-[9px] tracking-wider">Do (Automated Action)</label>
                <select
                  value={flowAction}
                  onChange={(e) => setFlowAction(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none text-xs font-bold"
                >
                  <option value="NOTIFY_MANAGER">Notify employee's manager</option>
                  <option value="ASSIGN_ONBOARDING_TASKS">Auto-assign onboarding tasks checklist</option>
                  <option value="NOTIFY_TEAM">Notify teammates (Department members)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white hover:bg-primary/95 rounded-xl font-bold shadow-md transition-all text-center flex items-center justify-center space-x-1.5"
              >
                <Sparkles className="h-4 w-4" />
                <span>Activate Workflow Automation</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
