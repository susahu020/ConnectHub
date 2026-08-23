import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function ExperienceTab({
  profile,
  isOwnProfile,
  onAddExperience,
  onDeleteExperience,
}: {
  profile: any;
  isOwnProfile: boolean;
  onAddExperience: () => void;
  onDeleteExperience: (id: string) => void;
}) {
  return (
    <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Professional Work History</h3>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Timeline track of companies, designations, and achievements.</p>
        </div>
        {isOwnProfile && (
          <button onClick={onAddExperience} className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Experience</span>
          </button>
        )}
      </div>

      {profile?.experiences && profile.experiences.length > 0 ? (
        <div className="relative pl-6 border-l border-border dark:border-border space-y-8">
          {profile.experiences.map((exp: any) => (
            <div key={exp.id} className="relative group">
              <span className="absolute -left-[30px] top-1 h-4 w-4 rounded-full bg-card dark:bg-card border-2 border-primary flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>

              <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs">
                  <div>
                    <h4 className="font-extrabold text-foreground text-sm">{exp.designation}</h4>
                    <p className="text-primary font-bold text-xs mt-0.5">
                      {exp.company} {exp.department ? `· ${exp.department}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {new Date(exp.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })} –{' '}
                      {exp.isCurrent ? 'Present' : new Date(exp.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    </span>
                    {isOwnProfile && (
                      <button onClick={() => onDeleteExperience(exp.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {exp.description && <p className="text-xs text-muted-foreground dark:text-muted-foreground font-medium leading-relaxed">{exp.description}</p>}

                {exp.achievements && (
                  <div className="text-xs font-semibold text-foreground dark:text-foreground">
                    <span className="font-bold text-[10px] uppercase text-muted-foreground tracking-wider block mb-0.5">Key Achievements</span>
                    <p className="italic">{exp.achievements}</p>
                  </div>
                )}

                {exp.technologies && exp.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {exp.technologies.map((tech: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground rounded text-[10px] font-bold">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-12 font-semibold">No work experiences registered on this profile.</p>
      )}
    </div>
  );
}
