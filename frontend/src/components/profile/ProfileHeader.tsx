import React from 'react';
import { toast } from 'react-hot-toast';
import { Upload, Loader2, Pencil, MessageSquare, PhoneCall, Layers, MapPin } from 'lucide-react';

const STATUS_DOT_CLASS: Record<string, string> = {
  ONLINE: 'bg-green-500',
  AWAY: 'bg-amber-500',
  BUSY: 'bg-red-500',
  DND: 'bg-rose-600',
  IN_MEETING: 'bg-primary',
  ON_LEAVE: 'bg-sky-500',
};

export function ProfileHeader({
  profile,
  isOwnProfile,
  uploadingImage,
  onAvatarClick,
  onCoverClick,
  avatarInputRef,
  coverInputRef,
  onAvatarChange,
  onCoverChange,
  onEditProfile,
  onStartChat,
  completion,
}: {
  profile: any;
  isOwnProfile: boolean;
  uploadingImage: boolean;
  onAvatarClick: () => void;
  onCoverClick: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditProfile: () => void;
  onStartChat: () => void;
  completion: { score: number };
}) {
  return (
    <div className="bg-card dark:bg-card border dark:border-border rounded-3xl overflow-hidden shadow-sm relative group">
      <div className="h-44 md:h-64 bg-muted dark:bg-card relative overflow-hidden">
        {profile?.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUrl} alt="Cover Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-primary-light to-warm opacity-80" />
        )}
        {isOwnProfile && (
          <button
            onClick={onCoverClick}
            className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-primary-foreground transition-all text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Change Cover</span>
          </button>
        )}
        <input type="file" ref={coverInputRef} onChange={onCoverChange} className="hidden" accept="image/*" />
      </div>

      <div className="p-6 md:p-8 pt-0 relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-5 -mt-16 md:-mt-20">
          <div className="relative group/avatar">
            <div className="h-28 w-28 md:h-36 md:w-36 bg-secondary dark:bg-card rounded-full flex items-center justify-center text-4xl font-black uppercase text-muted-foreground overflow-hidden border-4 border-card dark:border-border shadow-lg relative">
              {uploadingImage ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`
              )}
            </div>
            {isOwnProfile && (
              <button
                onClick={onAvatarClick}
                className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-primary-foreground"
              >
                <Upload className="h-6 w-6" />
              </button>
            )}
            <input type="file" ref={avatarInputRef} onChange={onAvatarChange} className="hidden" accept="image/*" />
          </div>

          <div className="text-center md:text-left space-y-1 pb-1">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                {profile?.firstName} {profile?.lastName}
              </h1>
              <span className={`h-2.5 w-2.5 rounded-full ring-4 ring-border dark:ring-border ${STATUS_DOT_CLASS[profile?.status] ?? 'bg-secondary'}`} />
            </div>
            <p className="text-sm font-extrabold text-primary uppercase tracking-wider">{profile?.designation || 'Specialist'}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground font-semibold">
              {profile?.department && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile.department.name}
                </span>
              )}
              {profile?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile.location}
                </span>
              )}
              {profile?.employeeId && (
                <span className="text-[10px] bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase">
                  ID: {profile.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          {isOwnProfile ? (
            <button
              onClick={onEditProfile}
              className="px-4 py-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm border border-border dark:border-border"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                onClick={onStartChat}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-sm shadow-primary/20"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Send Message</span>
              </button>
              <button
                onClick={() => toast.success('Calling feature simulation initiated.')}
                className="px-4 py-2 bg-muted hover:bg-secondary dark:bg-card dark:hover:bg-card text-foreground dark:text-foreground text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 border dark:border-border"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>Voice Call</span>
              </button>
            </>
          )}
        </div>
      </div>

      {isOwnProfile && completion.score < 100 && (
        <div className="px-6 md:px-8 pb-6 flex flex-col md:flex-row md:items-center gap-3 border-t dark:border-border pt-5">
          <div className="flex-1 space-y-1">
            <p className="text-xs font-bold text-foreground dark:text-foreground">Profile Completion: {completion.score}%</p>
            <p className="text-[10px] text-muted-foreground">
              {completion.score < 100
                ? 'Complete your profile to help teammates find and connect with you.'
                : 'Your workspace profile is fully completed!'}
            </p>
          </div>
          <div className="w-full md:w-64 bg-secondary dark:bg-card h-2.5 rounded-full overflow-hidden shrink-0">
            <div
              className="bg-gradient-to-r from-primary to-warm h-full rounded-full transition-all duration-500"
              style={{ width: `${completion.score}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
