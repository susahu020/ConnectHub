import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function SkillsTab({
  profile,
  isOwnProfile,
  onAddSkill,
  onDeleteSkill,
}: {
  profile: any;
  isOwnProfile: boolean;
  onAddSkill: () => void;
  onDeleteSkill: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold uppercase text-slate-450 tracking-wider">Expertise & Competencies</h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Verified tags, skill categories, and years of experience indicators.</p>
        </div>
        {isOwnProfile && (
          <button onClick={onAddSkill} className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Skill</span>
          </button>
        )}
      </div>

      {profile?.userSkills && profile.userSkills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.userSkills.map((sk: any) => (
            <div key={sk.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black text-slate-900 dark:text-white">{sk.skillName}</p>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase">{sk.level}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                  <span>{sk.yearsOfExp} Years Exp</span>
                  {sk.category && (
                    <>
                      <span className="h-1 w-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                      <span>{sk.category}</span>
                    </>
                  )}
                </div>
              </div>
              {isOwnProfile && (
                <button onClick={() => onDeleteSkill(sk.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-12 font-semibold">No expertise skills have been logged yet.</p>
      )}
    </div>
  );
}
