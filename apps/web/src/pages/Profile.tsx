import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type {
  AvailabilitySlot,
  ContractorProfile,
  HomeownerProfile,
  ProfileResponse,
  SubcontractorProfile,
} from '../types/profile';
import { readProfileCache, writeProfileCache, clearProfileCache } from '../utils/profileCache';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiOrigin = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured && /^https?:\/\//i.test(configured)) {
    try {
      return new URL(configured).origin;
    } catch (error) {
      console.warn('Invalid VITE_API_BASE_URL value:', error);
    }
  }
  return null;
})();

const resolveImageUrl = (value: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && apiOrigin) {
    return `${apiOrigin}${value}`;
  }
  return value;
};

type ApiError = string | null;

type ProfileSavePayload<TProfile> = {
  profile?: TProfile;
  avatarFile?: File | null;
};

const sanitizeProfile = (data: ProfileResponse): ProfileResponse => {
  if (data.role === 'contractor') {
    const profile = data.profile;
    return {
      role: 'contractor',
      profile: {
        name: profile.name ?? null,
        country: profile.country ?? null,
        city: profile.city ?? null,
        company_name: profile.company_name ?? null,
        image_url: resolveImageUrl(profile.image_url ?? null),
      },
    };
  }
  if (data.role === 'subcontractor') {
    const profile = data.profile;
    return {
      role: 'subcontractor',
      profile: {
        name: profile.name ?? null,
        bio: profile.bio ?? null,
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        services: Array.isArray(profile.services) ? profile.services : [],
        years_of_experience:
          typeof profile.years_of_experience === 'number'
            ? profile.years_of_experience
            : profile.years_of_experience != null
            ? Number(profile.years_of_experience)
            : null,
        rates:
          typeof profile.rates === 'number'
            ? profile.rates
            : profile.rates != null
            ? Number(profile.rates)
            : null,
        area: profile.area ?? null,
        image_url: resolveImageUrl(profile.image_url ?? null),
        availability: Array.isArray(profile.availability)
          ? profile.availability.map((slot) => ({
              date: slot.date,
              start_time: slot.start_time,
              end_time: slot.end_time,
            }))
          : [],
      },
    };
  }
  const profile = data.profile;
  return {
    role: 'homeowner',
    profile: {
      name: profile.name ?? null,
      city: profile.city ?? null,
      investment_min:
        typeof profile.investment_min === 'number'
          ? profile.investment_min
          : profile.investment_min != null
          ? Number(profile.investment_min)
          : null,
      investment_max:
        typeof profile.investment_max === 'number'
          ? profile.investment_max
          : profile.investment_max != null
          ? Number(profile.investment_max)
          : null,
      image_url: resolveImageUrl(profile.image_url ?? null),
    },
  };
};

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileResponse | null>(() => {
    const cached = readProfileCache();
    return cached ? sanitizeProfile(cached) : null;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = useMemo(() => localStorage.getItem('token'), []);

  const applyProfile = useCallback((payload: ProfileResponse) => {
    const sanitized = sanitizeProfile(payload);
    setProfileData(sanitized);
    writeProfileCache(sanitized);
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${baseUrl}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-changed'));
          clearProfileCache();
          navigate('/login', { replace: true });
          return;
        }
        if (!res.ok) {
          throw new Error(t('profile.errors.loadFailed'));
        }
        const data = (await res.json()) as ProfileResponse;
        applyProfile(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [applyProfile, navigate, t, token]);

  const handleUpdate = async ({
    profile,
    avatarFile,
  }: {
    profile?: Record<string, unknown>;
    avatarFile?: File | null;
  }) => {
    if (!profileData || !token) return;

    const shouldUpdateProfile = Boolean(profile);
    const shouldUploadAvatar = Boolean(avatarFile);

    if (!shouldUpdateProfile && !shouldUploadAvatar) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      let hasChange = false;

      if (shouldUpdateProfile && profile) {
        const res = await fetch(`${baseUrl}/profile/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({ role: profileData.role, profile }),
        });
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-changed'));
          clearProfileCache();
          navigate('/login', { replace: true });
          return;
        }
        if (!res.ok) {
          const errPayload = await res.json().catch(() => null);
          throw new Error(errPayload?.detail || t('profile.errors.saveFailed'));
        }
        const updated = (await res.json()) as ProfileResponse;
        applyProfile(updated);
        hasChange = true;
      }

      if (shouldUploadAvatar && avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        const avatarRes = await fetch(`${baseUrl}/profile/me/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: formData,
        });
        if (avatarRes.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new Event('auth-changed'));
          clearProfileCache();
          navigate('/login', { replace: true });
          return;
        }
        if (!avatarRes.ok) {
          const errPayload = await avatarRes.json().catch(() => null);
          throw new Error(errPayload?.detail || t('profile.errors.saveFailed'));
        }
        const avatarPayload = (await avatarRes.json()) as ProfileResponse;
        applyProfile(avatarPayload);
        hasChange = true;
      }

      if (hasChange) {
        setSuccessMessage(t('profile.messages.saved'));
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = useMemo(() => {
    if (!profileData) return '';
    switch (profileData.role) {
      case 'contractor':
        return t('register.contractor');
      case 'subcontractor':
        return t('register.subcontractor');
      case 'homeowner':
        return t('register.homeowner');
      default:
        return profileData.role;
    }
  }, [profileData, t]);

  const renderForm = () => {
    if (!profileData) return null;
    if (profileData.role === 'contractor') {
      return (
        <ContractorProfileForm
          data={profileData.profile}
          onSave={handleUpdate}
          saving={saving}
        />
      );
    }
    if (profileData.role === 'subcontractor') {
      return (
        <SubcontractorProfileForm
          data={profileData.profile}
          onSave={handleUpdate}
          saving={saving}
        />
      );
    }
    return (
      <HomeownerProfileForm
        data={profileData.profile}
        onSave={handleUpdate}
        saving={saving}
      />
    );
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#04070F] via-[#050912] to-[#070C18] text-gray-100">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-16 h-[32rem] w-[32rem] rounded-full bg-primary/12 blur-[160px] opacity-80" />
          <div className="absolute right-[-20rem] top-1/3 h-[40rem] w-[40rem] rounded-full bg-sky-500/14 blur-[210px]" />
        </div>
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <div className="flex h-40 w-40 items-center justify-center rounded-full border border-white/8 bg-[#0B111E]/70 shadow-[0_45px_140px_rgba(3,7,18,0.7)] backdrop-blur-2xl">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/15 border-t-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#04070F] via-[#050912] to-[#070C18] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-12 h-[34rem] w-[34rem] rounded-full bg-primary/14 blur-[170px]" />
        <div className="absolute right-[-22rem] top-1/3 h-[46rem] w-[46rem] rounded-full bg-indigo-500/14 blur-[230px]" />
        <div className="absolute left-1/2 bottom-[-16rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/14 blur-[200px]" />
      </div>
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20">
        <header className="space-y-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.45em] text-primary/70 shadow-[0_0_44px_rgba(245,184,0,0.18)]">
            {t('profile.tagline')}
          </span>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-white md:text-5xl">
                {t('profile.title')}
              </h1>
              {profileData && (
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">
                  {t('profile.roleLabel', { role: roleLabel })}
                </p>
              )}
            </div>
            {profileData && (
              <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0B111E]/90 px-6 py-4 text-sm text-white/80 shadow-[0_32px_90px_rgba(3,7,18,0.6)] backdrop-blur-xl">
                <span className="absolute -top-10 right-[-20%] h-24 w-24 rounded-full bg-primary/15 blur-3xl" />
                <p className="relative z-10 max-w-sm leading-relaxed text-white/75">
                  {t('profile.subtitle')}
                </p>
              </div>
            )}
          </div>
        </header>

        <div className="space-y-5">
          {error && (
            <div className="relative overflow-hidden rounded-3xl border border-rose-500/25 bg-rose-500/10 px-6 py-4 text-xs text-rose-100 shadow-[0_26px_80px_rgba(255,0,94,0.35)]">
              <span className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-transparent to-transparent opacity-40" />
              <span className="relative z-10">{error}</span>
            </div>
          )}
          {successMessage && (
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-emerald-500/10 px-6 py-4 text-xs text-emerald-100 shadow-[0_26px_80px_rgba(16,185,129,0.35)]">
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent opacity-40" />
              <span className="relative z-10">{successMessage}</span>
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-[2.75rem] border border-white/8 bg-[#0A0F1B]/95 p-8 shadow-[0_55px_160px_rgba(3,7,18,0.85)] backdrop-blur-2xl md:p-12">
          <div className="pointer-events-none absolute inset-0 opacity-65">
            <div className="absolute -top-24 right-[-18%] h-56 w-56 rounded-full bg-primary/16 blur-3xl" />
            <div className="absolute -bottom-24 left-[-10%] h-60 w-60 rounded-full bg-sky-500/14 blur-3xl" />
          </div>
          <div className="relative z-10 space-y-12">
            {renderForm()}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;

type ContractorFormValues = {
  name: string;
  country: string;
  city: string;
  company_name: string;
};

type ContractorProfileFormProps = {
  data: ContractorProfile;
  onSave: (payload: ProfileSavePayload<ContractorProfile>) => void | Promise<void>;
  saving: boolean;
};

const ContractorProfileForm: React.FC<ContractorProfileFormProps> = ({ data, onSave, saving }) => {
  const { t } = useTranslation();
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.image_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUpdated, setAvatarUpdated] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ContractorFormValues>({
    defaultValues: {
      name: data.name ?? '',
      country: data.country ?? '',
      city: data.city ?? '',
      company_name: data.company_name ?? '',
    },
  });

  useEffect(() => {
    reset({
      name: data.name ?? '',
      country: data.country ?? '',
      city: data.city ?? '',
      company_name: data.company_name ?? '',
    });
  }, [data, reset]);

  useEffect(() => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreview(data.image_url ?? null);
    setAvatarFile(null);
    setAvatarUpdated(false);
  }, [data]);

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
  }, []);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = '';
      return;
    }
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreview(objectUrl);
    setAvatarUpdated(true);
    event.target.value = '';
  };

  const submit = (values: ContractorFormValues) => {
    const payload: ProfileSavePayload<ContractorProfile> = {};

    if (isDirty) {
      payload.profile = {
        name: values.name ? values.name : null,
        country: values.country ? values.country : null,
        city: values.city ? values.city : null,
        company_name: values.company_name ? values.company_name : null,
        image_url: data.image_url ?? null,
      };
    }

    if (avatarUpdated && avatarFile) {
      payload.avatarFile = avatarFile;
    }

    if (!payload.profile && !payload.avatarFile) {
      return;
    }

    onSave(payload);
  };

  const canSubmit = isDirty || avatarUpdated;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-10">
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#101726] text-[0.55rem] font-semibold uppercase tracking-[0.4em] text-white/40">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={t('profile.avatar.label')}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{t('profile.avatar.empty')}</span>
              )}
            </div>
            {avatarUpdated && (
              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-primary">
                {t('profile.avatar.pending')}
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
            <span>{t('profile.avatar.label')}</span>
            <label className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-[0.55rem] tracking-[0.3em] text-white transition duration-200 hover:border-primary/60 hover:text-primary">
              {t('profile.avatar.button')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
              />
            </label>
            <p className="text-[0.6rem] font-normal uppercase tracking-[0.25em] text-white/40">
              {t('profile.avatar.helper')}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
        <fieldset className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputField
            label={t('profile.contractor.name')}
            placeholder={t('profile.contractor.namePlaceholder')}
            {...register('name')}
          />
          <InputField
            label={t('profile.contractor.country')}
            placeholder={t('profile.contractor.countryPlaceholder')}
            {...register('country')}
          />
          <InputField
            label={t('profile.contractor.city')}
            placeholder={t('profile.contractor.cityPlaceholder')}
            {...register('city')}
          />
          <InputField
            label={t('profile.contractor.company')}
            placeholder={t('profile.contractor.companyPlaceholder')}
            {...register('company_name')}
          />
        </fieldset>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-dark-900 shadow-[0_25px_60px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
};

type SubcontractorProfileFormProps = {
  data: SubcontractorProfile;
  onSave: (payload: ProfileSavePayload<SubcontractorProfile>) => void | Promise<void>;
  saving: boolean;
};

type SubcontractorFormValues = {
  name: string;
  bio: string;
  area: string;
  years_of_experience: string;
  rates: string;
};

const SubcontractorProfileForm: React.FC<SubcontractorProfileFormProps> = ({ data, onSave, saving }) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<SubcontractorFormValues>({
    defaultValues: {
      name: data.name ?? '',
      bio: data.bio ?? '',
      area: data.area ?? '',
      years_of_experience: data.years_of_experience?.toString() ?? '',
      rates: data.rates?.toString() ?? '',
    },
  });
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.image_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUpdated, setAvatarUpdated] = useState(false);
  const originalSkills = useMemo(() => data.skills.join(', '), [data.skills]);
  const originalServices = useMemo(() => data.services.join(', '), [data.services]);
  const originalAvailabilitySignature = useMemo(
    () => JSON.stringify(data.availability),
    [data.availability],
  );
  const [skillsInput, setSkillsInput] = useState(originalSkills);
  const [servicesInput, setServicesInput] = useState(originalServices);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    data.availability.map((slot) => ({ ...slot })),
  );
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState<AvailabilitySlot>({
    date: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => {
    reset({
      name: data.name ?? '',
      bio: data.bio ?? '',
      area: data.area ?? '',
      years_of_experience: data.years_of_experience?.toString() ?? '',
      rates: data.rates?.toString() ?? '',
    });
    setSkillsInput(data.skills.join(', '));
    setServicesInput(data.services.join(', '));
    setAvailability(data.availability.map((slot) => ({ ...slot })));
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreview(data.image_url ?? null);
    setAvatarFile(null);
    setAvatarUpdated(false);
  }, [data, reset]);

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
  }, []);

  const parseList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = '';
      return;
    }
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreview(objectUrl);
    setAvatarUpdated(true);
    event.target.value = '';
  };

  const addSlot = () => {
    if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) {
      setAvailabilityError(t('profile.subcontractor.availability.required'));
      return;
    }
    if (newSlot.start_time >= newSlot.end_time) {
      setAvailabilityError(t('profile.subcontractor.availability.invalidRange'));
      return;
    }
    setAvailability((prev) => [...prev, { ...newSlot }]);
    setNewSlot({ date: '', start_time: '', end_time: '' });
    setAvailabilityError(null);
  };

  const removeSlot = (index: number) => {
    setAvailability((prev) => prev.filter((_, idx) => idx !== index));
  };

  const currentAvailabilitySignature = useMemo(
    () => JSON.stringify(availability),
    [availability],
  );

  const profileDirty =
    isDirty ||
    skillsInput !== originalSkills ||
    servicesInput !== originalServices ||
    currentAvailabilitySignature !== originalAvailabilitySignature;

  const submit = (values: SubcontractorFormValues) => {
    const yearsValue = values.years_of_experience ? Number(values.years_of_experience) : null;
    const ratesValue = values.rates ? Number(values.rates) : null;
    const payload: ProfileSavePayload<SubcontractorProfile> = {};

    if (profileDirty) {
      payload.profile = {
        name: values.name || null,
        bio: values.bio || null,
        skills: parseList(skillsInput),
        services: parseList(servicesInput),
        years_of_experience: Number.isNaN(yearsValue) ? null : yearsValue,
        rates: Number.isNaN(ratesValue) ? null : ratesValue,
        area: values.area || null,
        image_url: data.image_url ?? null,
        availability,
      };
    }

    if (avatarUpdated && avatarFile) {
      payload.avatarFile = avatarFile;
    }

    if (!payload.profile && !payload.avatarFile) {
      return;
    }

    onSave(payload);
  };

  const canSubmit = profileDirty || avatarUpdated;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(3,7,18,0.6)] backdrop-blur-xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#101726] text-[0.55rem] font-semibold uppercase tracking-[0.4em] text-white/40">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={t('profile.avatar.label')}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{t('profile.avatar.empty')}</span>
                  )}
                </div>
                {avatarUpdated && (
                  <span className="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-primary">
                    {t('profile.avatar.pending')}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                <span>{t('profile.avatar.label')}</span>
                <label className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-[0.55rem] tracking-[0.3em] text-white transition duration-200 hover:border-primary/60 hover:text-primary">
                  {t('profile.avatar.button')}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
                <p className="text-[0.6rem] font-normal uppercase tracking-[0.25em] text-white/40">
                  {t('profile.avatar.helper')}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(3,7,18,0.6)] backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-6">
              <InputField
                label={t('profile.subcontractor.name')}
                placeholder={t('profile.subcontractor.namePlaceholder')}
                {...register('name')}
              />
              <TextAreaField
                label={t('profile.subcontractor.bio')}
                placeholder={t('profile.subcontractor.bioPlaceholder')}
                rows={5}
                {...register('bio')}
              />
            </div>
          </div>
        </div>
        <div className="grid gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(3,7,18,0.6)] backdrop-blur-xl">
            <TextAreaField
              label={t('profile.subcontractor.services')}
              placeholder={t('profile.subcontractor.servicesPlaceholder')}
              rows={5}
              value={servicesInput}
              onChange={(event) => setServicesInput(event.target.value)}
            />
            <TextAreaField
              label={t('profile.subcontractor.skills')}
              placeholder={t('profile.subcontractor.skillsPlaceholder')}
              rows={5}
              value={skillsInput}
              onChange={(event) => setSkillsInput(event.target.value)}
            />
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(3,7,18,0.6)] backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <InputField
                label={t('profile.subcontractor.area')}
                placeholder={t('profile.subcontractor.areaPlaceholder')}
                {...register('area')}
              />
              <InputField
                label={t('profile.subcontractor.experience')}
                type="number"
                min={0}
                placeholder={t('profile.subcontractor.experiencePlaceholder')}
                {...register('years_of_experience')}
              />
              <InputField
                label={t('profile.subcontractor.rates')}
                type="number"
                min={0}
                step="0.01"
                placeholder={t('profile.subcontractor.ratesPlaceholder')}
                {...register('rates')}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-[2.5rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_26px_90px_rgba(3,7,18,0.6)] backdrop-blur-xl md:p-8">
        <header className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-white/70">
            {t('profile.subcontractor.availability.title')}
          </h2>
          <p className="text-sm text-white/65">
            {t('profile.subcontractor.availability.hint')}
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))]">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            {t('profile.subcontractor.availability.date')}
            <input
              type="date"
              className="rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              value={newSlot.date}
              onChange={(event) => setNewSlot((prev) => ({ ...prev, date: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            {t('profile.subcontractor.availability.start')}
            <input
              type="time"
              className="rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              value={newSlot.start_time}
              onChange={(event) =>
                setNewSlot((prev) => ({ ...prev, start_time: event.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            {t('profile.subcontractor.availability.end')}
            <input
              type="time"
              className="rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
              value={newSlot.end_time}
              onChange={(event) =>
                setNewSlot((prev) => ({ ...prev, end_time: event.target.value }))
              }
            />
          </label>
          <button
            type="button"
            onClick={addSlot}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-dark-900 shadow-[0_24px_60px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02]"
          >
            {t('profile.subcontractor.availability.add')}
          </button>
        </div>
        {availabilityError && (
          <p className="text-xs text-rose-300">{availabilityError}</p>
        )}
        {availability.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-white/60">
            {t('profile.subcontractor.availability.empty')}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {availability.map((slot, index) => (
              <li
                key={`${slot.date}-${slot.start_time}-${slot.end_time}-${index}`}
                className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0C1322] px-5 py-4 shadow-[0_22px_70px_rgba(3,7,18,0.55)]"
              >
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="absolute -left-10 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-primary/18 blur-3xl" />
                </span>
                <div className="relative z-10 text-sm text-white/75">
                  <p className="text-base font-semibold text-white">
                    {slot.date}
                  </p>
                  <p>
                    {slot.start_time} - {slot.end_time}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSlot(index)}
                  className="relative z-10 inline-flex items-center rounded-full border border-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition-colors duration-200 hover:border-rose-400 hover:text-rose-300"
                >
                  {t('profile.remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
};


type HomeownerFormValues = {
  name: string;
  city: string;
  investment_min: string;
  investment_max: string;
};

type HomeownerProfileFormProps = {
  data: HomeownerProfile;
  onSave: (payload: ProfileSavePayload<HomeownerProfile>) => void | Promise<void>;
  saving: boolean;
};


const HomeownerProfileForm: React.FC<HomeownerProfileFormProps> = ({ data, onSave, saving }) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<HomeownerFormValues>({
    defaultValues: {
      name: data.name ?? '',
      city: data.city ?? '',
      investment_min: data.investment_min?.toString() ?? '',
      investment_max: data.investment_max?.toString() ?? '',
    },
  });
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.image_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUpdated, setAvatarUpdated] = useState(false);

  useEffect(() => {
    reset({
      name: data.name ?? '',
      city: data.city ?? '',
      investment_min: data.investment_min?.toString() ?? '',
      investment_max: data.investment_max?.toString() ?? '',
    });
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreview(data.image_url ?? null);
    setAvatarFile(null);
    setAvatarUpdated(false);
  }, [data, reset]);

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
  }, []);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = '';
      return;
    }
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setAvatarPreview(objectUrl);
    setAvatarUpdated(true);
    event.target.value = '';
  };

  const submit = (values: HomeownerFormValues) => {
    const minValue = values.investment_min ? Number(values.investment_min) : null;
    const maxValue = values.investment_max ? Number(values.investment_max) : null;
    const payload: ProfileSavePayload<HomeownerProfile> = {};

    if (isDirty) {
      payload.profile = {
        name: values.name || null,
        city: values.city || null,
        investment_min: Number.isNaN(minValue) ? null : minValue,
        investment_max: Number.isNaN(maxValue) ? null : maxValue,
        image_url: data.image_url ?? null,
      };
    }

    if (avatarUpdated && avatarFile) {
      payload.avatarFile = avatarFile;
    }

    if (!payload.profile && !payload.avatarFile) {
      return;
    }

    onSave(payload);
  };

  const canSubmit = isDirty || avatarUpdated;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-10">
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(3,7,18,0.6)] backdrop-blur-xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#101726] text-[0.55rem] font-semibold uppercase tracking-[0.4em] text-white/40">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={t('profile.avatar.label')}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{t('profile.avatar.empty')}</span>
              )}
            </div>
            {avatarUpdated && (
              <span className="text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-primary">
                {t('profile.avatar.pending')}
              </span>
            )}
          </div>
          <div className="space-y-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
            <span>{t('profile.avatar.label')}</span>
            <label className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-[0.55rem] tracking-[0.3em] text-white transition duration-200 hover:border-primary/60 hover:text-primary">
              {t('profile.avatar.button')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
              />
            </label>
            <p className="text-[0.6rem] font-normal uppercase tracking-[0.25em] text-white/40">
              {t('profile.avatar.helper')}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(3,7,18,0.6)] backdrop-blur-xl">
        <fieldset className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputField
            label={t('profile.homeowner.name')}
            placeholder={t('profile.homeowner.namePlaceholder')}
            {...register('name')}
          />
          <InputField
            label={t('profile.homeowner.city')}
            placeholder={t('profile.homeowner.cityPlaceholder')}
            {...register('city')}
          />
          <InputField
            label={t('profile.homeowner.investmentMin')}
            type="number"
            min={0}
            step="1000"
            placeholder={t('profile.homeowner.investmentMinPlaceholder')}
            {...register('investment_min')}
          />
          <InputField
            label={t('profile.homeowner.investmentMax')}
            type="number"
            min={0}
            step="1000"
            placeholder={t('profile.homeowner.investmentMaxPlaceholder')}
            {...register('investment_max')}
          />
        </fieldset>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-amber-400 to-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
};


const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, className = '', ...props }, ref) => (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
      {label}
      <input
        ref={ref}
        className={`w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/35 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition ${className}`}
        {...props}
      />
    </label>
  ),
);
InputField.displayName = 'InputField';

type TextAreaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

const TextAreaField = React.forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, className = '', ...props }, ref) => (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
      {label}
      <textarea
        ref={ref}
        className={`w-full rounded-2xl border border-white/10 bg-[#070B14]/75 px-4 py-3 text-sm text-white placeholder-white/35 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition ${className}`}
        {...props}
      />
    </label>
  ),
);
TextAreaField.displayName = 'TextAreaField';
