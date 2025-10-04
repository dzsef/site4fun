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
import { COUNTRY_OPTIONS, PROVINCES_BY_COUNTRY } from '../data/geo';

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
    const rawLocation = profile.business_location ?? null;
    let location: ContractorProfile['business_location'] = null;
    if (rawLocation && typeof rawLocation === 'object') {
      const country = typeof rawLocation.country === 'string' ? rawLocation.country.trim().toUpperCase() : '';
      const provinces = Array.isArray(rawLocation.provinces)
        ? rawLocation.provinces
            .map((province: unknown) => (typeof province === 'string' ? province.trim().toUpperCase() : ''))
            .filter((province: string) => province.length > 0)
        : [];
      const cities = Array.isArray(rawLocation.cities)
        ? rawLocation.cities
            .map((city: unknown) => (typeof city === 'string' ? city.trim() : ''))
            .filter((city: string) => city.length > 0)
        : [];
      if (country) {
        location = { country, provinces, cities };
      }
    }

    const yearsValue =
      typeof profile.years_in_business === 'number'
        ? profile.years_in_business
        : profile.years_in_business != null
        ? Number(profile.years_in_business)
        : null;

    return {
      role: 'contractor',
      profile: {
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        business_name: profile.business_name ?? null,
        business_location: location,
        birthday: profile.birthday ?? null,
        gender: profile.gender ?? null,
        years_in_business: Number.isNaN(yearsValue) ? null : yearsValue,
        image_url: resolveImageUrl(profile.image_url ?? null),
      },
      email: data.email,
      username: data.username,
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
          identity={{ email: profileData.email, username: profileData.username }}
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
  first_name: string;
  last_name: string;
  business_name: string;
  business_country: string;
  birthday: string;
  gender: string;
  years_in_business: string;
};

type ContractorProfileFormProps = {
  data: ContractorProfile;
  identity?: { email?: string; username?: string };
  onSave: (payload: ProfileSavePayload<ContractorProfile>) => void | Promise<void>;
  saving: boolean;
};

const ContractorProfileForm: React.FC<ContractorProfileFormProps> = ({ data, identity, onSave, saving }) => {
  const { t } = useTranslation();
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(data.image_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUpdated, setAvatarUpdated] = useState(false);
  const [cityDraft, setCityDraft] = useState('');
  const [citiesDirty, setCitiesDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>(() => data.business_location?.cities ?? []);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(
    () => data.business_location?.provinces ?? [],
  );
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors },
  } = useForm<ContractorFormValues>({
    defaultValues: {
      first_name: data.first_name ?? '',
      last_name: data.last_name ?? '',
      business_name: data.business_name ?? '',
      business_country: data.business_location?.country ?? COUNTRY_OPTIONS[0].code,
      birthday: data.birthday ?? '',
      gender: data.gender ?? '',
      years_in_business: data.years_in_business != null ? String(data.years_in_business) : '',
    },
  });

  useEffect(() => {
    reset({
      first_name: data.first_name ?? '',
      last_name: data.last_name ?? '',
      business_name: data.business_name ?? '',
      business_country: data.business_location?.country ?? COUNTRY_OPTIONS[0].code,
      birthday: data.birthday ?? '',
      gender: data.gender ?? '',
      years_in_business: data.years_in_business != null ? String(data.years_in_business) : '',
    });
    setCities(data.business_location?.cities ?? []);
    setCitiesDirty(false);
    setSelectedProvinces(data.business_location?.provinces ?? []);
    setFormError(null);
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

  useEffect(
    () => () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    },
    [],
  );

  const watchCountry = watch('business_country');
  const selectedCountry = useMemo(() => (watchCountry || COUNTRY_OPTIONS[0].code).toUpperCase(), [watchCountry]);
  const provinceOptions = useMemo(
    () => PROVINCES_BY_COUNTRY[selectedCountry] ?? [],
    [selectedCountry],
  );

  useEffect(() => {
    setSelectedProvinces((prev) => {
      const allowed = new Set(provinceOptions.map((option) => option.code));
      const filtered = prev.filter((code) => allowed.has(code));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [provinceOptions]);

  const originalProvinces = useMemo(
    () => (data.business_location?.provinces ?? []).slice().sort(),
    [data.business_location?.provinces],
  );

  const provincesDirty = useMemo(() => {
    const currentSorted = [...selectedProvinces].sort();
    if (originalProvinces.length !== currentSorted.length) {
      return true;
    }
    return originalProvinces.some((code, index) => code !== currentSorted[index]);
  }, [originalProvinces, selectedProvinces]);

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

  const addCity = () => {
    const normalized = cityDraft.trim();
    if (!normalized) return;
    const exists = cities.some((city) => city.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setCityDraft('');
      setFormError(null);
      return;
    }
    setCities((prev) => [...prev, normalized]);
    setCitiesDirty(true);
    setCityDraft('');
    setFormError(null);
  };

  const removeCity = (index: number) => {
    setCities((prev) => prev.filter((_, idx) => idx !== index));
    setCitiesDirty(true);
    setFormError(null);
  };

  const handleCityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addCity();
      return;
    }
    if (event.key === 'Backspace' && !cityDraft && cities.length > 0) {
      event.preventDefault();
      removeCity(cities.length - 1);
    }
  };

  const toggleProvince = (code: string) => {
    const normalizedCode = code.toUpperCase();
    const allowed = new Set(provinceOptions.map((option) => option.code));
    if (!allowed.has(normalizedCode)) {
      return;
    }
    setSelectedProvinces((prev) => {
      if (prev.includes(normalizedCode)) {
        const next = prev.filter((item) => item !== normalizedCode);
        setFormError(null);
        return next;
      }
      setFormError(null);
      return [...prev, normalizedCode];
    });
  };

  const shouldSubmitProfile = isDirty || citiesDirty || provincesDirty;

  const submit = (values: ContractorFormValues) => {
    const payload: ProfileSavePayload<ContractorProfile> = {};
    setFormError(null);
    const country = (values.business_country || COUNTRY_OPTIONS[0].code).trim().toUpperCase();
    const trimmedCities = cities.map((city) => city.trim()).filter((city) => city.length > 0);
    const seen = new Set<string>();
    const uniqueCities: string[] = [];
    trimmedCities.forEach((city) => {
      const key = city.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCities.push(city);
      }
    });

    if (shouldSubmitProfile) {
      const requiredChecks: Array<{ value: string; message: string }> = [
        { value: values.first_name, message: t('profile.contractor.errors.firstNameRequired') },
        { value: values.last_name, message: t('profile.contractor.errors.lastNameRequired') },
        { value: values.business_name, message: t('profile.contractor.errors.businessNameRequired') },
        { value: country, message: t('profile.contractor.errors.countryRequired') },
      ];
      for (const check of requiredChecks) {
        if (!check.value.trim()) {
          setFormError(check.message);
          return;
        }
      }
      if (selectedProvinces.length === 0) {
        setFormError(t('profile.contractor.errors.provinceRequired'));
        return;
      }
      const allowedProvinceCodes = new Set(provinceOptions.map((option) => option.code));
      if (selectedProvinces.some((code) => !allowedProvinceCodes.has(code))) {
        setFormError(t('profile.contractor.errors.provinceInvalid'));
        return;
      }
      if (uniqueCities.length === 0) {
        setFormError(t('profile.contractor.errors.cityRequired'));
        return;
      }

      const yearsValue = values.years_in_business ? Number(values.years_in_business) : null;
      if (yearsValue != null && (Number.isNaN(yearsValue) || yearsValue < 0)) {
        setFormError(t('profile.contractor.errors.yearsInvalid'));
        return;
      }

      if (values.birthday) {
        const today = new Date().toISOString().slice(0, 10);
        if (values.birthday >= today) {
          setFormError(t('profile.contractor.errors.birthdayFuture'));
          return;
        }
      }

      payload.profile = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        business_name: values.business_name.trim(),
        business_location: {
          country,
          provinces: selectedProvinces,
          cities: uniqueCities,
        },
        birthday: values.birthday || null,
        gender: values.gender ? values.gender : null,
        years_in_business: yearsValue,
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

  const canSubmit = shouldSubmitProfile || avatarUpdated;
  const genderOptions = [
    { value: '', label: t('profile.contractor.genderOptions.undefined') },
    { value: 'female', label: t('profile.contractor.genderOptions.female') },
    { value: 'male', label: t('profile.contractor.genderOptions.male') },
    { value: 'non-binary', label: t('profile.contractor.genderOptions.nonBinary') },
    { value: 'prefer-not-to-say', label: t('profile.contractor.genderOptions.noAnswer') },
  ];

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-10">
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_26px_90px_rgba(3,7,18,0.6)] backdrop-blur-xl md:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_minmax(0,1fr)] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-primary/75">
                {t('profile.contractor.identity.tagline')}
              </span>
              <h3 className="text-2xl font-semibold text-white md:text-3xl">
                {t('profile.contractor.identity.title')}
              </h3>
              <p className="text-sm text-white/70 md:text-base">
                {t('profile.contractor.identity.helper')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-white/45">
                  {t('profile.contractor.identity.email')}
                </p>
                <p className="truncate text-base font-semibold text-white">
                  {identity?.email ?? t('profile.contractor.identity.missing')}
                </p>
                <p className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/35">
                  {t('profile.contractor.identity.locked')}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-white/45">
                  {t('profile.contractor.identity.username')}
                </p>
                <p className="truncate text-base font-semibold text-white">
                  {identity?.username ?? t('profile.contractor.identity.missing')}
                </p>
                <p className="mt-2 text-[0.55rem] uppercase tracking-[0.28em] text-white/35">
                  {t('profile.contractor.identity.locked')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#101726] text-[0.55rem] font-semibold uppercase tracking-[0.4em] text-white/40 sm:h-32 sm:w-32">
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
            <label className="inline-flex w-fit cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white transition duration-200 hover:border-primary/60 hover:text-primary">
              {t('profile.avatar.button')}
              <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
            </label>
            <p className="text-[0.55rem] uppercase tracking-[0.26em] text-white/40">
              {t('profile.avatar.helper')}
            </p>
          </div>
        </div>
      </div>

      {formError && (
        <div className="rounded-3xl border border-rose-500/40 bg-rose-500/15 px-6 py-4 text-sm text-rose-100 shadow-[0_22px_60px_rgba(255,0,94,0.35)]">
          {formError}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_26px_90px_rgba(3,7,18,0.6)] backdrop-blur-xl md:p-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-sky-200">
              {t('profile.contractor.personal.tagline')}
            </span>
            <h3 className="text-xl font-semibold text-white md:text-2xl">
              {t('profile.contractor.personal.title')}
            </h3>
            <p className="text-sm text-white/70">{t('profile.contractor.personal.helper')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <InputField
              label={t('profile.contractor.personal.firstName')}
              placeholder={t('profile.contractor.personal.firstNamePlaceholder')}
              autoComplete="given-name"
              error={errors.first_name?.message as string | undefined}
              {...register('first_name', { required: t('profile.contractor.errors.firstNameRequired') })}
            />
            <InputField
              label={t('profile.contractor.personal.lastName')}
              placeholder={t('profile.contractor.personal.lastNamePlaceholder')}
              autoComplete="family-name"
              error={errors.last_name?.message as string | undefined}
              {...register('last_name', { required: t('profile.contractor.errors.lastNameRequired') })}
            />
            <InputField
              label={t('profile.contractor.personal.birthday')}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              {...register('birthday')}
            />
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              {t('profile.contractor.personal.gender')}
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  {...register('gender')}
                >
                  {genderOptions.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-white/40">
                  ▾
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_26px_90px_rgba(3,7,18,0.6)] backdrop-blur-xl md:p-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-emerald-200">
              {t('profile.contractor.business.tagline')}
            </span>
            <h3 className="text-xl font-semibold text-white md:text-2xl">
              {t('profile.contractor.business.title')}
            </h3>
            <p className="text-sm text-white/70">{t('profile.contractor.business.helper')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <InputField
              label={t('profile.contractor.business.name')}
              placeholder={t('profile.contractor.business.namePlaceholder')}
              autoComplete="organization"
              error={errors.business_name?.message as string | undefined}
              {...register('business_name', { required: t('profile.contractor.errors.businessNameRequired') })}
            />
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              {t('profile.contractor.business.country')}
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                  {...register('business_country', { required: t('profile.contractor.errors.countryRequired') })}
                >
                  {COUNTRY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-white/40">
                  ▾
                </span>
              </div>
            </label>
            <div className="md:col-span-2 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                {t('profile.contractor.business.provinces')}
              </p>
              <div className="flex flex-wrap gap-2">
                {provinceOptions.length === 0 ? (
                  <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                    {t('profile.contractor.business.noProvinces')}
                  </span>
                ) : (
                  provinceOptions.map((option) => {
                    const active = selectedProvinces.includes(option.code);
                    return (
                      <button
                        key={option.code}
                        type="button"
                        onClick={() => toggleProvince(option.code)}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                          active
                            ? 'border-primary bg-primary text-dark-900 shadow-[0_12px_30px_rgba(245,184,0,0.45)]'
                            : 'border-white/15 bg-white/10 text-white hover:border-primary/60 hover:text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
                {t('profile.contractor.business.provincesHint')}
              </p>
            </div>
            <InputField
              label={t('profile.contractor.business.years')}
              type="number"
              min={0}
              max={150}
              inputMode="numeric"
              placeholder={t('profile.contractor.business.yearsPlaceholder')}
              {...register('years_in_business')}
            />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              {t('profile.contractor.business.cities')}
            </p>
            <div className="flex flex-wrap gap-2">
              {cities.length === 0 ? (
                <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                  {t('profile.contractor.business.citiesEmpty')}
                </span>
              ) : (
                cities.map((city, index) => (
                  <span
                    key={`${city}-${index.toString()}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)]"
                  >
                    {city}
                    <button
                      type="button"
                      onClick={() => removeCity(index)}
                      className="text-white/70 transition hover:text-rose-300"
                      aria-label={t('profile.contractor.business.removeCity', { city })}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={cityDraft}
                onChange={(event) => setCityDraft(event.target.value)}
                onKeyDown={handleCityKeyDown}
                placeholder={t('profile.contractor.business.cityPlaceholder')}
                className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/35 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
              />
              <button
                type="button"
                onClick={addCity}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-primary/60 hover:text-primary"
              >
                {t('profile.contractor.business.addCity')}
              </button>
            </div>
            <p className="text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
              {t('profile.contractor.business.citiesHint')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary via-amber-400 to-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-dark-900 shadow-[0_28px_80px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
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

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, className = '', error, ...props }, ref) => (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
      {label}
      <input
        ref={ref}
        className={`w-full rounded-2xl border ${
          error ? 'border-rose-400/80 focus:border-rose-400 focus:ring-rose-200/60' : 'border-white/10 focus:border-primary focus:ring-primary/60'
        } bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none transition ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-rose-300">
          {error}
        </span>
      )}
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
