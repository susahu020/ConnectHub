import React from 'react';
import { BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type NotificationCategory =
  | 'TASK_ASSIGNED'
  | 'MESSAGE'
  | 'ANNOUNCEMENT'
  | 'MENTION'
  | 'REMINDER'
  | 'SYSTEM'
  | 'MEETING'
  | 'GROUP_CREATED';

export type NotificationPreferences = Partial<Record<NotificationCategory, { inApp?: boolean; email?: boolean }>>;

const CATEGORY_LABELS: { key: NotificationCategory; label: string; description: string }[] = [
  { key: 'TASK_ASSIGNED', label: 'Task Assignments', description: 'A task is assigned or reassigned to you' },
  { key: 'MESSAGE', label: 'Messages', description: 'Direct messages and group chat activity' },
  { key: 'ANNOUNCEMENT', label: 'Announcements', description: 'Company-wide or team announcements' },
  { key: 'MENTION', label: 'Mentions', description: 'Someone @mentions you' },
  { key: 'REMINDER', label: 'Reminders', description: 'Deadline and follow-up reminders' },
  { key: 'MEETING', label: 'Meetings', description: 'Meeting invites, start times, and changes' },
  { key: 'GROUP_CREATED', label: 'Group Invites', description: "You're added to a new group" },
  { key: 'SYSTEM', label: 'System', description: 'Account and platform notices' },
];

// Both channels default to "on" (matches the backend default in
// notification.service.ts's resolveNotificationPreference) so a category
// with no saved preference yet still renders as checked.
function isChannelEnabled(prefs: NotificationPreferences, category: NotificationCategory, channel: 'inApp' | 'email'): boolean {
  return prefs[category]?.[channel] !== false;
}

export function NotificationPreferencesCard({
  preferences,
  onChange,
}: {
  preferences: NotificationPreferences;
  onChange: (next: NotificationPreferences) => void;
}) {
  const toggle = (category: NotificationCategory, channel: 'inApp' | 'email') => {
    const current = isChannelEnabled(preferences, category, channel);
    onChange({
      ...preferences,
      [category]: {
        ...preferences[category],
        [channel]: !current,
      },
    });
  };

  const { t } = useTranslation();
  return (
    <div className="bg-card dark:bg-card border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="border-b pb-3 flex items-center space-x-2">
        <BellRing className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-sm">{t('settings.notificationPreferences.title')}</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('settings.notificationPreferences.description')}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase text-[10px] tracking-wider border-b">
              <th className="text-left font-semibold py-2">{t('settings.notificationPreferences.category')}</th>
              <th className="text-center font-semibold py-2 w-20">{t('settings.notificationPreferences.inApp')}</th>
              <th className="text-center font-semibold py-2 w-20">{t('settings.notificationPreferences.email')}</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORY_LABELS.map(({ key, label, description }) => (
              <tr key={key} className="border-b last:border-0">
                <td className="py-2.5 pr-2">
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-muted-foreground text-[10px]">{description}</p>
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    aria-label={`${label} in-app notifications`}
                    checked={isChannelEnabled(preferences, key, 'inApp')}
                    onChange={() => toggle(key, 'inApp')}
                    className="rounded text-primary focus:ring-primary/25 h-4 w-4"
                  />
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    aria-label={`${label} email notifications`}
                    checked={isChannelEnabled(preferences, key, 'email')}
                    onChange={() => toggle(key, 'email')}
                    className="rounded text-primary focus:ring-primary/25 h-4 w-4"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
