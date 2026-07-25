import React from 'react';
import { Award, Trash2, Heart, MessageSquare } from 'lucide-react';
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Peer Recognition Board</h3>
        <button
          onClick={onOpenRecognitionModal}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black text-white bg-primary rounded-xl shadow-md hover:bg-primary-dark transition-all"
        >
          <Award className="h-4 w-4" />
          Recognize Teammate
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recognitions.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                Be the first to recognize a colleague for their outstanding work!
              </div>
            ) : (
              recognitions.map((rec: any) => {
                const recLikes = likesMap[rec.id] || { count: Math.floor(Math.random() * 5) + 1, liked: false };

                return (
                  <div
                    key={rec.id}
                    className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this recognition post?')) {
                            onDeleteRecognition(rec.id);
                          }
                        }}
                        className="absolute top-5 right-5 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 transition-colors"
                        title="Delete recognition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <div className="space-y-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-105 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold uppercase text-slate-500 shrink-0 border border-slate-200 dark:border-slate-800">
                          {rec.sender?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
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

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getBadgeColors(rec.badge)}`}>
                        {getBadgeIcon(rec.badge)}
                        {rec.badge.replace('_', ' ')}
                      </span>

                      <div className="relative pl-4 border-l-2 border-primary/20">
                        <p className="text-xs text-slate-650 dark:text-slate-300 italic leading-relaxed">&quot;{rec.message}&quot;</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex flex-col space-y-3">
                      <div className="flex items-center gap-2.5 text-left">
                        <div className="h-8 w-8 rounded-full bg-slate-105 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-[10px] font-bold uppercase text-slate-500 shrink-0 border border-slate-200 dark:border-slate-800">
                          {rec.receiver?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rec.receiver.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            `${rec.receiver?.firstName?.[0]}${rec.receiver?.lastName?.[0]}`
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white leading-tight truncate">
                            {rec.receiver?.firstName} {rec.receiver?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-450 truncate">{rec.receiver?.designation || 'Teammate'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-slate-450 text-[10px] pt-1">
                        <button
                          onClick={() => onToggleLike(rec.id)}
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
      </div>

      <CelebrationsWidget variant="full" />
    </div>
  );
}
