'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../../../hooks/useSocket';
import { useOrganizationSettings } from '../../../hooks/useOrganizationSettings';
import { HRStatCards } from '../../../components/hr/HRStatCards';
import { HRTabsNav, HRTabType } from '../../../components/hr/HRTabsNav';
import { LeaveTab } from '../../../components/hr/tabs/LeaveTab';
import { AttendanceTab } from '../../../components/hr/tabs/AttendanceTab';
import { HolidaysTab } from '../../../components/hr/tabs/HolidaysTab';
import { ExpensesTab } from '../../../components/hr/tabs/ExpensesTab';
import { PayslipsTab } from '../../../components/hr/tabs/PayslipsTab';
import { ShiftsTab } from '../../../components/hr/tabs/ShiftsTab';
import { RecognitionTab } from '../../../components/hr/tabs/RecognitionTab';
import { EditAttendanceModal } from '../../../components/hr/modals/EditAttendanceModal';
import { RequestLeaveModal } from '../../../components/hr/modals/RequestLeaveModal';
import { ExpenseClaimModal } from '../../../components/hr/modals/ExpenseClaimModal';
import { PayslipDetailModal } from '../../../components/hr/modals/PayslipDetailModal';
import { GeneratePayslipModal } from '../../../components/hr/modals/GeneratePayslipModal';
import { AssignShiftModal } from '../../../components/hr/modals/AssignShiftModal';
import { RequestSwapModal } from '../../../components/hr/modals/RequestSwapModal';
import { CreateShiftModal } from '../../../components/hr/modals/CreateShiftModal';
import { AddHolidayModal } from '../../../components/hr/modals/AddHolidayModal';
import { RecognizeTeammateModal } from '../../../components/hr/modals/RecognizeTeammateModal';

export default function HRPortal() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { settings: orgSettings } = useOrganizationSettings();
  const [activeTab, setActiveTab] = useState<HRTabType>('leave');

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
  const { data: directoryData } = useQuery({
    queryKey: ['hr-directory'],
    queryFn: () => api.getDirectory('limit=100'),
    enabled: !!user,
  });
  const employees = directoryData?.users || [];

  const { data: leaves = [] } = useQuery({
    queryKey: ['hr-leaves'],
    queryFn: () => api.getLeaves(),
    enabled: !!user,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['hr-leave-balances'],
    queryFn: () => api.getLeaveBalances(),
    enabled: !!user,
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ['hr-today-attendance'],
    queryFn: () => api.getTodayAttendance(),
    enabled: !!user,
  });

  const { data: attendanceLogs = [] } = useQuery({
    queryKey: ['hr-attendance-logs'],
    queryFn: () => api.getAttendanceLogs(isManager ? 'all=true' : ''),
    enabled: !!user,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['hr-holidays'],
    queryFn: () => api.getHolidays(),
    enabled: !!user,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['hr-expenses'],
    queryFn: () => api.getExpenseClaims(),
    enabled: !!user,
  });

  const { data: payslips = [] } = useQuery({
    queryKey: ['hr-payslips'],
    queryFn: () => api.getPayslips(),
    enabled: !!user,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['hr-shifts'],
    queryFn: () => api.getShifts(),
    enabled: !!user,
  });

  const { data: shiftAssignments = [] } = useQuery({
    queryKey: ['hr-shift-assignments'],
    queryFn: () => api.getShiftAssignments(),
    enabled: !!user,
  });

  // The roster table is labeled "My Shift Calendar" for non-managers, so it should
  // only ever show that person's own assignments — the full `shiftAssignments` list
  // (all employees) is still needed as-is for the swap-request modal's teammate
  // picker below, which is why we don't filter the query itself.
  const visibleShiftAssignments = isManager
    ? shiftAssignments
    : shiftAssignments.filter((a: any) => a.userId === user?.id);

  const { data: swapRequests = [] } = useQuery({
    queryKey: ['hr-shift-swaps'],
    queryFn: () => api.getShiftSwapRequests(),
    enabled: !!user,
  });

  const { data: recognitions = [] } = useQuery({
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
    onSuccess: () => toast.success('Holiday deleted'),
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

  const handleToggleLike = (id: string) => {
    setLikesMap((prev) => {
      const cur = prev[id] || { count: Math.floor(Math.random() * 5) + 1, liked: false };
      const nextLiked = !cur.liked;
      return {
        ...prev,
        [id]: {
          count: nextLiked ? cur.count + 1 : Math.max(0, cur.count - 1),
          liked: nextLiked,
        },
      };
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950">
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

      <HRStatCards todayAttendance={todayAttendance} balances={balances} shiftAssignments={shiftAssignments} recognitions={recognitions} currentUserId={user?.id} />

      <HRTabsNav activeTab={activeTab} onChange={setActiveTab} />

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'leave' && (
              <LeaveTab
                leaves={leaves}
                balances={balances}
                currentUserId={user?.id}
                isManager={isManager}
                isAdmin={isAdmin}
                onOpenLeaveModal={() => setLeaveModalOpen(true)}
                onUpdateLeaveStatus={(id, status, managerNotes) => updateLeaveStatusMutation.mutate({ id, body: { status, managerNotes } })}
                onDeleteLeave={(id) => deleteLeaveMutation.mutate(id)}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceTab
                timeStr={timeStr}
                todayAttendance={todayAttendance}
                attendanceLogs={attendanceLogs}
                isManager={isManager}
                isAdmin={isAdmin}
                onClockIn={() => clockInMutation.mutate(undefined)}
                onClockOut={(notes) => clockOutMutation.mutate({ notes })}
                onStartBreak={() => startBreakMutation.mutate()}
                onEndBreak={() => endBreakMutation.mutate()}
                onEditLog={(log) => {
                  setSelectedLog(log);
                  setEditAttendanceOpen(true);
                }}
                onDeleteLog={(id) => deleteAttendanceLogMutation.mutate(id)}
              />
            )}

            {activeTab === 'holidays' && (
              <HolidaysTab
                holidays={holidays}
                isManager={isManager}
                onAddHoliday={() => setAddHolidayOpen(true)}
                onDeleteHoliday={(id) => deleteHolidayMutation.mutate(id)}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab
                expenses={expenses}
                currentUserId={user?.id}
                isManager={isManager}
                isAdmin={isAdmin}
                onOpenExpenseModal={() => setExpenseModalOpen(true)}
                onUpdateExpenseStatus={(id, status, managerNotes) => updateExpenseStatusMutation.mutate({ id, body: { status, managerNotes } })}
                onDeleteExpense={(id) => deleteExpenseMutation.mutate(id)}
              />
            )}

            {activeTab === 'payslips' && (
              <PayslipsTab
                payslips={payslips}
                isManager={isManager}
                isAdmin={isAdmin}
                onGeneratePayslip={() => setGeneratePayslipOpen(true)}
                onViewPayslip={(pay) => {
                  setActivePayslip(pay);
                  setPayslipModalOpen(true);
                }}
                onMarkPaid={(id) => updatePayslipStatusMutation.mutate({ id, status: 'PAID' })}
                onDeletePayslip={(id) => deletePayslipMutation.mutate(id)}
              />
            )}

            {activeTab === 'shifts' && (
              <ShiftsTab
                shiftAssignments={visibleShiftAssignments}
                swapRequests={swapRequests}
                isManager={isManager}
                isAdmin={isAdmin}
                currentUserId={user?.id}
                onOpenSwapModal={() => setSwapModalOpen(true)}
                onOpenCreateShiftModal={() => setCreateShiftOpen(true)}
                onOpenAssignShiftModal={() => setAssignShiftOpen(true)}
                onDeleteShiftAssignment={(id) => deleteShiftAssignmentMutation.mutate(id)}
                onUpdateSwapStatus={(id, status) => updateSwapRequestStatusMutation.mutate({ id, status })}
              />
            )}

            {activeTab === 'recognition' && (
              <RecognitionTab
                recognitions={recognitions}
                likesMap={likesMap}
                onToggleLike={handleToggleLike}
                isAdmin={isAdmin}
                onOpenRecognitionModal={() => {
                  setSelectedTeammateId('');
                  setPraiseMessage('');
                  setRecognitionModalOpen(true);
                }}
                onDeleteRecognition={(id) => deleteRecognitionMutation.mutate(id)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------
          MODALS & FORMS
          ---------------------------------------------------- */}

      <EditAttendanceModal
        open={editAttendanceOpen}
        log={selectedLog}
        onClose={() => setEditAttendanceOpen(false)}
        isPending={updateAttendanceLogMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const clockIn = (target as any).clockIn.value;
          const clockOut = (target as any).clockOut.value || null;
          const status = (target as any).status.value;
          const notes = (target as any).notes.value;
          updateAttendanceLogMutation.mutate({ id: selectedLog.id, body: { clockIn, clockOut, status, notes } });
        }}
      />

      <RequestLeaveModal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        isPending={requestLeaveMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const leaveType = (target as any).leaveType.value;
          const startDate = (target as any).startDate.value;
          const endDate = (target as any).endDate.value;
          const reason = (target as any).reason.value;
          requestLeaveMutation.mutate({ leaveType, startDate, endDate, reason });
        }}
      />

      <ExpenseClaimModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        isPending={createExpenseClaimMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const title = (target.elements.namedItem('title') as HTMLInputElement).value;
          const category = (target as any).category.value;
          const amount = parseFloat((target as any).amount.value);
          const receiptUrl = (target as any).receiptUrl.value;
          const description = (target as any).description.value;
          createExpenseClaimMutation.mutate({ title, category, amount, receiptUrl, description });
        }}
      />

      {payslipModalOpen && activePayslip && (
        <PayslipDetailModal payslip={activePayslip} orgName={orgSettings.orgName} onClose={() => setPayslipModalOpen(false)} />
      )}

      <GeneratePayslipModal
        open={generatePayslipOpen}
        onClose={() => setGeneratePayslipOpen(false)}
        employees={employees}
        currentUserId={user?.id}
        isPending={generatePayslipMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const employeeId = (target as any).employeeId.value;
          const month = parseInt((target as any).month.value);
          const year = parseInt((target as any).year.value);
          const basicSalary = parseFloat((target as any).basicSalary.value);
          const allowances = parseFloat((target as any).allowances.value || '0');
          const deductions = parseFloat((target as any).deductions.value || '0');
          const notes = (target as any).notes.value;
          generatePayslipMutation.mutate({ employeeId, month, year, basicSalary, allowances, deductions, notes });
        }}
      />

      <AssignShiftModal
        open={assignShiftOpen}
        onClose={() => setAssignShiftOpen(false)}
        employees={employees}
        shifts={shifts}
        isPending={assignShiftMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const employeeId = (target as any).employeeId.value;
          const shiftId = (target as any).shiftId.value;
          const startDate = (target as any).startDate.value;
          const endDate = (target as any).endDate.value;
          assignShiftMutation.mutate({ employeeId, shiftId, startDate, endDate });
        }}
      />

      <RequestSwapModal
        open={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        employees={employees}
        currentUserId={user?.id}
        shiftAssignments={shiftAssignments}
        swapCoworkerId={swapCoworkerId}
        onSwapCoworkerIdChange={setSwapCoworkerId}
        isPending={createSwapRequestMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const requesterAssignmentId = (target as any).requesterAssignmentId.value;
          const assigneeId = (target as any).assigneeId.value;
          const assigneeAssignmentId = (target as any).assigneeAssignmentId.value;
          createSwapRequestMutation.mutate({ requesterAssignmentId, assigneeId, assigneeAssignmentId });
        }}
      />

      <CreateShiftModal
        open={createShiftOpen}
        onClose={() => setCreateShiftOpen(false)}
        isPending={createShiftMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const name = (target as any).shiftName.value;
          const startTime = (target as any).startTime.value;
          const endTime = (target as any).endTime.value;
          const color = (target as any).color.value;
          const description = (target as any).description.value;
          createShiftMutation.mutate({ name, startTime, endTime, color, description });
        }}
      />

      <AddHolidayModal
        open={addHolidayOpen}
        onClose={() => setAddHolidayOpen(false)}
        isPending={createHolidayMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const name = (target as any).holidayName.value;
          const date = (target as any).date.value;
          const isMandatory = (target as any).isMandatory.checked;
          const description = (target as any).description.value;
          createHolidayMutation.mutate({ name, date, isMandatory, description });
        }}
      />

      <RecognizeTeammateModal
        open={recognitionModalOpen}
        onClose={() => setRecognitionModalOpen(false)}
        employees={employees}
        currentUserId={user?.id}
        selectedTeammateId={selectedTeammateId}
        onSelectedTeammateIdChange={setSelectedTeammateId}
        praiseMessage={praiseMessage}
        onPraiseMessageChange={setPraiseMessage}
        isPending={createRecognitionMutation.isPending}
        onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as HTMLFormElement;
          const receiverId = (target as any).receiverId.value;
          const badge = (target as any).badge.value;
          const message = (target as any).message.value;
          createRecognitionMutation.mutate({ receiverId, badge, message });
        }}
      />
    </div>
  );
}
