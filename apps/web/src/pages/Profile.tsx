import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

type AvailabilitySlot = {
  date: string;
  start_time: string;
  end_time: string;
};

type ContractorProfile = {
  name: string | null;
  country: string | null;
  city: string | null;
  company_name: string | null;
};

type SubcontractorProfile = {
  bio: string | null;
  skills: string[];
  services: string[];
  years_of_experience: number | null;
  rates: number | null;
  area: string | null;
  availability: AvailabilitySlot[];
};

type HomeownerProfile = {
  name: string | null;
  city: string | null;
  investment_min: number | null;
  investment_max: number | null;
};

type ProfileResponse =
  | { role: 'contractor'; profile: ContractorProfile }
  | { role: 'subcontractor'; profile: SubcontractorProfile }
  | { role: 'homeowner'; profile: HomeownerProfile };

type ApiError = string | null;

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
      },
    };
  }
  if (data.role === 'subcontractor') {
    const profile = data.profile;
    return {
      role: 'subcontractor',
      profile: {
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
    },
  };
};

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const token = useMemo(() => localStorage.getItem('token'), []);

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
          navigate('/login', { replace: true });
          return;
        }
        if (!res.ok) {
          throw new Error(t('profile.errors.loadFailed'));
        }
        const data = (await res.json()) as ProfileResponse;
        setProfileData(sanitizeProfile(data));
        setError(null);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, t, token]);

  const handleUpdate = async (profile: Record<string, unknown>) => {
    if (!profileData || !token) return;
    try {
      setSaving(true);
      setError(null);
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
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const errPayload = await res.json().catch(() => null);
        throw new Error(errPayload?.detail || t('profile.errors.saveFailed'));
      }
      const updated = (await res.json()) as ProfileResponse;
      setProfileData(sanitizeProfile(updated));
      setSuccessMessage(t('profile.messages.saved'));
      setTimeout(() => setSuccessMessage(null), 3000);
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
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-md bg-dark-800 px-6 py-4 text-lg font-semibold text-gray-200 shadow-lg">
          {t('profile.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">{t('profile.title')}</h1>
        {profileData && (
          <p className="text-sm uppercase tracking-widest text-primary">
            {t('profile.roleLabel', { role: roleLabel })}
          </p>
        )}
      </div>
      {error && (
        <div className="mb-6 rounded-md border border-red-500/40 bg-red-900/20 px-4 py-3 text-red-200">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 rounded-md border border-green-500/40 bg-green-900/20 px-4 py-3 text-green-200">
          {successMessage}
        </div>
      )}
      <div className="rounded-2xl border border-dark-700 bg-dark-800/80 p-6 shadow-xl backdrop-blur">
        {renderForm()}
      </div>
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
  onSave: (update: ContractorProfile) => void | Promise<void>;
  saving: boolean;
};

const ContractorProfileForm: React.FC<ContractorProfileFormProps> = ({ data, onSave, saving }) => {
  const { t } = useTranslation();
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

  const submit = (values: ContractorFormValues) => {
    onSave({
      name: values.name || null,
      country: values.country || null,
      city: values.city || null,
      company_name: values.company_name || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-semibold text-dark-900 shadow transition-transform duration-300 ease-out hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
};

type SubcontractorProfileFormProps = {
  data: SubcontractorProfile;
  onSave: (update: SubcontractorProfile) => void | Promise<void>;
  saving: boolean;
};

type SubcontractorFormValues = {
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
      bio: data.bio ?? '',
      area: data.area ?? '',
      years_of_experience: data.years_of_experience?.toString() ?? '',
      rates: data.rates?.toString() ?? '',
    },
  });
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
      bio: data.bio ?? '',
      area: data.area ?? '',
      years_of_experience: data.years_of_experience?.toString() ?? '',
      rates: data.rates?.toString() ?? '',
    });
    setSkillsInput(data.skills.join(', '));
    setServicesInput(data.services.join(', '));
    setAvailability(data.availability.map((slot) => ({ ...slot })));
  }, [data, reset]);

  const parseList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

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

  const submit = (values: SubcontractorFormValues) => {
    const yearsValue = values.years_of_experience ? Number(values.years_of_experience) : null;
    const ratesValue = values.rates ? Number(values.rates) : null;
    onSave({
      bio: values.bio || null,
      skills: parseList(skillsInput),
      services: parseList(servicesInput),
      years_of_experience: Number.isNaN(yearsValue) ? null : yearsValue,
      rates: Number.isNaN(ratesValue) ? null : ratesValue,
      area: values.area || null,
      availability,
    });
  };

  const currentAvailabilitySignature = useMemo(
    () => JSON.stringify(availability),
    [availability],
  );

  const isFormDirty =
    isDirty ||
    skillsInput !== originalSkills ||
    servicesInput !== originalServices ||
    currentAvailabilitySignature !== originalAvailabilitySignature;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextAreaField
          label={t('profile.subcontractor.bio')}
          placeholder={t('profile.subcontractor.bioPlaceholder')}
          rows={5}
          {...register('bio')}
        />
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
        <div className="grid grid-cols-1 gap-4">
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
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">
          {t('profile.subcontractor.availability.title')}
        </h2>
        <p className="mb-4 text-sm text-gray-400">{t('profile.subcontractor.availability.hint')}</p>
        {availabilityError && (
          <p className="mb-3 text-sm text-red-300">{availabilityError}</p>
        )}
        <div className="flex flex-col gap-4 rounded-md border border-dark-700 bg-dark-900/40 p-4 shadow-inner md:flex-row md:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">
              {t('profile.subcontractor.availability.date')}
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-dark-600 bg-dark-700 px-3 py-2 text-gray-100 focus:border-primary focus:outline-none"
                value={newSlot.date}
                onChange={(event) => setNewSlot((prev) => ({ ...prev, date: event.target.value }))}
              />
            </label>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">
              {t('profile.subcontractor.availability.start')}
              <input
                type="time"
                className="mt-1 w-full rounded-md border border-dark-600 bg-dark-700 px-3 py-2 text-gray-100 focus:border-primary focus:outline-none"
                value={newSlot.start_time}
                onChange={(event) => setNewSlot((prev) => ({ ...prev, start_time: event.target.value }))}
              />
            </label>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">
              {t('profile.subcontractor.availability.end')}
              <input
                type="time"
                className="mt-1 w-full rounded-md border border-dark-600 bg-dark-700 px-3 py-2 text-gray-100 focus:border-primary focus:outline-none"
                value={newSlot.end_time}
                onChange={(event) => setNewSlot((prev) => ({ ...prev, end_time: event.target.value }))}
              />
            </label>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 shadow hover:scale-[1.02] hover:shadow-lg"
            onClick={addSlot}
          >
            {t('profile.subcontractor.availability.add')}
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {availability.length === 0 && (
            <li className="rounded-md border border-dashed border-dark-600 bg-dark-900/40 px-4 py-3 text-sm text-gray-400">
              {t('profile.subcontractor.availability.empty')}
            </li>
          )}
          {availability.map((slot, index) => (
            <li
              key={`${slot.date}-${slot.start_time}-${slot.end_time}-${index}`}
              className="flex flex-col gap-2 rounded-md border border-dark-600 bg-dark-900/60 px-4 py-3 shadow md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-primary">
                  {new Date(slot.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-300">
                  {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                </p>
              </div>
              <button
                type="button"
                className="self-start rounded-md border border-red-500/40 px-3 py-1 text-sm text-red-200 transition hover:bg-red-500/20"
                onClick={() => removeSlot(index)}
              >
                {t('profile.remove')}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !isFormDirty}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-semibold text-dark-900 shadow transition-transform duration-300 ease-out hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
};

type HomeownerProfileFormProps = {
  data: HomeownerProfile;
  onSave: (update: HomeownerProfile) => void | Promise<void>;
  saving: boolean;
};

type HomeownerFormValues = {
  name: string;
  city: string;
  investment_min: string;
  investment_max: string;
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

  useEffect(() => {
    reset({
      name: data.name ?? '',
      city: data.city ?? '',
      investment_min: data.investment_min?.toString() ?? '',
      investment_max: data.investment_max?.toString() ?? '',
    });
  }, [data, reset]);

  const submit = (values: HomeownerFormValues) => {
    const minValue = values.investment_min ? Number(values.investment_min) : null;
    const maxValue = values.investment_max ? Number(values.investment_max) : null;
    onSave({
      name: values.name || null,
      city: values.city || null,
      investment_min: Number.isNaN(minValue) ? null : minValue,
      investment_max: Number.isNaN(maxValue) ? null : maxValue,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-semibold text-dark-900 shadow transition-transform duration-300 ease-out hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('profile.saving') : t('profile.save')}
        </button>
      </div>
    </form>
  );
};

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, className = '', ...props }, ref) => (
    <label className="text-sm font-medium text-gray-300">
      {label}
      <input
        ref={ref}
        className={`mt-1 w-full rounded-md border border-dark-600 bg-dark-700 px-3 py-2 text-gray-100 focus:border-primary focus:outline-none ${className}`}
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
    <label className="text-sm font-medium text-gray-300">
      {label}
      <textarea
        ref={ref}
        className={`mt-1 w-full rounded-md border border-dark-600 bg-dark-700 px-3 py-2 text-gray-100 focus:border-primary focus:outline-none ${className}`}
        {...props}
      />
    </label>
  ),
);
TextAreaField.displayName = 'TextAreaField';
