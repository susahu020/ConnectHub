'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Clock, 
  Calendar, 
  FileText, 
  CreditCard, 
  Layers, 
  ArrowLeftRight, 
  Check, 
  X, 
  Plus, 
  Award, 
  Download, 
  Eye, 
  ExternalLink, 
  CalendarDays, 
  Coffee,
  Users,
  Trash2,
  Edit,
  Heart,
  Sparkles,
  Lightbulb,
  Handshake,
  Star,
  MessageSquare
} from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../../hooks/useSocket';
import CelebrationsWidget from '../../../components/CelebrationsWidget';

type TabType = 'leave' | 'attendance' | 'holidays' | 'expenses' | 'payslips' | 'shifts' | 'recognition';

export default function HRPortal() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState<TabType>('leave');
  
  // Modals state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [activePayslip, setActivePayslip] = useState<any>(null);
  
  // Manager-only Modals
  const [generatePayslipOpen, setGeneratePayslipOpen] = useState(false);
  const [assignShiftOpen, setAssignShiftOpen] = useState(false);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  
  // Swap shift state
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  
  // Recognition Modal
  const [recognitionModalOpen, setRecognitionModalOpen] = useState(false);
  const [selectedTeammateId, setSelectedTeammateId] = useState('');

  // Admin adjustments state
  const [editAttendanceOpen, setEditAttendanceOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Kudos Likes state
  const [likesMap, setLikesMap] = useState<Record<string, { count: number; liked: boolean }>>({});

  // Swap shift coworker selection state
  const [swapCoworkerId, setSwapCoworkerId] = useState('');

  // Pre-populated praise message state
  const [praiseMessage, setPraiseMessage] = useState('');

  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

  // ----------------------------------------------------
  // REAL-TIME SOCKET PRESENCE/HR EVENTS SYNC
  // ----------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleHRUpdate = (data: any) => {
      console.log('Real-time HR Update received:', data);
      // Invalidate active queries to sync list data without refresh
      queryClient.invalidateQueries({ queryKey: ['hr-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['hr-leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['hr-today-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['hr-attendance-logs'] });
      queryClient.invalidateQueries({ queryKey: ['hr-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['hr-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['hr-payslips'] });
      queryClient.invalidateQueries({ queryKey: ['hr-shifts'] });
      queryClient.invalidateQueries({ queryKey: ['hr-shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['hr-shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['hr-recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['hr-celebrations'] });
      queryClient.invalidateQueries({ queryKey: ['hr-celebration-wishes'] });
      queryClient.invalidateQueries({ queryKey: ['my-wishes'] });
    };

    socket.on('hr_update', handleHRUpdate);
    return () => {
      socket.off('hr_update', handleHRUpdate);
    };
  }, [socket, queryClient]);

  // ----------------------------------------------------
  // QUERIES
  // ----------------------------------------------------
  
  // Directory users for dropdown selects
  const { data: directoryData } = useQuery({
    queryKey: ['hr-directory'],
    queryFn: () => api.getDirectory('limit=100'),
    enabled: !!user,
  });
  const employees = directoryData?.users || [];

  // Leaves
  const { data: leaves = [], refetch: refetchLeaves } = useQuery({
    queryKey: ['hr-leaves'],
    queryFn: () => api.getLeaves(),
    enabled: !!user,
  });

  const { data: balances = [], refetch: refetchBalances } = useQuery({
    queryKey: ['hr-leave-balances'],
    queryFn: () => api.getLeaveBalances(),
    enabled: !!user,
  });

  // Attendance
  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ['hr-today-attendance'],
    queryFn: () => api.getTodayAttendance(),
    enabled: !!user,
  });

  const { data: attendanceLogs = [], refetch: refetchAttendanceLogs } = useQuery({
    queryKey: ['hr-attendance-logs'],
    queryFn: () => api.getAttendanceLogs(isManager ? 'all=true' : ''),
    enabled: !!user,
  });

  // Holidays
  const { data: holidays = [], refetch: refetchHolidays } = useQuery({
    queryKey: ['hr-holidays'],
    queryFn: () => api.getHolidays(),
    enabled: !!user,
  });

  // Expenses
  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ['hr-expenses'],
    queryFn: () => api.getExpenseClaims(),
    enabled: !!user,
  });

  // Payslips
  const { data: payslips = [], refetch: refetchPayslips } = useQuery({
    queryKey: ['hr-payslips'],
    queryFn: () => api.getPayslips(),
    enabled: !!user,
  });

  // Shifts
  const { data: shifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['hr-shifts'],
    queryFn: () => api.getShifts(),
    enabled: !!user,
  });

  const { data: shiftAssignments = [], refetch: refetchShiftAssignments } = useQuery({
    queryKey: ['hr-shift-assignments'],
    queryFn: () => api.getShiftAssignments(),
    enabled: !!user,
  });

  const { data: swapRequests = [], refetch: refetchSwapRequests } = useQuery({
    queryKey: ['hr-shift-swaps'],
    queryFn: () => api.getShiftSwapRequests(),
    enabled: !!user,
  });

  // Recognition
  const { data: recognitions = [], refetch: refetchRecognitions } = useQuery({
    queryKey: ['hr-recognitions'],
    queryFn: () => api.getRecognitions(),
    enabled: !!user,
  });

  // ----------------------------------------------------
  // MUTATIONS
  // ----------------------------------------------------
  const requestLeaveMutation = useMutation({
    mutationFn: api.requestLeave,
    onSuccess: () => {
      toast.success('Leave requested successfully');
      setLeaveModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to request leave'),
  });

  const updateLeaveStatusMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateLeaveStatus(id, body),
    onSuccess: () => {
      toast.success('Leave status updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update leave status'),
  });

  const clockInMutation = useMutation({
    mutationFn: api.clockIn,
    onSuccess: () => {
      toast.success('Clocked In successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to clock in'),
  });

  const clockOutMutation = useMutation({
    mutationFn: api.clockOut,
    onSuccess: () => {
      toast.success('Clocked Out successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to clock out'),
  });

  const startBreakMutation = useMutation({
    mutationFn: api.startBreak,
    onSuccess: () => {
      toast.success('Break started');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to start break'),
  });

  const endBreakMutation = useMutation({
    mutationFn: api.endBreak,
    onSuccess: () => {
      toast.success('Break ended');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to end break'),
  });

  const createHolidayMutation = useMutation({
    mutationFn: api.createHoliday,
    onSuccess: () => {
      toast.success('Holiday created');
      setAddHolidayOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create holiday'),
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: api.deleteHoliday,
    onSuccess: () => {
      toast.success('Holiday deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete holiday'),
  });

  const createExpenseClaimMutation = useMutation({
    mutationFn: api.createExpenseClaim,
    onSuccess: () => {
      toast.success('Expense claim submitted');
      setExpenseModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit expense'),
  });

  const updateExpenseStatusMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateExpenseStatus(id, body),
    onSuccess: () => {
      toast.success('Expense claim status updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update expense status'),
  });

  const generatePayslipMutation = useMutation({
    mutationFn: api.generatePayslip,
    onSuccess: () => {
      toast.success('Payslip generated successfully');
      setGeneratePayslipOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to generate payslip'),
  });

  const updatePayslipStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.updatePayslipStatus(id, status),
    onSuccess: () => {
      toast.success('Payslip status updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update payslip status'),
  });

  const createShiftMutation = useMutation({
    mutationFn: api.createShift,
    onSuccess: () => {
      toast.success('Shift created');
      setCreateShiftOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create shift'),
  });

  const assignShiftMutation = useMutation({
    mutationFn: api.assignShift,
    onSuccess: () => {
      toast.success('Shift assigned successfully');
      setAssignShiftOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to assign shift'),
  });

  const createSwapRequestMutation = useMutation({
    mutationFn: api.createShiftSwapRequest,
    onSuccess: () => {
      toast.success('Shift swap request sent');
      setSwapModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to request swap'),
  });

  const updateSwapRequestStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => api.updateShiftSwapStatus(id, status),
    onSuccess: () => {
      toast.success('Shift swap request updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update swap status'),
  });

  const createRecognitionMutation = useMutation({
    mutationFn: api.createRecognition,
    onSuccess: () => {
      toast.success('Recognition sent!');
      setRecognitionModalOpen(false);
      setSelectedTeammateId('');
      setPraiseMessage('');
      queryClient.invalidateQueries({ queryKey: ['hr-recognitions'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send recognition'),
  });

  // Admin mutations
  const deleteLeaveMutation = useMutation({
    mutationFn: api.deleteLeaveRequest,
    onSuccess: () => toast.success('Leave request deleted'),
    onError: (err: any) => toast.error(err.message || 'Failed to delete leave'),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: api.deleteExpenseClaim,
    onSuccess: () => toast.success('Expense claim deleted'),
    onError: (err: any) => toast.error(err.message || 'Failed to delete expense'),
  });

  const deletePayslipMutation = useMutation({
    mutationFn: api.deletePayslip,
    onSuccess: () => toast.success('Payslip deleted'),
    onError: (err: any) => toast.error(err.message || 'Failed to delete payslip'),
  });

  const deleteShiftAssignmentMutation = useMutation({
    mutationFn: api.deleteShiftAssignment,
    onSuccess: () => toast.success('Shift assignment deleted'),
    onError: (err: any) => toast.error(err.message || 'Failed to delete assignment'),
  });

  const deleteRecognitionMutation = useMutation({
    mutationFn: api.deleteRecognition,
    onSuccess: () => toast.success('Recognition post deleted'),
    onError: (err: any) => toast.error(err.message || 'Failed to delete recognition'),
  });

  const updateAttendanceLogMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.updateAttendanceLog(id, body),
    onSuccess: () => {
      toast.success('Attendance punch log adjusted successfully');
      setEditAttendanceOpen(false);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to adjust log'),
  });

  const deleteAttendanceLogMutation = useMutation({
    mutationFn: api.deleteAttendanceLog,
    onSuccess: () => toast.success('Attendance record deleted'),
    onError: (err: any) => toast.error(err.message || 'Failed to delete record'),
  });

  // Local clock state for Attendance UI
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setTimeStr(date.toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" />
            HR Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access leave, clock in/out, view shifts, submit expense claims, view payslips, and celebrate teammates.
          </p>
        </div>
      </div>

      {/* STAT CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Attendance Stat Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Attendance Status</span>
            <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {todayAttendance ? (todayAttendance.clockOut ? 'Clocked Out' : 'Active Duty') : 'Not Checked In'}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            {todayAttendance?.clockIn ? `In: ${new Date(todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready to start your day'}
          </span>
        </div>

        {/* Leaves Stat Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Available Leaves</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {balances.find((b: any) => b.leaveType === 'ANNUAL') ? 
              (balances.find((b: any) => b.leaveType === 'ANNUAL').total - balances.find((b: any) => b.leaveType === 'ANNUAL').used) : 12} Days
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Annual leave balance</span>
        </div>

        {/* Shifts Stat Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Shift</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {shiftAssignments[0]?.shift ? shiftAssignments[0].shift.name : 'Regular Shift'}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            {shiftAssignments[0]?.shift ? `${shiftAssignments[0].shift.startTime} - ${shiftAssignments[0].shift.endTime}` : '09:00 AM - 05:00 PM'}
          </span>
        </div>

        {/* Recognitions Received */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recognitions Received</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {recognitions.filter((r: any) => r.receiverId === user?.id).length} Cheers
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Kudos from your colleagues</span>
        </div>

      </div>

      {/* HORIZONTAL TAB NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'leave', label: 'Leave', icon: <Calendar className="h-4 w-4" /> },
          { id: 'attendance', label: 'Attendance', icon: <Clock className="h-4 w-4" /> },
          { id: 'holidays', label: 'Holidays', icon: <CalendarDays className="h-4 w-4" /> },
          { id: 'expenses', label: 'Expenses', icon: <CreditCard className="h-4 w-4" /> },
          { id: 'payslips', label: 'Payslips', icon: <FileText className="h-4 w-4" /> },
          { id: 'shifts', label: 'Shifts', icon: <ArrowLeftRight className="h-4 w-4" /> },
          { id: 'recognition', label: 'Recognition', icon: <Award className="h-4 w-4" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold whitespace-nowrap transition-all duration-200 leading-none ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400 hover:text-slate-650 hover:border-slate-200 dark:hover:border-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT WITH ANIMATION */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            
            {/* LEAVE TAB */}
            {activeTab === 'leave' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Leave Requests & Balance</h3>
                  <button
                    onClick={() => setLeaveModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Request Leave
                  </button>
                </div>

                {/* Balances Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {balances.map((bal: any) => (
                    <div key={bal.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{bal.leaveType}</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                        {bal.total - bal.used} <span className="text-xs text-slate-400 font-bold">/ {bal.total} left</span>
                      </p>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full" 
                          style={{ width: `${Math.min(100, (bal.used / bal.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* History Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">My Leave History</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                          <th className="px-5 py-3">Leave Type</th>
                          <th className="px-5 py-3">Dates</th>
                          <th className="px-5 py-3">Days</th>
                          <th className="px-5 py-3">Reason</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Approver Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {leaves.filter((l: any) => l.userId === user?.id).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400">No leave requests found.</td>
                          </tr>
                        ) : (
                          leaves.filter((l: any) => l.userId === user?.id).map((req: any) => {
                            const days = Math.ceil((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            return (
                              <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{req.leaveType}</td>
                                <td className="px-5 py-4 text-slate-500">
                                  {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">{days} Days</td>
                                <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate">{req.reason}</td>
                                <td className="px-5 py-4 flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${
                                    req.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                    req.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  }`}>
                                    {req.status}
                                  </span>
                                  {(isAdmin || req.status === 'PENDING') && (
                                    <button
                                      onClick={() => {
                                        const isMine = req.userId === user?.id;
                                        const confirmText = isMine && req.status === 'PENDING'
                                          ? 'Cancel this leave request?'
                                          : 'Are you sure you want to delete this leave request?';
                                        if (confirm(confirmText)) {
                                          deleteLeaveMutation.mutate(req.id);
                                        }
                                      }}
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                                      title={req.status === 'PENDING' ? 'Cancel Request' : 'Delete Request'}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-slate-400 italic">{req.managerNotes || '—'}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Manager Leave Approval panel */}
                {isManager && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Leave Approvals (Manager Panel)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                            <th className="px-5 py-3">Employee</th>
                            <th className="px-5 py-3">Leave Type</th>
                            <th className="px-5 py-3">Dates</th>
                            <th className="px-5 py-3">Reason</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          {leaves.filter((l: any) => l.status === 'PENDING' && l.userId !== user?.id).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-slate-400">No pending approvals.</td>
                            </tr>
                          ) : (
                            leaves.filter((l: any) => l.status === 'PENDING' && l.userId !== user?.id).map((req: any) => (
                              <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{req.user?.firstName} {req.user?.lastName}</p>
                                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">{req.user?.designation}</p>
                                </td>
                                <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{req.leaveType}</td>
                                <td className="px-5 py-4 text-slate-500">
                                  {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate">{req.reason}</td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => updateLeaveStatusMutation.mutate({ id: req.id, body: { status: 'APPROVED' } })}
                                      className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                      title="Approve"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const notes = prompt('Enter rejection notes (optional):');
                                        updateLeaveStatusMutation.mutate({ id: req.id, body: { status: 'REJECTED', managerNotes: notes } });
                                      }}
                                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                                      title="Reject"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ATTENDANCE TAB */}
            {activeTab === 'attendance' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Clock Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Office Punch Clock</span>
                  <p className="text-4xl font-black text-slate-800 dark:text-white tabular-nums tracking-tight mb-4">{timeStr}</p>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      todayAttendance ? (todayAttendance.clockOut ? 'bg-rose-500' : 'bg-green-500') : 'bg-slate-300'
                    }`} />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {todayAttendance ? (todayAttendance.clockOut ? 'Clocked Out' : 'Active Duty') : 'Offline / Signed Out'}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="w-full space-y-3">
                    {!todayAttendance && (
                      <button
                        onClick={() => clockInMutation.mutate(undefined)}
                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black shadow-md hover:shadow-lg transition-all"
                      >
                        Clock In
                      </button>
                    )}
                    
                    {todayAttendance && !todayAttendance.clockOut && (
                      <div className="grid grid-cols-2 gap-3 w-full">
                        {/* Break controls */}
                        {todayAttendance.breaks?.some((b: any) => b.endTime === null) ? (
                          <button
                            onClick={() => endBreakMutation.mutate()}
                            className="py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black shadow-sm transition-all"
                          >
                            End Break
                          </button>
                        ) : (
                          <button
                            onClick={() => startBreakMutation.mutate()}
                            className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-xl font-black shadow-sm transition-all flex items-center justify-center gap-1.5"
                          >
                            <Coffee className="h-4 w-4" />
                            Start Break
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            const note = prompt('Leave a clock out note (optional):') || undefined;
                            clockOutMutation.mutate({ notes: note });
                          }}
                          className="py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black shadow-sm transition-all"
                        >
                          Clock Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* History list */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {isManager ? 'Company Attendance Feed' : 'My Attendance History'}
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                          {isManager && <th className="px-5 py-3">Employee</th>}
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Clock In</th>
                          <th className="px-5 py-3">Clock Out</th>
                          <th className="px-5 py-3">Status</th>
                          {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {attendanceLogs.length === 0 ? (
                          <tr>
                            <td colSpan={isManager ? 6 : 5} className="text-center py-8 text-slate-400">No attendance logs.</td>
                          </tr>
                        ) : (
                          attendanceLogs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              {isManager && (
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{log.user?.firstName} {log.user?.lastName}</p>
                                  <p className="text-[10px] text-slate-400">{log.user?.designation}</p>
                                </td>
                              )}
                              <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">
                                {new Date(log.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-5 py-4 text-slate-500">
                                {new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-5 py-4 text-slate-500">
                                {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              </td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${
                                  log.status === 'PRESENT' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedLog(log);
                                        setEditAttendanceOpen(true);
                                      }}
                                      className="p-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850"
                                      title="Edit punch times"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this attendance log?')) {
                                          deleteAttendanceLogMutation.mutate(log.id);
                                        }
                                      }}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                      title="Delete record"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* HOLIDAYS TAB */}
            {activeTab === 'holidays' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Upcoming Company Holidays</h3>
                  {isManager && (
                    <button
                      onClick={() => setAddHolidayOpen(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Add Holiday
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {holidays.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                      No holidays scheduled yet.
                    </div>
                  ) : (
                    holidays.map((hol: any) => (
                      <div key={hol.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex justify-between items-start">
                        <div className="space-y-2">
                          <p className="text-xs font-black text-primary uppercase tracking-wider">
                            {new Date(hol.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                          <h4 className="text-base font-black text-slate-800 dark:text-white leading-tight">{hol.name}</h4>
                          <p className="text-xs text-slate-500 max-w-[200px]">{hol.description || 'No description provided.'}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            hol.isMandatory ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {hol.isMandatory ? 'Mandatory' : 'Optional'}
                          </span>
                        </div>
                        {isManager && (
                          <button
                            onClick={() => deleteHolidayMutation.mutate(hol.id)}
                            className="p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            title="Delete Holiday"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* EXPENSE CLAIMS TAB */}
            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Expense Claims</h3>
                  <button
                    onClick={() => setExpenseModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    New Expense Claim
                  </button>
                </div>

                {/* History Table */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">My Claim History</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                          <th className="px-5 py-3">Expense Claim</th>
                          <th className="px-5 py-3">Category</th>
                          <th className="px-5 py-3">Amount</th>
                          <th className="px-5 py-3">Receipt</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {expenses.filter((c: any) => c.userId === user?.id).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-slate-400">No expense claims found.</td>
                          </tr>
                        ) : (
                          expenses.filter((c: any) => c.userId === user?.id).map((claim: any) => (
                            <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{claim.title}</td>
                              <td className="px-5 py-4 text-slate-500 font-bold uppercase">{claim.category}</td>
                              <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                                {claim.currency} {claim.amount.toLocaleString()}
                              </td>
                              <td className="px-5 py-4">
                                {claim.receiptUrl ? (
                                  <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" />
                                    View
                                  </a>
                                ) : '—'}
                              </td>
                              <td className="px-5 py-4 flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${
                                  claim.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                  claim.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                }`}>
                                  {claim.status}
                                </span>
                                {(isAdmin || claim.status === 'PENDING') && (
                                  <button
                                    onClick={() => {
                                      const isMine = claim.userId === user?.id;
                                      const confirmText = isMine && claim.status === 'PENDING'
                                        ? 'Withdraw this expense claim?'
                                        : 'Are you sure you want to delete this expense claim?';
                                      if (confirm(confirmText)) {
                                        deleteExpenseMutation.mutate(claim.id);
                                      }
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                                    title={claim.status === 'PENDING' ? 'Withdraw Claim' : 'Delete Claim'}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                              <td className="px-5 py-4 text-slate-400 italic">{claim.managerNotes || '—'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Manager approval panel */}
                {isManager && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Pending Claims (Manager Panel)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                            <th className="px-5 py-3">Employee</th>
                            <th className="px-5 py-3">Claim</th>
                            <th className="px-5 py-3">Amount</th>
                            <th className="px-5 py-3">Receipt</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          {expenses.filter((c: any) => c.status === 'PENDING' && c.userId !== user?.id).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-slate-400">No pending expense claims.</td>
                            </tr>
                          ) : (
                            expenses.filter((c: any) => c.status === 'PENDING' && c.userId !== user?.id).map((claim: any) => (
                              <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{claim.user?.firstName} {claim.user?.lastName}</p>
                                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">{claim.user?.designation}</p>
                                </td>
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{claim.title}</p>
                                  <p className="text-[10px] text-slate-400 uppercase leading-none mt-0.5">{claim.category}</p>
                                </td>
                                <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                                  {claim.currency} {claim.amount.toLocaleString()}
                                </td>
                                <td className="px-5 py-4">
                                  {claim.receiptUrl ? (
                                    <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                      <ExternalLink className="h-3 w-3" />
                                      View Receipt
                                    </a>
                                  ) : '—'}
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => updateExpenseStatusMutation.mutate({ id: claim.id, body: { status: 'APPROVED' } })}
                                      className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                      title="Approve"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const notes = prompt('Enter rejection notes (optional):');
                                        updateExpenseStatusMutation.mutate({ id: claim.id, body: { status: 'REJECTED', managerNotes: notes } });
                                      }}
                                      className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                                      title="Reject"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYSLIPS TAB */}
            {activeTab === 'payslips' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Earnings & Payslips</h3>
                  {isManager && (
                    <button
                      onClick={() => setGeneratePayslipOpen(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Generate Payslip
                    </button>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {isManager ? 'All Generated Payslips' : 'My Payslips'}
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                          {isManager && <th className="px-5 py-3">Employee</th>}
                          <th className="px-5 py-3">Month / Year</th>
                          <th className="px-5 py-3">Basic Salary</th>
                          <th className="px-5 py-3">Allowances</th>
                          <th className="px-5 py-3">Deductions</th>
                          <th className="px-5 py-3">Net Salary</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {payslips.length === 0 ? (
                          <tr>
                            <td colSpan={isManager ? 8 : 7} className="text-center py-8 text-slate-400">No payslips available.</td>
                          </tr>
                        ) : (
                          payslips.map((pay: any) => (
                            <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                              {isManager && (
                                <td className="px-5 py-4">
                                  <p className="font-bold text-slate-800 dark:text-slate-200">{pay.user?.firstName} {pay.user?.lastName}</p>
                                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">{pay.user?.designation}</p>
                                </td>
                              )}
                              <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                                {new Date(0, pay.month - 1).toLocaleString([], { month: 'long' })} {pay.year}
                              </td>
                              <td className="px-5 py-4 text-slate-500">${pay.basicSalary.toLocaleString()}</td>
                              <td className="px-5 py-4 text-green-500 font-semibold">+${pay.allowances.toLocaleString()}</td>
                              <td className="px-5 py-4 text-rose-500 font-semibold">-${pay.deductions.toLocaleString()}</td>
                              <td className="px-5 py-4 font-black text-slate-800 dark:text-white">${pay.netSalary.toLocaleString()}</td>
                              <td className="px-5 py-4">
                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${
                                  pay.status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  {pay.status}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setActivePayslip(pay);
                                      setPayslipModalOpen(true);
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  {isManager && pay.status === 'UNPAID' && (
                                    <button
                                      onClick={() => updatePayslipStatusMutation.mutate({ id: pay.id, status: 'PAID' })}
                                      className="p-1 rounded bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                      title="Mark Paid"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  )}
                                  {isAdmin && (
                                    <button
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this payslip?')) {
                                          deletePayslipMutation.mutate(pay.id);
                                        }
                                      }}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                      title="Delete payslip"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SHIFT MANAGEMENT TAB */}
            {activeTab === 'shifts' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Shift Calendar & Swaps</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSwapModalOpen(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-slate-700 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Request Shift Swap
                    </button>
                    {isManager && (
                      <>
                        <button
                          onClick={() => setCreateShiftOpen(true)}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-slate-800 dark:bg-slate-700 rounded-xl shadow-md hover:bg-slate-900 transition-all"
                        >
                          <Plus className="h-4 w-4" />
                          Define Shift
                        </button>
                        <button
                          onClick={() => setAssignShiftOpen(true)}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
                        >
                          <Plus className="h-4 w-4" />
                          Assign Shift
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Calendar assignments list */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-850">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {isManager ? 'Organization Shift Roster' : 'My Shift Calendar'}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b">
                            {isManager && <th className="px-5 py-3">Employee</th>}
                            <th className="px-5 py-3">Shift Name</th>
                            <th className="px-5 py-3">Hours</th>
                            <th className="px-5 py-3">Date Range</th>
                            {isAdmin && <th className="px-5 py-3 text-right">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y text-xs">
                          {shiftAssignments.length === 0 ? (
                            <tr>
                              <td colSpan={isManager ? (isAdmin ? 5 : 4) : 3} className="text-center py-8 text-slate-400">No shifts assigned.</td>
                            </tr>
                          ) : (
                            shiftAssignments.map((assign: any) => (
                              <tr key={assign.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                {isManager && (
                                  <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                                    {assign.user?.firstName} {assign.user?.lastName}
                                  </td>
                                )}
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: assign.shift?.color || '#3b82f6' }} />
                                    <span className="font-bold text-slate-850 dark:text-slate-200">{assign.shift?.name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-slate-500 font-semibold">
                                  {assign.shift?.startTime} - {assign.shift?.endTime}
                                </td>
                                <td className="px-5 py-4 text-slate-400">
                                  {new Date(assign.startDate).toLocaleDateString()} to {new Date(assign.endDate).toLocaleDateString()}
                                </td>
                                {isAdmin && (
                                  <td className="px-5 py-4 text-right">
                                    <button
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this shift assignment?')) {
                                          deleteShiftAssignmentMutation.mutate(assign.id);
                                        }
                                      }}
                                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                                      title="Delete Shift Assignment"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Swap requests feed */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                    <h4 className="text-sm font-black text-slate-850 dark:text-white mb-4">Swap Requests Feed</h4>
                    <div className="space-y-4">
                      {swapRequests.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6">No shift swap requests.</p>
                      ) : (
                        swapRequests.map((swap: any) => (
                          <div key={swap.id} className="border border-slate-100 dark:border-slate-850 rounded-xl p-3.5 space-y-2">
                            <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {swap.requester?.firstName} ⟷ {swap.assignee?.firstName}
                              </p>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                swap.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                swap.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {swap.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500">
                              Swapping: <span className="font-bold">{swap.requesterAssignment?.shift?.name}</span> ({swap.requesterAssignment?.shift?.startTime}) with <span className="font-bold">{swap.assigneeAssignment?.shift?.name}</span> ({swap.assigneeAssignment?.shift?.startTime})
                            </p>
                            
                            {isManager && swap.status === 'PENDING' && swap.requesterId !== user?.id && swap.assigneeId !== user?.id && (
                              <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                <button
                                  onClick={() => updateSwapRequestStatusMutation.mutate({ id: swap.id, status: 'APPROVED' })}
                                  className="px-2.5 py-1 text-[9px] font-black text-white bg-green-500 rounded-lg hover:bg-green-600 transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateSwapRequestStatusMutation.mutate({ id: swap.id, status: 'REJECTED' })}
                                  className="px-2.5 py-1 text-[9px] font-black text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* EMPLOYEE RECOGNITION & CELEBRATIONS TAB */}
            {activeTab === 'recognition' && (
              <div className="space-y-6">
                
                {/* Header Row */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Peer Recognition Board</h3>
                  <button
                    onClick={() => {
                      setSelectedTeammateId('');
                      setPraiseMessage('');
                      setRecognitionModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
                  >
                    <Award className="h-4 w-4" />
                    Recognize Teammate
                  </button>
                </div>

                {/* 3-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Kudos Feed */}
                  <div className="lg:col-span-2 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recognitions.length === 0 ? (
                      <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                        Be the first to recognize a colleague for their outstanding work!
                      </div>
                    ) : (
                      recognitions.map((rec: any) => {
                        const recLikes = likesMap[rec.id] || { count: Math.floor(Math.random() * 5) + 1, liked: false };
                        const handleLike = () => {
                          setLikesMap(prev => {
                            const cur = prev[rec.id] || { count: recLikes.count, liked: false };
                            const nextLiked = !cur.liked;
                            return {
                              ...prev,
                              [rec.id]: {
                                count: nextLiked ? cur.count + 1 : Math.max(0, cur.count - 1),
                                liked: nextLiked
                              }
                            };
                          });
                        };

                        const getBadgeIcon = (badge: string) => {
                          switch (badge) {
                            case 'TEAM_PLAYER': return <Handshake className="h-3.5 w-3.5" />;
                            case 'INNOVATOR': return <Lightbulb className="h-3.5 w-3.5" />;
                            case 'CUSTOMER_CHAMPION': return <Heart className="h-3.5 w-3.5" />;
                            case 'ROCKSTAR': return <Star className="h-3.5 w-3.5" />;
                            default: return <Award className="h-3.5 w-3.5" />;
                          }
                        };

                        const getBadgeColors = (badge: string) => {
                          switch (badge) {
                            case 'TEAM_PLAYER': return 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 border-sky-200 dark:border-sky-900/30';
                            case 'INNOVATOR': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-200 dark:border-amber-900/30';
                            case 'CUSTOMER_CHAMPION': return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-200 dark:border-rose-900/30';
                            case 'ROCKSTAR': return 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 border-purple-200 dark:border-purple-900/30';
                            default: return 'bg-primary/5 text-primary border-primary/10';
                          }
                        };

                        return (
                          <div 
                            key={rec.id} 
                            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                          >
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this recognition post?')) {
                                    deleteRecognitionMutation.mutate(rec.id);
                                  }
                                }}
                                className="absolute top-5 right-5 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 transition-colors"
                                title="Delete recognition"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Card Content */}
                            <div className="space-y-4 text-left">
                              {/* Sender Profile */}
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-105 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold uppercase text-slate-500 shrink-0 border border-slate-200 dark:border-slate-800">
                                  {rec.sender?.avatarUrl ? (
                                    <img src={rec.sender.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    `${rec.sender?.firstName?.[0]}${rec.sender?.lastName?.[0]}`
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                                    {rec.sender?.firstName} {rec.sender?.lastName}
                                  </h4>
                                  <p className="text-[10px] text-slate-450 leading-none mt-0.5">{rec.sender?.designation || 'Staff member'}</p>
                                </div>
                              </div>

                              {/* Badge Tag */}
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getBadgeColors(rec.badge)}`}>
                                {getBadgeIcon(rec.badge)}
                                {rec.badge.replace('_', ' ')}
                              </span>

                              {/* Quote block */}
                              <div className="relative pl-4 border-l-2 border-primary/20">
                                <p className="text-xs text-slate-650 dark:text-slate-300 italic leading-relaxed">
                                  "{rec.message}"
                                </p>
                              </div>
                            </div>

                            {/* Card Footer (Recipient & Action line) */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex flex-col space-y-3">
                              <div className="flex items-center gap-2.5 text-left">
                                <div className="h-8 w-8 rounded-full bg-slate-105 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold uppercase text-slate-500 shrink-0 border border-slate-200 dark:border-slate-800">
                                  {rec.receiver?.avatarUrl ? (
                                    <img src={rec.receiver.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    `${rec.receiver?.firstName?.[0]}${rec.receiver?.lastName?.[0]}`
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate">
                                    {rec.receiver?.firstName} {rec.receiver?.lastName}
                                  </p>
                                  <p className="text-[9px] text-slate-450 truncate">{rec.receiver?.designation || 'Teammate'}</p>
                                </div>
                              </div>

                              {/* Likes & Interaction Bar */}
                              <div className="flex items-center gap-4 text-slate-450 text-[10px] pt-1">
                                <button 
                                  onClick={handleLike}
                                  className={`flex items-center gap-1.5 font-bold hover:text-rose-500 transition-colors ${recLikes.liked ? 'text-rose-500' : ''}`}
                                >
                                  <Heart className={`h-4 w-4 ${recLikes.liked ? 'fill-current' : ''}`} />
                                  <span>{recLikes.count} Likes</span>
                                </button>
                                <div className="flex items-center gap-1.5 font-bold">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>Public Recognition</span>
                                </div>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Celebrations Widget (shared with Dashboard) */}
                <CelebrationsWidget variant="full" />

              </div>
            </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------
          MODALS & FORMS
          ---------------------------------------------------- */}

      {/* ADJUST ATTENDANCE LOG MODAL (ADMIN ONLY) */}
      {editAttendanceOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Adjust Attendance Punches</h3>
              <button onClick={() => setEditAttendanceOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const clockIn = target.clockIn.value;
              const clockOut = target.clockOut.value || null;
              const status = target.status.value;
              const notes = target.notes.value;
              updateAttendanceLogMutation.mutate({
                id: selectedLog.id,
                body: { clockIn, clockOut, status, notes }
              });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clock In Timestamp</label>
                <input 
                  type="datetime-local" 
                  name="clockIn" 
                  defaultValue={new Date(selectedLog.clockIn).toISOString().slice(0, 16)} 
                  required 
                  className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Clock Out Timestamp</label>
                <input 
                  type="datetime-local" 
                  name="clockOut" 
                  defaultValue={selectedLog.clockOut ? new Date(selectedLog.clockOut).toISOString().slice(0, 16) : ''} 
                  className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                <select name="status" defaultValue={selectedLog.status} className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Adjustment Note</label>
                <textarea 
                  name="notes" 
                  rows={2} 
                  defaultValue={selectedLog.notes || ''} 
                  placeholder="Reason for adjustment..." 
                  className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" 
                />
              </div>
              <button
                type="submit"
                disabled={updateAttendanceLogMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {updateAttendanceLogMutation.isPending ? 'Adjusting...' : 'Save Adjustments'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* APPLY LEAVE MODAL */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Apply for Leave</h3>
              <button onClick={() => setLeaveModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const leaveType = target.leaveType.value;
              const startDate = target.startDate.value;
              const endDate = target.endDate.value;
              const reason = target.reason.value;
              requestLeaveMutation.mutate({ leaveType, startDate, endDate, reason });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Leave Type</label>
                <select name="leaveType" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input type="date" name="startDate" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                  <input type="date" name="endDate" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Reason for leave</label>
                <textarea name="reason" rows={3} required placeholder="Write a short explanation..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <button
                type="submit"
                disabled={requestLeaveMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {requestLeaveMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NEW EXPENSE CLAIM MODAL */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Submit Expense Claim</h3>
              <button onClick={() => setExpenseModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const title = (target.elements.namedItem('title') as HTMLInputElement).value;
              const category = target.category.value;
              const amount = parseFloat(target.amount.value);
              const receiptUrl = target.receiptUrl.value;
              const description = target.description.value;
              createExpenseClaimMutation.mutate({ title, category, amount, receiptUrl, description });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Title</label>
                <input type="text" name="title" required placeholder="e.g. Travel tickets, Client dinner" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
                  <select name="category" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                    <option value="TRAVEL">Travel</option>
                    <option value="MEALS">Meals</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Amount ($)</label>
                  <input type="number" name="amount" step="0.01" required placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Receipt Link (URL)</label>
                <input type="url" name="receiptUrl" placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Short Description</label>
                <textarea name="description" rows={3} placeholder="Explain the expense..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <button
                type="submit"
                disabled={createExpenseClaimMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {createExpenseClaimMutation.isPending ? 'Submitting...' : 'Submit Claim'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PAYSLIP DETAILS MODAL */}
      {payslipModalOpen && activePayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Payslip Details</h3>
              <button onClick={() => setPayslipModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Payslip Design */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">ConnectHub Enterprise</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Statement of Earnings</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">
                    {new Date(0, activePayslip.month - 1).toLocaleString([], { month: 'long' })} {activePayslip.year}
                  </p>
                  <p className="text-[9px] text-slate-400">Issued by: {activePayslip.generatedBy?.firstName} {activePayslip.generatedBy?.lastName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-bold text-[9px] uppercase">Employee Details</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {activePayslip.user?.firstName} {activePayslip.user?.lastName}
                  </p>
                  <p className="text-slate-500">{activePayslip.user?.designation}</p>
                  <p className="text-slate-500">{activePayslip.user?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold text-[9px] uppercase">Payment Status</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase border mt-1.5 ${
                    activePayslip.status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {activePayslip.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Basic Salary</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">${activePayslip.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Allowances</span>
                  <span className="font-bold text-green-500">+${activePayslip.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deductions</span>
                  <span className="font-bold text-rose-500">-${activePayslip.deductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-dashed pt-2 text-sm font-black">
                  <span className="text-slate-900 dark:text-white">Net Payout</span>
                  <span className="text-primary">${activePayslip.netSalary.toLocaleString()}</span>
                </div>
              </div>

              {activePayslip.notes && (
                <div className="bg-white dark:bg-slate-950 p-2.5 rounded border text-[10px] text-slate-500 italic mt-3">
                  Notes: "{activePayslip.notes}"
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Print Payslip
              </button>
              <button
                onClick={() => setPayslipModalOpen(false)}
                className="flex-1 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE PAYSLIP MODAL (MANAGER ONLY) */}
      {generatePayslipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Generate Employee Payslip</h3>
              <button onClick={() => setGeneratePayslipOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const employeeId = target.employeeId.value;
              const month = parseInt(target.month.value);
              const year = parseInt(target.year.value);
              const basicSalary = parseFloat(target.basicSalary.value);
              const allowances = parseFloat(target.allowances.value || '0');
              const deductions = parseFloat(target.deductions.value || '0');
              const notes = target.notes.value;
              generatePayslipMutation.mutate({ employeeId, month, year, basicSalary, allowances, deductions, notes });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Employee</label>
                <select name="employeeId" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="">— Select Employee —</option>
                  {employees.filter((emp: any) => emp.id !== user?.id).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.designation || 'Staff'})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Month</label>
                  <select name="month" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString([], { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Year</label>
                  <input type="number" name="year" defaultValue={new Date().getFullYear()} className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Basic Salary ($)</label>
                <input type="number" name="basicSalary" step="0.01" required placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Allowances ($)</label>
                  <input type="number" name="allowances" step="0.01" placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deductions ($)</label>
                  <input type="number" name="deductions" step="0.01" placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea name="notes" rows={2} placeholder="Add comments or notes..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <button
                type="submit"
                disabled={generatePayslipMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {generatePayslipMutation.isPending ? 'Generating...' : 'Generate Payslip'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SHIFT MODAL (MANAGER ONLY) */}
      {assignShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Assign Shift Assignment</h3>
              <button onClick={() => setAssignShiftOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-855 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const employeeId = target.employeeId.value;
              const shiftId = target.shiftId.value;
              const startDate = target.startDate.value;
              const endDate = target.endDate.value;
              assignShiftMutation.mutate({ employeeId, shiftId, startDate, endDate });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Employee</label>
                <select name="employeeId" required className="w-full bg-slate-50 dark:bg-slate-855 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="">— Select Employee —</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.designation || 'Staff'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Shift</label>
                <select name="shiftId" required className="w-full bg-slate-50 dark:bg-slate-855 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="">— Select Shift —</option>
                  {shifts.map((sh: any) => (
                    <option key={sh.id} value={sh.id}>{sh.name} ({sh.startTime} - {sh.endTime})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input type="date" name="startDate" required className="w-full bg-slate-50 dark:bg-slate-855 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                  <input type="date" name="endDate" required className="w-full bg-slate-50 dark:bg-slate-855 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <button
                type="submit"
                disabled={assignShiftMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {assignShiftMutation.isPending ? 'Assigning...' : 'Assign Shift'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST SHIFT SWAP MODAL */}
      {swapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Request Shift Swap</h3>
              <button onClick={() => setSwapModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const requesterAssignmentId = target.requesterAssignmentId.value;
              const assigneeId = target.assigneeId.value;
              const assigneeAssignmentId = target.assigneeAssignmentId.value;
              createSwapRequestMutation.mutate({ requesterAssignmentId, assigneeId, assigneeAssignmentId });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">My Shift Assignment to Swap</label>
                <select name="requesterAssignmentId" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="">— Select My Shift —</option>
                  {shiftAssignments.filter((a: any) => a.userId === user?.id).map((assign: any) => (
                    <option key={assign.id} value={assign.id}>
                      {assign.shift?.name} ({new Date(assign.startDate).toLocaleDateString()} - {assign.shift?.startTime})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teammate to Swap With</label>
                <select 
                  name="assigneeId" 
                  value={swapCoworkerId}
                  onChange={(e) => setSwapCoworkerId(e.target.value)}
                  required 
                  className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                >
                  <option value="">— Select Coworker —</option>
                  {employees.filter((emp: any) => emp.id !== user?.id).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teammate's Shift Assignment ID</label>
                <select name="assigneeAssignmentId" required className="w-full bg-slate-50 dark:bg-slate-855 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="">— Select Teammate's Shift —</option>
                  {shiftAssignments.filter((a: any) => a.userId === swapCoworkerId).map((assign: any) => (
                    <option key={assign.id} value={assign.id}>
                      {assign.shift?.name} ({new Date(assign.startDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={createSwapRequestMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {createSwapRequestMutation.isPending ? 'Sending...' : 'Send Swap Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DEFINE SHIFT MODAL (MANAGER ONLY) */}
      {createShiftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Define New Shift Type</h3>
              <button onClick={() => setCreateShiftOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const name = target.shiftName.value;
              const startTime = target.startTime.value;
              const endTime = target.endTime.value;
              const color = target.color.value;
              const description = target.description.value;
              createShiftMutation.mutate({ name, startTime, endTime, color, description });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shift Name</label>
                <input type="text" name="shiftName" required placeholder="e.g. Morning Shift, Night Shift" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input type="text" name="startTime" required placeholder="e.g. 09:00 AM" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Time</label>
                  <input type="text" name="endTime" required placeholder="e.g. 05:00 PM" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Label Color (Hex / Name)</label>
                <input type="text" name="color" defaultValue="#3b82f6" placeholder="e.g. #10b981" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea name="description" rows={2} placeholder="Shift details..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <button
                type="submit"
                disabled={createShiftMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD HOLIDAY MODAL (MANAGER ONLY) */}
      {addHolidayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Add New Company Holiday</h3>
              <button onClick={() => setAddHolidayOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const name = target.holidayName.value;
              const date = target.date.value;
              const isMandatory = target.isMandatory.checked;
              const description = target.description.value;
              createHolidayMutation.mutate({ name, date, isMandatory, description });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Holiday Name</label>
                <input type="text" name="holidayName" required placeholder="e.g. Independence Day" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Holiday Date</label>
                <input type="date" name="date" required className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isMandatory" name="isMandatory" defaultChecked className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded" />
                <label htmlFor="isMandatory" className="text-xs font-bold text-slate-700 dark:text-slate-300">Mandatory (Office Closed)</label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea name="description" rows={2} placeholder="Optional holiday details..." className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" />
              </div>
              <button
                type="submit"
                disabled={createHolidayMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {createHolidayMutation.isPending ? 'Creating...' : 'Create Holiday'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RECOGNIZE TEAMMATE MODAL */}
      {recognitionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Recognize a Teammate
              </h3>
              <button onClick={() => setRecognitionModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as HTMLFormElement;
              const receiverId = target.receiverId.value;
              const badge = target.badge.value;
              const message = target.message.value;
              createRecognitionMutation.mutate({ receiverId, badge, message });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Who would you like to recognize?</label>
                <select 
                  name="receiverId" 
                  value={selectedTeammateId}
                  onChange={(e) => setSelectedTeammateId(e.target.value)}
                  required 
                  className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
                >
                  <option value="">— Select Teammate —</option>
                  {employees.filter((emp: any) => emp.id !== user?.id).map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Choose a Badge</label>
                <select name="badge" className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none">
                  <option value="TEAM_PLAYER">🤝 Team Player</option>
                  <option value="INNOVATOR">💡 Innovator</option>
                  <option value="CUSTOMER_CHAMPION">🏆 Customer Champion</option>
                  <option value="ROCKSTAR">⭐ Rockstar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Praise Message
                </label>
                <textarea 
                  name="message" 
                  rows={3} 
                  required 
                  value={praiseMessage}
                  onChange={(e) => setPraiseMessage(e.target.value)}
                  placeholder="Write a public message of appreciation..." 
                  className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none" 
                />
              </div>
              <button
                type="submit"
                disabled={createRecognitionMutation.isPending}
                className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-dark transition-all"
              >
                {createRecognitionMutation.isPending ? 'Sending...' : 'Send Recognition'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
