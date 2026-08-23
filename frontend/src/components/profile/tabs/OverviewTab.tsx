import React from 'react';
import { useRouter } from 'next/navigation';
import { Trello, ExternalLink, Loader2, Lock } from 'lucide-react';
import { useAuthStore } from '../../../lib/store';

export function OverviewTab({
  profile,
  userTasks,
  loadingTasks,
  isOwnProfile,
}: {
  profile: any;
  userTasks: any[] | undefined;
  loadingTasks: boolean;
  isOwnProfile: boolean;
}) {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const completedCount = userTasks?.filter((t: any) => t.status === 'COMPLETED').length || 0;

  // Emergency contact and date of birth are only ever sent by the backend
  // to the profile owner or an Admin (see getProfileById) — this mirrors
  // that same rule on the display side, so a colleague sees a clear "Only
  // visible to you" placeholder instead of a field that just looks blank.
  const canSeePrivateHrFields = isOwnProfile || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">About Me</h3>
        <p className="text-xs text-muted-foreground dark:text-foreground leading-relaxed font-medium italic">
          {profile?.bio ||
            '"No bio information has been updated yet. Click edit profile to add details about your role, achievements, or workspace highlights."'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Employee Information</h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">User ID</span>
              <span className="text-foreground dark:text-foreground">{profile?.employeeId || 'Not Assigned'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Date of Birth</span>
              {canSeePrivateHrFields ? (
                <span className="text-foreground dark:text-foreground">
                  {profile?.birthday ? new Date(profile.birthday).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not Specified'}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Only visible to them
                </span>
              )}
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Joining Date</span>
              <span className="text-foreground dark:text-foreground">
                {profile?.joiningDate
                  ? new Date(profile.joiningDate).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Not Set by HR Yet'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Location</span>
              <span className="text-foreground dark:text-foreground">{profile?.location || 'Not Specified'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Office Location</span>
              <span className="text-foreground dark:text-foreground">{profile?.officeLocation || 'Main HQ'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Employee Type</span>
              <span className="text-foreground dark:text-foreground uppercase text-[10px] font-black bg-muted dark:bg-card px-2 py-0.5 rounded-full">
                {profile?.employmentType || 'FULL_TIME'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Working Hours</span>
              <span className="text-foreground dark:text-foreground">{profile?.workingHours || '9:00 AM - 5:00 PM'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Timezone</span>
              <span className="text-foreground dark:text-foreground">{profile?.timezone || 'UTC'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Emergency Contact</span>
              {canSeePrivateHrFields ? (
                <span className="text-foreground dark:text-foreground">{profile?.emergencyContact || 'Not Specified'}</span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Only visible to them
                </span>
              )}
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Last Login</span>
              <span className="text-foreground dark:text-foreground">{profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'}</span>
            </div>
          </div>
        </div>

        <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Contact & Social Channels</h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Work Email</span>
              <span className="text-foreground dark:text-foreground">{profile?.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Contact Phone</span>
              <span className="text-foreground dark:text-foreground">{profile?.phone || 'Not Specified'}</span>
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">LinkedIn</span>
              {profile?.socialLinks?.linkedin ? (
                <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  View profile <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-muted-foreground">Not Linked</span>
              )}
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">GitHub</span>
              {profile?.socialLinks?.github ? (
                <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  View repository <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-muted-foreground">Not Linked</span>
              )}
            </div>
            <div className="flex justify-between py-1 border-b dark:border-border">
              <span className="text-muted-foreground">Portfolio</span>
              {profile?.socialLinks?.portfolio ? (
                <a href={profile.socialLinks.portfolio} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  Visit Site <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-muted-foreground">Not Linked</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider flex items-center space-x-1.5">
              <Trello className="h-4 w-4 text-primary" />
              <span>Task Allocations</span>
            </h3>

            {loadingTasks ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex justify-between py-1 border-b dark:border-border">
                  <span className="text-muted-foreground">Total Assigned</span>
                  <span className="text-foreground dark:text-foreground">{userTasks?.length || 0} tasks</span>
                </div>
                <div className="flex justify-between py-1 border-b dark:border-border">
                  <span className="text-muted-foreground">In Progress</span>
                  <span className="text-primary font-bold">{userTasks?.filter((t: any) => t.status === 'IN_PROGRESS').length || 0} tasks</span>
                </div>
                <div className="flex justify-between py-1 border-b dark:border-border">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="text-green-500 font-bold">{completedCount} tasks</span>
                </div>
                <div className="flex justify-between py-1 border-b dark:border-border">
                  <span className="text-muted-foreground">Under Review</span>
                  <span className="text-amber-500 font-bold">{userTasks?.filter((t: any) => t.status === 'UNDER_REVIEW').length || 0} tasks</span>
                </div>
              </div>
            )}
          </div>

          {!loadingTasks && userTasks && userTasks.length > 0 && (
            <div className="pt-2">
              <div className="w-full bg-muted dark:bg-card h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${((completedCount / userTasks.length) * 100).toFixed(0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground font-bold mt-1.5 uppercase tracking-wider">
                <span>Task Completion rate</span>
                <span>{((completedCount / userTasks.length) * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Reporting Hierarchy</h3>

        <div className="space-y-4">
          {profile?.manager ? (
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Reporting Manager</span>
              <div
                onClick={() => router.push(`/profile?userId=${profile.manager.id}`)}
                className="flex items-center gap-3 p-3 bg-muted dark:bg-card hover:bg-muted dark:hover:bg-card border dark:border-border/60 rounded-2xl cursor-pointer transition-all w-full md:w-80"
              >
                <div className="h-10 w-10 bg-secondary dark:bg-card rounded-full overflow-hidden flex items-center justify-center font-bold text-muted-foreground uppercase">
                  {profile.manager.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.manager.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    `${profile.manager.firstName[0]}${profile.manager.lastName[0]}`
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold">
                    {profile.manager.firstName} {profile.manager.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-semibold">{profile.manager.designation || 'Manager'}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground font-medium italic">No manager hierarchy specified.</p>
          )}

          {profile?.directReports && profile.directReports.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">
                Direct Reports ({profile.directReports.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.directReports.map((report: any) => (
                  <div
                    key={report.id}
                    onClick={() => router.push(`/profile?userId=${report.id}`)}
                    className="flex items-center gap-3 p-3 bg-muted dark:bg-card hover:bg-muted dark:hover:bg-card border dark:border-border/60 rounded-2xl cursor-pointer transition-all"
                  >
                    <div className="h-10 w-10 bg-secondary dark:bg-card rounded-full overflow-hidden flex items-center justify-center font-bold text-muted-foreground uppercase">
                      {report.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={report.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        `${report.firstName[0]}${report.lastName[0]}`
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold">
                        {report.firstName} {report.lastName}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold">{report.designation || 'Staff Colleague'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
