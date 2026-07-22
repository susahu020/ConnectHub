'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../lib/store';
import { toast } from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket';
import { useOrganizationSettings } from '../hooks/useOrganizationSettings';

type WishType = 'birthday' | 'anniversary';

interface CelebrationsWidgetProps {
  // 'full'    -> everyone celebrating this month (used on the HR Recognition tab)
  // 'compact' -> only people celebrating today (used on the Dashboard)
  variant?: 'full' | 'compact';
  // When true, skip this component's own card wrapper/header — used when it's hosted
  // inside the Dashboard's standard draggable widget chrome, which supplies its own.
  embedded?: boolean;
}

// Shared by the HR Portal and the Dashboard so the "wish sent/disabled" logic and the
// compose modal only need to be built (and fixed) once.
export default function CelebrationsWidget({ variant = 'full', embedded = false }: CelebrationsWidgetProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { settings: orgSettings } = useOrganizationSettings();

  const [modalOpen, setModalOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [wishType, setWishType] = useState<WishType>('birthday');
  const [message, setMessage] = useState('');

  const { data: celebrations } = useQuery({
    queryKey: ['hr-celebrations'],
    queryFn: () => api.getCelebrations(),
    enabled: !!user,
  });

  const { data: celebrationWishes = [] } = useQuery({
    queryKey: ['hr-celebration-wishes'],
    queryFn: () => api.getCelebrationWishes(),
    enabled: !!user,
  });

  // Keep both queries live as teammates send wishes in real time
  useEffect(() => {
    if (!socket) return;
    const handleHRUpdate = (data: any) => {
      if (data?.type === 'RECOGNITION') {
        queryClient.invalidateQueries({ queryKey: ['hr-celebrations'] });
        queryClient.invalidateQueries({ queryKey: ['hr-celebration-wishes'] });
        queryClient.invalidateQueries({ queryKey: ['my-wishes'] });
      }
    };
    socket.on('hr_update', handleHRUpdate);
    return () => {
      socket.off('hr_update', handleHRUpdate);
    };
  }, [socket, queryClient]);

  const sendWishMutation = useMutation({
    mutationFn: api.createRecognition,
    onSuccess: () => {
      toast.success('Wishes sent!');
      setModalOpen(false);
      setTargetId('');
      setTargetName('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['hr-recognitions'] });
      queryClient.invalidateQueries({ queryKey: ['hr-celebration-wishes'] });
      queryClient.invalidateQueries({ queryKey: ['my-wishes'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send wishes'),
  });

  const today = new Date();
  const isToday = (date: any) => {
    const d = new Date(date);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  };

  const openWishModal = (person: any, type: WishType) => {
    const template = type === 'birthday'
      ? `🎂 Happy Birthday, ${person.firstName} ${person.lastName}!\n\nWishing you a wonderful birthday filled with happiness, good health, and memorable moments. Thank you for your hard work, dedication, and the positive energy you bring to our team every day.\n\nMay this new year of your life bring continued success, personal growth, and countless opportunities.\n\nHave an amazing birthday and a fantastic year ahead! 🎉🎁`
      : `🎉 Happy Work Anniversary, ${person.firstName} ${person.lastName}!\n\nToday, we celebrate your incredible journey with ${orgSettings.orgName} and thank you for your dedication, hard work, and valuable contributions.\n\nYour commitment, professionalism, and positive attitude have made a meaningful impact on our team and organization. We truly appreciate everything you do and look forward to achieving many more milestones together.\n\n✨ Congratulations on your ${person.years} year${person.years > 1 ? 's' : ''} with us!\n\nWe wish you continued success, growth, and happiness in the years ahead.\n\nHappy Work Anniversary! 🎊`;
    setTargetId(person.id);
    setTargetName(`${person.firstName} ${person.lastName}`);
    setWishType(type);
    setMessage(template);
    setModalOpen(true);
  };

  const submitWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !message.trim()) return;
    sendWishMutation.mutate({ receiverId: targetId, badge: 'TEAM_PLAYER', message });
  };

  const renderPerson = (person: any, type: WishType) => {
    const marker = type === 'birthday' ? 'Happy Birthday' : 'Work Anniversary';
    const todayFlag = isToday(person.date);
    const isSelf = person.id === user?.id;
    const wishesForPerson = celebrationWishes.filter((w: any) =>
      w.receiver?.id === person.id && w.message.includes(marker)
    );
    const alreadySent = wishesForPerson.some((w: any) => w.sender?.id === user?.id);

    const subtitle = type === 'birthday'
      ? new Date(person.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : `${person.years} Year${person.years > 1 ? 's' : ''} Completed • ${new Date(person.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

    const sentLabel = type === 'birthday' ? 'Wished ❤️' : 'Congratulated 🎖️';
    const actionLabel = type === 'birthday' ? 'Wish 🎉' : 'Congratulate 🎖️';
    const alreadySentTitle = type === 'birthday' ? 'Already wished!' : 'Already congratulated!';
    const sendTitle = type === 'birthday' ? 'Send wishes!' : 'Send congratulations!';
    const activeOnDayTitle = type === 'birthday' ? 'Active on actual birthday' : 'Active on actual anniversary';

    return (
      <div key={`${type}-${person.id}`} className="border-b border-slate-50 dark:border-slate-850 pb-2 last:border-b-0 last:pb-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-slate-105 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold uppercase text-slate-650 dark:text-slate-350 shrink-0">
              {person.avatarUrl ? (
                <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                `${person.firstName?.[0]}${person.lastName?.[0]}`
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{person.firstName} {person.lastName}</p>
              <p className="text-[9px] text-slate-400 leading-none truncate">{subtitle}</p>
            </div>
          </div>
          {isSelf && todayFlag ? (
            <span
              className="px-2.5 py-1.5 text-[9px] font-black rounded-xl shrink-0 bg-warm/10 text-warm-dark dark:text-warm"
              title="Check the top of your dashboard for your wishes"
            >
              {type === 'birthday' ? "🎂 It's your day!" : "🎖️ It's your day!"}
            </span>
          ) : (
            <button
              disabled={!todayFlag || alreadySent}
              onClick={() => openWishModal(person, type)}
              className={`px-2.5 py-1.5 text-[9px] font-black rounded-xl transition-all shrink-0 ${
                todayFlag && !alreadySent
                  ? 'text-white bg-warm hover:bg-warm-dark shadow-xs'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
              }`}
              title={alreadySent ? alreadySentTitle : (todayFlag ? sendTitle : activeOnDayTitle)}
            >
              {alreadySent ? sentLabel : (todayFlag ? actionLabel : 'Upcoming')}
            </button>
          )}
        </div>

        {todayFlag && wishesForPerson.length > 0 && (
          <div className="ml-11 max-h-24 overflow-y-auto space-y-1.5 pr-1">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
              {wishesForPerson.length} Wish{wishesForPerson.length > 1 ? 'es' : ''} Received
            </p>
            {wishesForPerson.map((w: any) => (
              <div key={w.id} className="bg-slate-50 dark:bg-slate-850 rounded-lg px-2.5 py-1.5">
                <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300">{w.sender?.firstName} {w.sender?.lastName}</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{w.message.split('\n')[0]}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const modal = modalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 animate-scale-up">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {wishType === 'birthday' ? 'Birthday Wishes !!' : 'Work Anniversary Wishes !!'}
          </h3>
          <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submitWish} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {wishType === 'birthday' ? 'Sending birthday wishes to' : 'Sending anniversary wishes to'}
            </label>
            <p className="w-full bg-slate-50 dark:bg-slate-850 border border-transparent rounded-xl px-3.5 py-2 text-xs font-bold text-foreground">
              {targetName}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {wishType === 'birthday' ? 'Birthday Message' : 'Work Anniversary Message'}
            </label>
            <textarea
              rows={5}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a public message of appreciation..."
              className="w-full bg-slate-50 dark:bg-slate-850 border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={sendWishMutation.isPending}
            className="w-full py-2.5 bg-warm text-white text-xs font-black rounded-xl hover:bg-warm-dark transition-all"
          >
            {sendWishMutation.isPending ? 'Sending...' : 'Send Wishes'}
          </button>
        </form>
      </div>
    </div>
  );

  if (variant === 'compact') {
    const todaysBirthdays = (celebrations?.birthdays || []).filter((b: any) => isToday(b.date));
    const todaysAnniversaries = (celebrations?.anniversaries || []).filter((a: any) => isToday(a.date));
    const hasAny = todaysBirthdays.length > 0 || todaysAnniversaries.length > 0;

    const content = hasAny ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
        {todaysBirthdays.map((b: any) => renderPerson(b, 'birthday'))}
        {todaysAnniversaries.map((a: any) => renderPerson(a, 'anniversary'))}
      </div>
    ) : (
      <p className="text-xs text-slate-400 italic py-2">No birthdays or work anniversaries today. Check back tomorrow! 🎈</p>
    );

    if (embedded) {
      return (
        <>
          {content}
          {modal}
        </>
      );
    }

    if (!hasAny) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 text-left mb-6">
        <h3 className="text-sm font-black text-slate-850 dark:text-white border-b pb-2 flex items-center gap-2">
          🎉 Today's Celebrations
        </h3>
        {content}
        {modal}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 text-left">
        <h4 className="text-sm font-black text-slate-850 dark:text-white border-b pb-2 flex items-center gap-2">
          🎂 Birthdays This Month
        </h4>
        <div className="space-y-3">
          {celebrations?.birthdays?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No birthdays this month.</p>
          ) : (
            celebrations?.birthdays?.map((b: any) => renderPerson(b, 'birthday'))
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-3xl p-6 shadow-xs space-y-4 text-left">
        <h4 className="text-sm font-black text-slate-855 dark:text-white border-b pb-2 flex items-center gap-2">
          🎖️ Work Anniversaries
        </h4>
        <div className="space-y-3">
          {celebrations?.anniversaries?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No anniversaries this month.</p>
          ) : (
            celebrations?.anniversaries?.map((a: any) => renderPerson(a, 'anniversary'))
          )}
        </div>
      </div>

      {modal}
    </div>
  );
}
