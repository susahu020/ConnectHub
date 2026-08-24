import React from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HolidaysTab({
  holidays,
  isManager,
  onAddHoliday,
  onDeleteHoliday,
}: {
  holidays: any[];
  isManager: boolean;
  onAddHoliday: () => void;
  onDeleteHoliday: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t('hr.holidays.heading')}</h3>
        {isManager && (
          <button
            onClick={onAddHoliday}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
          >
            <Plus className="h-4 w-4" />
            {t('hr.holidays.addHoliday')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holidays.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            {t('hr.holidays.noHolidays')}
          </div>
        ) : (
          holidays.map((hol: any) => (
            <div
              key={hol.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex justify-between items-start"
            >
              <div className="space-y-2">
                <p className="text-xs font-black text-primary uppercase tracking-wider">
                  {new Date(hol.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <h4 className="text-base font-black text-slate-800 dark:text-white leading-tight">{hol.name}</h4>
                <p className="text-xs text-slate-500 max-w-[200px]">{hol.description || t('hr.holidays.noDescription')}</p>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    hol.isMandatory ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {hol.isMandatory ? t('hr.holidays.mandatory') : t('hr.holidays.optional')}
                </span>
              </div>
              {isManager && (
                <button onClick={() => onDeleteHoliday(hol.id)} className="p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" title={t('hr.holidays.deleteHoliday')}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
