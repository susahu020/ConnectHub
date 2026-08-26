'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Loader2, Trash2, X } from 'lucide-react';
import { api } from '../../../../services/api';
import { useAuthStore } from '../../../../lib/store';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../../../context/ConfirmContext';

export default function DepartmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  React.useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/unauthorized');
    }
  }, [user, router]);

  const { data: depts, isLoading: loadingDepts } = useQuery({
    queryKey: ['admin-depts'],
    queryFn: () => api.getDepartments(),
    enabled: user?.role === 'ADMIN',
  });

  const createDeptMutation = useMutation({
    mutationFn: (body: any) => api.createDepartment(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      setCreateDeptOpen(false);
      setDeptName('');
      setDeptDesc('');
      toast.success('Department created successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create department.'),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => api.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
      toast.success('Department deleted.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete department.'),
  });

  const handleCreateDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    createDeptMutation.mutate({ name: deptName, description: deptDesc });
  };

  const handleDeleteDept = async (id: string) => {
    if (!await confirm({
      title: 'Delete Department',
      message: 'Are you sure you want to delete this department? This will affect attached members.',
      confirmText: 'Delete Department',
      type: 'danger',
    })) return;
    deleteDeptMutation.mutate(id);
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
          <h1 className="text-3xl font-extrabold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize and segment your workforce into functional divisions.</p>
        </div>
        <button
          onClick={() => setCreateDeptOpen(true)}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/95 transition-all shadow-md flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>Create Department</span>
        </button>
      </div>

      <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[400px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b text-muted-foreground uppercase text-[9px] tracking-wider font-bold">
              <th className="pb-3">Department Name</th>
              <th className="pb-3">Manager</th>
              <th className="pb-3">Description</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y font-semibold text-muted-foreground dark:text-foreground">
            {loadingDepts ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-muted-foreground">Loading department structures...</td>
              </tr>
            ) : depts?.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-muted-foreground">No departments yet. Create one to get started.</td>
              </tr>
            ) : (
              depts?.map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/50 dark:hover:bg-card/20">
                  <td className="py-3.5 font-bold text-primary flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>{d.name}</span>
                  </td>
                  <td className="py-3.5">
                    {d.manager ? `${d.manager.firstName} ${d.manager.lastName}` : 'No manager assigned'}
                  </td>
                  <td className="py-3.5 text-muted-foreground">{d.description || 'No description provided.'}</td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => handleDeleteDept(d.id)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="bg-card dark:bg-card border p-6 rounded-3xl w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setCreateDeptOpen(false)} className="absolute right-4 top-4 text-muted-foreground hover:bg-muted p-1 rounded-lg">
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-1">
              <h3 className="font-bold text-base">Establish New Department</h3>
              <p className="text-xs text-muted-foreground">Organize and segment user pools into functional divisions.</p>
            </div>
            <form onSubmit={handleCreateDeptSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance Division"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground uppercase text-[10px]">Description</label>
                <textarea
                  placeholder="Functional division details..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border bg-muted dark:bg-card focus:outline-none h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createDeptMutation.isPending}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {createDeptMutation.isPending ? 'Creating...' : 'Establish division'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
