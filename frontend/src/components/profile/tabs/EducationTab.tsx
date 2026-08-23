import React from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

export function EducationTab({
  profile,
  isOwnProfile,
  onAddEducation,
  onDeleteEducation,
  onAddCert,
  onDeleteCert,
}: {
  profile: any;
  isOwnProfile: boolean;
  onAddEducation: () => void;
  onDeleteEducation: (id: string) => void;
  onAddCert: () => void;
  onDeleteCert: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Education Credentials</h3>
          {isOwnProfile && (
            <button onClick={onAddEducation} className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Education</span>
            </button>
          )}
        </div>

        {profile?.educations && profile.educations.length > 0 ? (
          <div className="space-y-5">
            {profile.educations.map((edu: any) => (
              <div key={edu.id} className="flex items-start justify-between border-b dark:border-border last:border-0 pb-4 last:pb-0 gap-4">
                <div className="space-y-1 text-xs">
                  <h4 className="font-extrabold text-foreground text-sm">{edu.institution}</h4>
                  <p className="text-primary font-bold">
                    {edu.degree} {edu.branch ? `in ${edu.branch}` : ''}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold">
                    {edu.grade && <span>Grade: {edu.grade}</span>}
                    {(edu.startDate || edu.endDate) && (
                      <span>
                        {edu.startDate ? new Date(edu.startDate).getFullYear() : ''} – {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                      </span>
                    )}
                  </div>
                </div>
                {isOwnProfile && (
                  <button onClick={() => onDeleteEducation(edu.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8 font-semibold">No educational history recorded.</p>
        )}
      </div>

      <div className="bg-card dark:bg-card border dark:border-border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase text-muted-foreground tracking-wider">Professional Certifications</h3>
          {isOwnProfile && (
            <button onClick={onAddCert} className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Certificate</span>
            </button>
          )}
        </div>

        {profile?.certifications && profile.certifications.length > 0 ? (
          <div className="space-y-4">
            {profile.certifications.map((cert: any) => (
              <div key={cert.id} className="p-4 bg-muted dark:bg-card/40 border dark:border-border rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <p className="font-extrabold text-foreground text-sm">{cert.name}</p>
                  <p className="text-muted-foreground font-bold text-xs">Issued by: {cert.issuedBy}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Issued: {new Date(cert.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {cert.credentialUrl && (
                    <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="p-1.5 text-primary hover:bg-primary/10 rounded-lg">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {isOwnProfile && (
                    <button onClick={() => onDeleteCert(cert.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8 font-semibold">No certifications logged.</p>
        )}
      </div>
    </div>
  );
}
