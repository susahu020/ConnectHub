'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Loader2, ShieldAlert } from 'lucide-react';
import ImageCropperModal from '../../../components/ImageCropperModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../lib/store';
import { useSocket } from '../../../hooks/useSocket';
import { ProfileHeader } from '../../../components/profile/ProfileHeader';
import { ProfileTabsNav } from '../../../components/profile/ProfileTabsNav';
import { OverviewTab } from '../../../components/profile/tabs/OverviewTab';
import { ActivityTab } from '../../../components/profile/tabs/ActivityTab';
import { SkillsTab } from '../../../components/profile/tabs/SkillsTab';
import { ExperienceTab } from '../../../components/profile/tabs/ExperienceTab';
import { EducationTab } from '../../../components/profile/tabs/EducationTab';
import { SecurityTab } from '../../../components/profile/tabs/SecurityTab';
import { EditBasicModal } from '../../../components/profile/modals/EditBasicModal';
import { AddSkillModal } from '../../../components/profile/modals/AddSkillModal';
import { AddExperienceModal } from '../../../components/profile/modals/AddExperienceModal';
import { AddEducationModal } from '../../../components/profile/modals/AddEducationModal';
import { AddCertModal } from '../../../components/profile/modals/AddCertModal';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');

  const { user: currentUser, updateUser: syncCurrentUserStore } = useAuthStore();
  const isOwnProfile = !targetUserId || targetUserId === currentUser?.id;

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'security' ? 'security' : 'overview');
  const mfaSetupRequired = searchParams.get('mfaRequired') === 'true';

  const { data: userTasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['profile-tasks', profile?.id],
    queryFn: () => api.getTasks(`assigneeId=${profile.id}`),
    enabled: !!profile?.id,
  });

  // Modals state
  const [editingBasic, setEditingBasic] = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [addingExp, setAddingExp] = useState(false);
  const [addingEdu, setAddingEdu] = useState(false);
  const [addingCert, setAddingCert] = useState(false);

  // Edit forms states
  const [basicForm, setBasicForm] = useState({
    firstName: '',
    lastName: '',
    designation: '',
    bio: '',
    location: '',
    phone: '',
    employeeId: '',
    employmentType: 'FULL_TIME',
    officeLocation: '',
    emergencyContact: '',
    birthday: '',
    joiningDate: '',
    timezone: 'UTC',
    workingHours: '9:00 AM - 5:00 PM',
    managerId: '',
    departmentId: '',
    status: 'ONLINE',
    socialLinks: { linkedin: '', github: '', twitter: '', portfolio: '', instagram: '' },
  });

  const [skillForm, setSkillForm] = useState({
    skillName: '',
    level: 'INTERMEDIATE',
    yearsOfExp: 1,
    category: 'Engineering',
    order: 0,
  });

  const [expForm, setExpForm] = useState({
    company: '',
    designation: '',
    department: '',
    description: '',
    technologies: '',
    achievements: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  const [eduForm, setEduForm] = useState({
    institution: '',
    degree: '',
    branch: '',
    startDate: '',
    endDate: '',
    grade: '',
  });

  const [certForm, setCertForm] = useState({
    name: '',
    issuedBy: '',
    issueDate: '',
    expiryDate: '',
    credentialUrl: '',
    certificateUrl: '',
  });

  // Timeline / Activity Logs
  const [activities, setActivities] = useState<any[]>([]);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityLoading, setActivityLoading] = useState(false);

  // File uploads
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch full profile info
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = targetUserId ? await api.getProfileById(targetUserId) : await api.getProfile();
      setProfile(data);

      // Seed basic edit form
      setBasicForm({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        designation: data.designation || '',
        bio: data.bio || '',
        location: data.location || '',
        phone: data.phone || '',
        employeeId: data.employeeId || '',
        employmentType: data.employmentType || 'FULL_TIME',
        officeLocation: data.officeLocation || '',
        emergencyContact: data.emergencyContact || '',
        birthday: data.birthday ? data.birthday.split('T')[0] : '',
        joiningDate: data.createdAt ? data.createdAt.split('T')[0] : '',
        timezone: data.timezone || 'UTC',
        workingHours: data.workingHours || '9:00 AM - 5:00 PM',
        managerId: data.managerId || '',
        departmentId: data.departmentId || '',
        status: data.status || 'ONLINE',
        socialLinks: {
          linkedin: data.socialLinks?.linkedin || '',
          github: data.socialLinks?.github || '',
          twitter: data.socialLinks?.twitter || '',
          portfolio: data.socialLinks?.portfolio || '',
          instagram: data.socialLinks?.instagram || '',
        },
      });
    } catch (err) {
      toast.error('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetUserId]);

  // Live updates: the profile page fetches with a plain useState/fetch
  // rather than React Query, so it isn't covered by the generic data_update
  // system (see hooks/useSocket.tsx). Listen directly instead — if someone
  // (possibly this same person in another tab) changes the profile currently
  // being viewed, refetch it instead of requiring a manual reload.
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const viewedUserId = targetUserId || currentUser?.id;
    const handleProfileUpdated = ({ userId }: { userId: string }) => {
      if (userId === viewedUserId) {
        fetchProfile();
      }
    };
    socket.on('profile_updated', handleProfileUpdated);
    return () => {
      socket.off('profile_updated', handleProfileUpdated);
    };
  }, [socket, targetUserId, currentUser?.id]);

  // Load activities when activeTab changes
  useEffect(() => {
    if (activeTab === 'activity' && profile) {
      loadActivities();
    }
  }, [activeTab, activitySearch]);

  const loadActivities = async () => {
    setActivityLoading(true);
    try {
      const params = `userId=${profile.id}&search=${activitySearch}`;
      const res = await api.getUserActivity(params);
      setActivities(res.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  // Profile completion helper
  const getCompletionStats = (p: any) => {
    if (!p) return { score: 0, missing: [] };
    let score = 0;
    const missing = [];
    if (p.avatarUrl) score += 10; else missing.push('Avatar Photo');
    if (p.coverUrl) score += 5; else missing.push('Cover Banner');
    if (p.bio) score += 10; else missing.push('Personal Bio');
    if (p.userSkills && p.userSkills.length > 0) score += 15; else missing.push('Competency Skills');
    if (p.experiences && p.experiences.length > 0) score += 15; else missing.push('Work Experiences');
    if (p.educations && p.educations.length > 0) score += 10; else missing.push('Education Records');
    if (p.phone || p.location) score += 10; else missing.push('Contact Details');
    if (p.employeeId) score += 10; else missing.push('Employee ID');
    if (p.settings) score += 5; else missing.push('Preferences Settings');
    if (p.twoFactorEnabled) score += 10; else missing.push('Enable 2FA Security');
    return { score, missing };
  };

  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...basicForm,
        birthday: basicForm.birthday ? new Date(basicForm.birthday).toISOString() : null,
      };
      const res = await api.updateProfile(payload);
      setProfile(res.user);
      if (isOwnProfile) {
        syncCurrentUserStore(res.user);
      }
      setEditingBasic(false);
      toast.success('Profile details updated successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const valid = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!valid.includes(file.type)) {
      toast.error('Unsupported file format. Please upload PNG, JPG, or WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file exceeds 5MB size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedAvatar = async (croppedFile: File) => {
    setCropperOpen(false);
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('avatar', croppedFile);

    try {
      const res = await api.uploadAvatar(formData);
      setProfile((prev: any) => ({ ...prev, avatarUrl: res.avatarUrl }));
      if (isOwnProfile) {
        syncCurrentUserStore({ ...currentUser!, avatarUrl: res.avatarUrl });
      }
      toast.success('Avatar updated successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const valid = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!valid.includes(file.type)) {
      toast.error('Unsupported cover photo format.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Cover photo exceeds 8MB size limit.');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const res = await api.uploadCover(formData);
      setProfile((prev: any) => ({ ...prev, coverUrl: res.coverUrl }));
      toast.success('Cover banner updated successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Cover photo upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Skill handles
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSkill(skillForm);
      setAddingSkill(false);
      setSkillForm({ skillName: '', level: 'INTERMEDIATE', yearsOfExp: 1, category: 'Engineering', order: 0 });
      toast.success('Skill added successfully.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add skill.');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await api.deleteSkill(id);
      toast.success('Skill removed.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete skill.');
    }
  };

  // Experience handles
  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...expForm,
        technologies: expForm.technologies.split(',').map((t) => t.trim()).filter(Boolean),
        endDate: expForm.isCurrent ? null : expForm.endDate,
      };
      await api.addExperience(payload);
      setAddingExp(false);
      setExpForm({
        company: '',
        designation: '',
        department: '',
        description: '',
        technologies: '',
        achievements: '',
        startDate: '',
        endDate: '',
        isCurrent: false,
      });
      toast.success('Work experience record added.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add experience.');
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      await api.deleteExperience(id);
      toast.success('Experience record deleted.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete experience.');
    }
  };

  // Education handles
  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addEducation(eduForm);
      setAddingEdu(false);
      setEduForm({ institution: '', degree: '', branch: '', startDate: '', endDate: '', grade: '' });
      toast.success('Education record added.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add education.');
    }
  };

  const handleDeleteEdu = async (id: string) => {
    try {
      await api.deleteEducation(id);
      toast.success('Education record deleted.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete education.');
    }
  };

  // Certification handles
  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addCertification(certForm);
      setAddingCert(false);
      setCertForm({ name: '', issuedBy: '', issueDate: '', expiryDate: '', credentialUrl: '', certificateUrl: '' });
      toast.success('Certification credential added.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add certification.');
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await api.deleteCertification(id);
      toast.success('Certification removed.');
      fetchProfile();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove certification.');
    }
  };

  const handleStartChat = () => {
    if (profile) {
      router.push(`/chat?userId=${profile.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold">Retrieving workspace profile information...</p>
      </div>
    );
  }

  const completion = getCompletionStats(profile);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        uploadingImage={uploadingImage}
        onAvatarClick={() => avatarInputRef.current?.click()}
        onCoverClick={() => coverInputRef.current?.click()}
        avatarInputRef={avatarInputRef}
        coverInputRef={coverInputRef}
        onAvatarChange={handleAvatarChange}
        onCoverChange={handleCoverChange}
        onEditProfile={() => setEditingBasic(true)}
        onStartChat={handleStartChat}
        completion={completion}
      />

      {mfaSetupRequired && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-300">Two-factor authentication is required</p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              Your organization requires everyone to have 2FA enabled. Set it up below to continue using the rest of the app.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <ProfileTabsNav activeTab={activeTab} onChange={setActiveTab} />

        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'overview' && <OverviewTab profile={profile} userTasks={userTasks} loadingTasks={loadingTasks} />}

          {activeTab === 'activity' && (
            <ActivityTab
              activitySearch={activitySearch}
              onActivitySearchChange={setActivitySearch}
              activityLoading={activityLoading}
              activities={activities}
            />
          )}

          {activeTab === 'skills' && (
            <SkillsTab profile={profile} isOwnProfile={isOwnProfile} onAddSkill={() => setAddingSkill(true)} onDeleteSkill={handleDeleteSkill} />
          )}

          {activeTab === 'experience' && (
            <ExperienceTab
              profile={profile}
              isOwnProfile={isOwnProfile}
              onAddExperience={() => setAddingExp(true)}
              onDeleteExperience={handleDeleteExperience}
            />
          )}

          {activeTab === 'education' && (
            <EducationTab
              profile={profile}
              isOwnProfile={isOwnProfile}
              onAddEducation={() => setAddingEdu(true)}
              onDeleteEducation={handleDeleteEdu}
              onAddCert={() => setAddingCert(true)}
              onDeleteCert={handleDeleteCert}
            />
          )}

          {activeTab === 'security' && <SecurityTab profile={profile} />}
        </div>
      </div>

      <EditBasicModal
        open={editingBasic}
        onClose={() => setEditingBasic(false)}
        form={basicForm}
        onFormChange={setBasicForm}
        profile={profile}
        onSubmit={handleSaveBasic}
      />

      <AddSkillModal open={addingSkill} onClose={() => setAddingSkill(false)} form={skillForm} onFormChange={setSkillForm} onSubmit={handleAddSkill} />

      <AddExperienceModal open={addingExp} onClose={() => setAddingExp(false)} form={expForm} onFormChange={setExpForm} onSubmit={handleAddExperience} />

      <AddEducationModal open={addingEdu} onClose={() => setAddingEdu(false)} form={eduForm} onFormChange={setEduForm} onSubmit={handleAddEducation} />

      <AddCertModal open={addingCert} onClose={() => setAddingCert(false)} form={certForm} onFormChange={setCertForm} onSubmit={handleAddCert} />

      <ImageCropperModal isOpen={cropperOpen} imageSrc={cropperImageSrc} onClose={() => setCropperOpen(false)} onCrop={handleCroppedAvatar} />
    </div>
  );
}
