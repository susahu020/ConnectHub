import React from 'react';
import { Award, Trash2, Heart, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CelebrationsWidget from '../../CelebrationsWidget';
import { getBadgeIcon, getBadgeColors } from '../recognitionBadges';

export function RecognitionTab({
  recognitions,
  likesMap,
  onToggleLike,
  isAdmin,
  onOpenRecognitionModal,
  onDeleteRecognition,
}: {
  recognitions: any[];
  likesMap: Record<string, { count: number; liked: boolean }>;
  onToggleLike: (id: string) => void;
  isAdmin: boolean;
  onOpenRecognitionModal: () => void;
  onDeleteRecognition: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">{t('hr.recognition.heading')}</h3>
        <button
          onClick={onOpenRecognitionModal}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-primary-foreground bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
        >
          <Award className="h-4 w-4" />
          {t('hr.recognition.recognizeTeammate')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recognitions.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-card dark:bg-card border border-border dark:border-border rounded-2xl text-muted-foreground">
                {t('hr.recognition.emptyBoard')}
              </div>
            ) : (
              recognitions.map((rec: any) => {
                const recLikes = likesMap[rec.id] || { count: Math.floor(Math.random() * 5) + 1, liked: false };

                return (
                  <div
                    key={rec.id}
                    className="relative bg-card dark:bg-card border border-border dark:border-border rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(t('hr.recognition.deleteConfirm'))) {
                            onDeleteRecognition(rec.id);
                          }
                        }}
                        className="absolute top-5 right-5 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 transition-colors"
                        title={t('hr.recognition.deleteRecognition')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <div className="space-y-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-secondary dark:bg-card overflow-hidden flex items-center justify-center font-bold uppercase text-muted-foreground shrink-0 border border-border dark:border-border">
                          {rec.sender?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rec.sender.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            `${rec.sender?.firstName?.[0]}${rec.sender?.lastName?.[0]}`
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-foreground leading-tight">
                            {rec.sender?.firstName} {rec.sender?.lastName}
                          </h4>
                          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{rec.sender?.designation || t('hr.recognition.staffMember')}</p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getBadgeColors(rec.badge)}`}>
                        {getBadgeIcon(rec.badge)}
                        {rec.badge.replace('_', ' ')}
                      </span>

                      <div className="relative pl-4 border-l-2 border-primary/20">
                        <p className="text-xs text-muted-foreground dark:text-foreground italic leading-relaxed">&quot;{rec.message}&quot;</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border dark:border-border flex flex-col space-y-3">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="h-8 w-8 rounded-full bg-secondary dark:bg-card overflow-hidden flex items-center justify-center text-[10px] font-bold uppercase text-muted-foreground shrink-0 border border-border dark:border-border">
                          {rec.receiver?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rec.receiver.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            `${rec.receiver?.firstName?.[0]}${rec.receiver?.lastName?.[0]}`
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground leading-tight truncate">
                            {rec.receiver?.firstName} {rec.receiver?.lastName}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{rec.receiver?.designation || 'Teammate'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-muted-foreground text-[10px] pt-1">
                        <button
                          onClick={() => onToggleLike(rec.id)}
                          className={`flex items-center gap-1.5 font-bold hover:text-rose-500 transition-colors ${recLikes.liked ? 'text-rose-500' : ''}`}
                        >
                          <Heart className={`h-4 w-4 ${recLikes.liked ? 'fill-current' : ''}`} />
                          <span>{recLikes.count} {t('hr.recognition.likes')}</span>
                        </button>
                        <div className="flex items-center gap-1.5 font-bold">
                          <MessageSquare className="h-4 w-4" />
                          <span>{t('hr.recognition.publicRecognition')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <CelebrationsWidget variant="full" />
    </div>
  );
}
