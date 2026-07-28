'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { UsersRound, Plus, Loader2, Trash2, X } from 'lucide-react';
import { api } from '../../../../services/api';
import { useAuthStore } from '../../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../../context/ConfirmContext';

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamDeptId, setTeamDeptId] = useState('');
  const [manageTeamRosterId, setManageTeamRosterId] = useState<string | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState('');

  React.useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [user, router]);

  const { data: systemUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.getAdminUsers(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: depts } = useQuery({
    queryKey: ['admin-depts'],
    queryFn: () => api.getDepartments(),
    enabled: user?.role === 'ADMIN',
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => api.getTeams(),
    enabled: user?.role === 'ADMIN',
  });

  const createTeamMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; departmentId: string }) => api.createTeam(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setCreateTeamOpen(false);
      setTeamName('');
      setTeamDesc('');
      setTeamDeptId('');
      toast.success('Team created successfully.');
    },
    onError: () => toast.error('Failed to create team.'),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => api.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Team deleted.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete team.'),
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => api.addTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Member added to team.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add member.'),
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => api.removeTeamMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      toast.success('Member removed from team.');
    },
  });

  const handleDeleteTeam = async (id: string) => {
    if (!await confirm({
      title: 'Delete Team',
      message: 'Delete this team? Its roster will be removed. Projects assigned to it are not deleted.',
      confirmText: 'Delete Team',
      type: 'danger',
    })) return;
    deleteTeamMutation.mutate(id);
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Teams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build rosters within departments to organize projects and members.</p>
        </div>
        <button
          onClick={() => setCreateTeamOpen(true)}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Create Team</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingTeams ? (
            <div className="col-span-2 flex items-center justify-center py-20 text-slate-450">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              <span>Loading teams...</span>
            </div>
          ) : teams?.length === 0 ? (
            <div className="col-span-2 text-center py-16 text-slate-400 text-xs">
              No teams yet. Create one to start building rosters.
            </div>
          ) : (
            teams?.map((t: any) => (
              <div key={t.id} className="border rounded-2xl p-4 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-1.5">
                      <UsersRound className="h-4 w-4 text-primary" />
                      <span>{t.name}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">{t.department?.name} · {t.members?.length || 0} member{t.members?.length === 1 ? '' : 's'} · {t._count?.projects || 0} project{t._count?.projects === 1 ? '' : 's'}</p>
                    {t.description && <p className="text-[10px] text-slate-450 mt-1">{t.description}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteTeam(t.id)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {t.members?.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">No members yet.</span>
                  ) : (
                    t.members.map((m: any) => (
                      <span key={m.id} className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 border rounded-full text-[10px] font-semibold">
                        {m.user.firstName} {m.user.lastName}
                        <button
                          onClick={() => removeTeamMemberMutation.mutate({ teamId: t.id, userId: m.userId })}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={manageTeamRosterId === t.id ? addMemberUserId : ''}
                    onChange={(e) => {
                      setManageTeamRosterId(t.id);
                      setAddMemberUserId(e.target.value);
                    }}
                    className="flex-1 bg-white dark:bg-slate-900 border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none"
                  >
                    <option value="">-- Add a member --</option>
                    {systemUsers
                      ?.filter((u: any) => !t.members?.some((m: any) => m.userId === u.id))
                      .map((u: any) => (
                        <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                      ))}
                  </select>
                  <button
                    onClick={() => {
                      if (!addMemberUserId || manageTeamRosterId !== t.id) return;
                      addTeamMemberMutation.mutate({ teamId: t.id, userId: addMemberUserId });
                      setAddMemberUserId('');
                      setManageTeamRosterId(null);
                    }}
                    disabled={manageTeamRosterId !== t.id || !addMemberUserId}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {createTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setCreateTeamOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Create New Team</h3>
              <p className="text-xs text-slate-400">Build a roster within a department to organize projects and members.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!teamName.trim() || !teamDeptId) return;
                createTeamMutation.mutate({ name: teamName, description: teamDesc || undefined, departmentId: teamDeptId });
              }}
              className="space-y-4 text-xs font-semibold"
            >
              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Platform Engineering"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Department</label>
                <select
                  required
                  value={teamDeptId}
                  onChange={(e) => setTeamDeptId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none"
                >
                  <option value="">-- Select a department --</option>
                  {depts?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-slate-400 uppercase text-[10px]">Description (optional)</label>
                <textarea
                  placeholder="What does this team own..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800 focus:outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createTeamMutation.isPending}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {createTeamMutation.isPending ? 'Creating...' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
