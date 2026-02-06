import React from 'react';
import { useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { COUNTRY_OPTIONS, PROVINCES_BY_COUNTRY } from '../data/geo';

// Validation schema for registration
const contractorProfileSchema = z.object({
  username: z.string().min(3).max(64),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  business_name: z.string().min(1),
  business_country: z.string().min(1),
  business_provinces: z.array(z.string().min(1)),
  business_cities: z.array(z.string().min(1)),
  birthday: z.string().optional(),
  gender: z.string().optional(),
  years_in_business: z.string().optional(),
});

const specialistProfileSchema = z.object({
  username: z.string().min(3).max(64),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  business_name: z.string().min(1),
  business_country: z.string().min(1),
  business_provinces: z.array(z.string().min(1)),
  business_cities: z.array(z.string().min(1)),
  birthday: z.string().optional(),
  years_of_experience: z.string().optional(),
  bio: z.string().max(2000).optional(),
  languages: z.array(z.string().min(1)).optional(),
});

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['contractor', 'specialist', 'subcontractor']),
    contractor_profile: contractorProfileSchema.optional(),
    specialist_profile: specialistProfileSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'contractor') {
      if (!data.contractor_profile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide your contractor details.',
          path: ['contractor_profile'],
        });
        return;
      }
      const profile = data.contractor_profile;
      const country = (profile.business_country || COUNTRY_OPTIONS[0].code).trim().toUpperCase();
      const allowedProvinces = new Set((PROVINCES_BY_COUNTRY[country] ?? []).map((option) => option.code));
      if (!COUNTRY_OPTIONS.find((option) => option.code === country)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unsupported country selection.',
          path: ['contractor_profile', 'business_country'],
        });
      }
      profile.business_provinces.forEach((province, index) => {
        const normalized = province.trim().toUpperCase();
        if (!allowedProvinces.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Province or territory is not available for the selected country.',
            path: ['contractor_profile', 'business_provinces', index],
          });
        }
      });
      const years = profile.years_in_business?.trim();
      if (years) {
        const parsed = Number(years);
        if (Number.isNaN(parsed) || parsed < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Years in business must be a non-negative number.',
            path: ['contractor_profile', 'years_in_business'],
          });
        }
      }
      if (!profile.business_provinces || profile.business_provinces.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select at least one province or territory.',
          path: ['contractor_profile', 'business_provinces'],
        });
      }
      if (!profile.business_cities || profile.business_cities.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Add at least one city.',
          path: ['contractor_profile', 'business_cities'],
        });
      }
      if (profile.birthday && profile.birthday.trim()) {
        const value = profile.birthday.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid date format.',
            path: ['contractor_profile', 'birthday'],
          });
        } else {
          const today = new Date().toISOString().slice(0, 10);
          if (value >= today) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Birthday must be in the past.',
              path: ['contractor_profile', 'birthday'],
            });
          }
        }
      }
    } else if (data.role === 'specialist') {
      if (!data.specialist_profile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide your specialist details.',
          path: ['specialist_profile'],
        });
        return;
      }
      const profile = data.specialist_profile;
      const country = (profile.business_country || COUNTRY_OPTIONS[0].code).trim().toUpperCase();
      const allowedProvinces = new Set((PROVINCES_BY_COUNTRY[country] ?? []).map((option) => option.code));
      if (!COUNTRY_OPTIONS.find((option) => option.code === country)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Unsupported country selection.',
          path: ['specialist_profile', 'business_country'],
        });
      }
      profile.business_provinces.forEach((province, index) => {
        const normalized = province.trim().toUpperCase();
        if (!allowedProvinces.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Province or territory is not available for the selected country.',
            path: ['specialist_profile', 'business_provinces', index],
          });
        }
      });
      if (!profile.business_provinces || profile.business_provinces.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select at least one province or territory.',
          path: ['specialist_profile', 'business_provinces'],
        });
      }
      if (!profile.business_cities || profile.business_cities.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Add at least one city.',
          path: ['specialist_profile', 'business_cities'],
        });
      }
      if (profile.years_of_experience && profile.years_of_experience.trim()) {
        const years = profile.years_of_experience.trim();
        const parsed = Number(years);
        if (Number.isNaN(parsed) || parsed < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Years of experience must be a non-negative number.',
            path: ['specialist_profile', 'years_of_experience'],
          });
        }
      }
      if (profile.birthday && profile.birthday.trim()) {
        const value = profile.birthday.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid date format.',
            path: ['specialist_profile', 'birthday'],
          });
        } else {
          const today = new Date().toISOString().slice(0, 10);
          if (value >= today) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Birthday must be in the past.',
              path: ['specialist_profile', 'birthday'],
            });
          }
        }
      }
    }
  });

type RegisterData = z.infer<typeof registerSchema>;

type ContractorRegistrationProfile = z.infer<typeof contractorProfileSchema>;
type SpecialistRegistrationProfile = z.infer<typeof specialistProfileSchema>;

const createEmptyContractorProfile = (): ContractorRegistrationProfile => ({
  username: '',
  first_name: '',
  last_name: '',
  business_name: '',
  business_country: COUNTRY_OPTIONS[0].code,
  business_provinces: [],
  business_cities: [],
  birthday: '',
  gender: '',
  years_in_business: '',
});

const createEmptySpecialistProfile = (): SpecialistRegistrationProfile => ({
  username: '',
  first_name: '',
  last_name: '',
  business_name: '',
  business_country: COUNTRY_OPTIONS[0].code,
  business_provinces: [],
  business_cities: [],
  birthday: '',
  years_of_experience: '',
  bio: '',
  languages: [],
});

type RoleOption = {
  key: RegisterData['role'];
  hue: string;
  accent: string;
  captionKey: string;
};

type HighlightKey = 'trust' | 'control' | 'velocity';
const highlightKeys: HighlightKey[] = ['trust', 'control', 'velocity'];

const highlightAccentByKey: Record<HighlightKey, string> = {
  trust: 'from-emerald-400/20 via-emerald-500/6 to-transparent',
  control: 'from-amber-400/20 via-orange-500/6 to-transparent',
  velocity: 'from-sky-400/20 via-indigo-500/6 to-transparent',
};

const roleOptions: RoleOption[] = [
  {
    key: 'contractor',
    hue: 'from-amber-400/45 via-orange-500/35 to-rose-500/45',
    accent: 'text-amber-200',
    captionKey: 'contractor',
  },
  {
    key: 'specialist',
    hue: 'from-emerald-400/45 via-teal-500/35 to-sky-500/45',
    accent: 'text-emerald-200',
    captionKey: 'specialist',
  },
  {
    key: 'subcontractor',
    hue: 'from-sky-400/45 via-indigo-500/35 to-violet-500/45',
    accent: 'text-sky-200',
    captionKey: 'subcontractor',
  },
];

const totalSteps = 2;

const Register: React.FC = () => {
  const { t } = useTranslation();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const {
    register: registerField,
    handleSubmit,
    formState,
    setValue,
    watch,
    reset,
    trigger,
    clearErrors,
    setFocus,
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'contractor',
      contractor_profile: createEmptyContractorProfile(),
      specialist_profile: undefined,
    },
  });
  const { errors, isSubmitting } = formState;
  const selectedRole = watch('role');
  const contractorCities = watch('contractor_profile.business_cities') ?? [];
  const contractorCountry = watch('contractor_profile.business_country') ?? COUNTRY_OPTIONS[0].code;
  const contractorProvinces = watch('contractor_profile.business_provinces') ?? [];
  const normalizedContractorCountry = React.useMemo(
    () => contractorCountry.trim().toUpperCase(),
    [contractorCountry],
  );
  const contractorProvinceOptions = React.useMemo(
    () => PROVINCES_BY_COUNTRY[normalizedContractorCountry] ?? [],
    [normalizedContractorCountry],
  );

  const specialistCities = watch('specialist_profile.business_cities') ?? [];
  const specialistLanguages = watch('specialist_profile.languages') ?? [];
  const specialistCountry = watch('specialist_profile.business_country') ?? COUNTRY_OPTIONS[0].code;
  const specialistProvinces = watch('specialist_profile.business_provinces') ?? [];
  const normalizedSpecialistCountry = React.useMemo(
    () => specialistCountry.trim().toUpperCase(),
    [specialistCountry],
  );
  const specialistProvinceOptions = React.useMemo(
    () => PROVINCES_BY_COUNTRY[normalizedSpecialistCountry] ?? [],
    [normalizedSpecialistCountry],
  );

  React.useEffect(() => {
    if (selectedRole !== 'contractor') return;
    const allowed = new Set(contractorProvinceOptions.map((option) => option.code));
    const filtered = contractorProvinces.filter((code: string) => allowed.has(code));
    const unchanged =
      filtered.length === contractorProvinces.length &&
      filtered.every((code, index) => code === contractorProvinces[index]);
    if (unchanged) {
      return;
    }
    setValue('contractor_profile.business_provinces', filtered, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [selectedRole, contractorProvinceOptions, contractorProvinces, setValue]);

  React.useEffect(() => {
    if (selectedRole !== 'specialist') return;
    const allowed = new Set(specialistProvinceOptions.map((option) => option.code));
    const filtered = specialistProvinces.filter((code: string) => allowed.has(code));
    const unchanged =
      filtered.length === specialistProvinces.length &&
      filtered.every((code, index) => code === specialistProvinces[index]);
    if (unchanged) {
      return;
    }
    setValue('specialist_profile.business_provinces', filtered, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }, [selectedRole, specialistProvinceOptions, specialistProvinces, setValue]);

  const [contractorCityDraft, setContractorCityDraft] = React.useState('');
  const [specialistCityDraft, setSpecialistCityDraft] = React.useState('');
  const [languageDraft, setLanguageDraft] = React.useState('');
  const genderOptions = React.useMemo(
    () => [
      { value: '', label: t('profile.contractor.genderOptions.undefined') },
      { value: 'female', label: t('profile.contractor.genderOptions.female') },
      { value: 'male', label: t('profile.contractor.genderOptions.male') },
      { value: 'non-binary', label: t('profile.contractor.genderOptions.nonBinary') },
      { value: 'prefer-not-to-say', label: t('profile.contractor.genderOptions.noAnswer') },
    ],
    [t],
  );
  const maxBirthday = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const goToNextStep = React.useCallback(async () => {
    const valid = await trigger(['email', 'password']);
    if (valid) {
      setErrorMessage(null);
      setStep(2);
    }
  }, [trigger]);

  const goToPreviousStep = React.useCallback(() => {
    setStep(1);
  }, []);

  const addContractorCity = React.useCallback(() => {
    if (selectedRole !== 'contractor') return;
    const normalized = contractorCityDraft.trim();
    if (!normalized) return;
    const exists = contractorCities.some((city) => city.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setContractorCityDraft('');
      return;
    }
    const updated = [...contractorCities, normalized];
    setValue('contractor_profile.business_cities', updated, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    clearErrors('contractor_profile.business_cities');
    setContractorCityDraft('');
  }, [clearErrors, contractorCities, contractorCityDraft, selectedRole, setValue]);

  const removeContractorCity = React.useCallback(
    (index: number) => {
      if (selectedRole !== 'contractor') return;
      const updated = contractorCities.filter((_, idx) => idx !== index);
      setValue('contractor_profile.business_cities', updated, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
    },
    [contractorCities, selectedRole, setValue],
  );

  const toggleContractorProvince = React.useCallback(
    (code: string) => {
      if (selectedRole !== 'contractor') return;
      const normalizedCode = code.toUpperCase();
      const allowed = new Set(contractorProvinceOptions.map((option) => option.code));
      if (!allowed.has(normalizedCode)) {
        return;
      }
      const updated = contractorProvinces.includes(normalizedCode)
        ? contractorProvinces.filter((item: string) => item !== normalizedCode)
        : [...contractorProvinces, normalizedCode];
      setValue('contractor_profile.business_provinces', updated, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
      clearErrors('contractor_profile.business_provinces');
    },
    [selectedRole, contractorProvinceOptions, contractorProvinces, setValue, clearErrors],
  );

  const handleContractorCityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addContractorCity();
      return;
    }
    if (event.key === 'Backspace' && !contractorCityDraft && contractorCities.length > 0) {
      event.preventDefault();
      removeContractorCity(contractorCities.length - 1);
    }
  };

  const addSpecialistCity = React.useCallback(() => {
    if (selectedRole !== 'specialist') return;
    const normalized = specialistCityDraft.trim();
    if (!normalized) return;
    const exists = specialistCities.some((city) => city.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setSpecialistCityDraft('');
      return;
    }
    const updated = [...specialistCities, normalized];
    setValue('specialist_profile.business_cities', updated, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    clearErrors('specialist_profile.business_cities');
    setSpecialistCityDraft('');
  }, [clearErrors, selectedRole, setValue, specialistCities, specialistCityDraft]);

  const removeSpecialistCity = React.useCallback(
    (index: number) => {
      if (selectedRole !== 'specialist') return;
      const updated = specialistCities.filter((_, idx) => idx !== index);
      setValue('specialist_profile.business_cities', updated, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
    },
    [selectedRole, setValue, specialistCities],
  );

  const toggleSpecialistProvince = React.useCallback(
    (code: string) => {
      if (selectedRole !== 'specialist') return;
      const normalizedCode = code.toUpperCase();
      const allowed = new Set(specialistProvinceOptions.map((option) => option.code));
      if (!allowed.has(normalizedCode)) {
        return;
      }
      const updated = specialistProvinces.includes(normalizedCode)
        ? specialistProvinces.filter((item: string) => item !== normalizedCode)
        : [...specialistProvinces, normalizedCode];
      setValue('specialist_profile.business_provinces', updated, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
      clearErrors('specialist_profile.business_provinces');
    },
    [clearErrors, selectedRole, setValue, specialistProvinceOptions, specialistProvinces],
  );

  const handleSpecialistCityKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSpecialistCity();
      return;
    }
    if (event.key === 'Backspace' && !specialistCityDraft && specialistCities.length > 0) {
      event.preventDefault();
      removeSpecialistCity(specialistCities.length - 1);
    }
  };

  const addLanguage = React.useCallback(() => {
    if (selectedRole !== 'specialist') return;
    const normalized = languageDraft.trim();
    if (!normalized) return;
    const exists = specialistLanguages.some((language) => language.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setLanguageDraft('');
      return;
    }
    const updated = [...specialistLanguages, normalized];
    setValue('specialist_profile.languages', updated, {
      shouldDirty: true,
      shouldValidate: true,
      shouldTouch: true,
    });
    clearErrors('specialist_profile.languages');
    setLanguageDraft('');
  }, [clearErrors, languageDraft, selectedRole, setValue, specialistLanguages]);

  const removeLanguage = React.useCallback(
    (index: number) => {
      if (selectedRole !== 'specialist') return;
      const updated = specialistLanguages.filter((_, idx) => idx !== index);
      setValue('specialist_profile.languages', updated, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true,
      });
    },
    [selectedRole, setValue, specialistLanguages],
  );

  const handleLanguageKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addLanguage();
      return;
    }
    if (event.key === 'Backspace' && !languageDraft && specialistLanguages.length > 0) {
      event.preventDefault();
      removeLanguage(specialistLanguages.length - 1);
    }
  };

  const contractorProfileError =
    errors.contractor_profile && 'message' in errors.contractor_profile
      ? (errors.contractor_profile.message as string | undefined)
      : null;

  const specialistProfileError =
    errors.specialist_profile && 'message' in errors.specialist_profile
      ? (errors.specialist_profile.message as string | undefined)
      : null;

  const onSubmit = async (data: RegisterData) => {
    try {
      setErrorMessage(null);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const payload: Record<string, unknown> = {
        email: data.email,
        password: data.password,
        role: data.role,
      };

      if (data.role === 'contractor' && data.contractor_profile) {
        const profile = data.contractor_profile;
        const country = profile.business_country.trim().toUpperCase() || COUNTRY_OPTIONS[0].code;
        const allowedProvinces = new Set((PROVINCES_BY_COUNTRY[country] ?? []).map((option) => option.code));
        const trimmedCities = (profile.business_cities ?? [])
          .map((city) => city.trim())
          .filter((city) => city.length > 0);
        const trimmedProvinces = (profile.business_provinces ?? [])
          .map((province) => province.trim().toUpperCase())
          .filter((province) => province.length > 0 && allowedProvinces.has(province));
        const uniqueProvinces = Array.from(new Set(trimmedProvinces));
        payload.contractor_profile = {
          username: profile.username.trim(),
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          business_name: profile.business_name.trim(),
          business_location: {
            country,
            provinces: uniqueProvinces,
            cities: trimmedCities,
          },
          birthday: profile.birthday?.trim() ? profile.birthday.trim() : undefined,
          gender: profile.gender?.trim() ? profile.gender.trim() : undefined,
          years_in_business: profile.years_in_business?.trim()
            ? Number(profile.years_in_business.trim())
            : undefined,
        };
      } else if (data.role === 'specialist' && data.specialist_profile) {
        const profile = data.specialist_profile;
        const country = profile.business_country.trim().toUpperCase() || COUNTRY_OPTIONS[0].code;
        const allowedProvinces = new Set((PROVINCES_BY_COUNTRY[country] ?? []).map((option) => option.code));
        const trimmedCities = (profile.business_cities ?? [])
          .map((city) => city.trim())
          .filter((city) => city.length > 0);
        const trimmedProvinces = (profile.business_provinces ?? [])
          .map((province) => province.trim().toUpperCase())
          .filter((province) => province.length > 0 && allowedProvinces.has(province));
        const uniqueProvinces = Array.from(new Set(trimmedProvinces));
        const normalizedLanguages = (profile.languages ?? [])
          .map((language) => language.trim())
          .filter((language) => language.length > 0);
        const uniqueLanguages = Array.from(new Set(normalizedLanguages));
        let yearsOfExperience: number | undefined;
        if (profile.years_of_experience?.trim()) {
          const parsedYears = Number(profile.years_of_experience.trim());
          if (!Number.isNaN(parsedYears)) {
            yearsOfExperience = parsedYears;
          }
        }

        payload.specialist_profile = {
          username: profile.username.trim(),
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          business_name: profile.business_name.trim(),
          business_location: {
            country,
            provinces: uniqueProvinces,
            cities: trimmedCities,
          },
          birthday: profile.birthday?.trim() ? profile.birthday.trim() : undefined,
          years_of_experience: yearsOfExperience,
          bio: profile.bio?.trim() ? profile.bio.trim() : undefined,
          languages: uniqueLanguages,
        };
      }

      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || t('register.errors.generic'));
      }
      const responsePayload = await res.json().catch(() => null);
      setSuccessMessage(responsePayload?.message || t('register.successFallback'));
      reset({
        email: '',
        password: '',
        role: 'contractor',
        contractor_profile: createEmptyContractorProfile(),
        specialist_profile: undefined,
      });
      setContractorCityDraft('');
      setSpecialistCityDraft('');
      setLanguageDraft('');
      clearErrors();
      setStep(1);
    } catch (err) {
      console.error(err);
      setErrorMessage((err as Error).message || t('register.errors.generic'));
    }
  };

  const setRole = (role: RegisterData['role']) => {
    if (selectedRole === role) {
      return;
    }

    setValue('role', role, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

    const setContractor = role === 'contractor';
    const setSpecialist = role === 'specialist';

    setValue('contractor_profile', setContractor ? createEmptyContractorProfile() : undefined, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    setContractorCityDraft('');
    clearErrors(['contractor_profile', 'contractor_profile.business_provinces', 'contractor_profile.business_cities']);

    setValue('specialist_profile', setSpecialist ? createEmptySpecialistProfile() : undefined, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
    setSpecialistCityDraft('');
    setLanguageDraft('');
    clearErrors([
      'specialist_profile',
      'specialist_profile.business_provinces',
      'specialist_profile.business_cities',
      'specialist_profile.languages',
    ]);
  };

  const progressPercent = (step / totalSteps) * 100;
  const sliderTransform = step === 1 ? 'translate-x-0' : '-translate-x-full';

  const findFirstError = React.useCallback(
    (invalidErrors: FieldErrors<RegisterData>, parentPath: string[] = []): { name?: string; message?: string } | null => {
      for (const key of Object.keys(invalidErrors)) {
        if (key === '_errors') continue;
        const errorEntry = invalidErrors[key as keyof FieldErrors<RegisterData>];
        if (!errorEntry) continue;

        const currentPath = [...parentPath, key];

        if (typeof errorEntry === 'object' && 'message' in errorEntry && errorEntry.message) {
          const fieldName = 'ref' in errorEntry && errorEntry.ref?.name ? errorEntry.ref.name : currentPath.join('.');
          return { name: fieldName, message: errorEntry.message as string };
        }

        if (Array.isArray(errorEntry)) {
          for (let index = 0; index < errorEntry.length; index += 1) {
            const nestedEntry = errorEntry[index];
            if (!nestedEntry) continue;
            const nested = findFirstError(nestedEntry as FieldErrors<RegisterData>, [...currentPath, String(index)]);
            if (nested) {
              if (!nested.name) {
                nested.name = [...currentPath, String(index)].join('.');
              }
              return nested;
            }
          }
        } else if (typeof errorEntry === 'object') {
          const nested = findFirstError(errorEntry as FieldErrors<RegisterData>, currentPath);
          if (nested) {
            if (!nested.name) {
              nested.name = currentPath.join('.');
            }
            return nested;
          }
        }
      }
      return null;
    },
    [],
  );

  const mapErrorMessage = React.useCallback(
    (fieldName?: string, message?: string) => {
      if (!message) {
        return t('register.errors.validation');
      }
      if (message.includes('at least 3 character')) {
        if (fieldName?.includes('username')) {
          return t('register.errors.min3Username');
        }
        return t('register.errors.min3');
      }
      if (message.includes('at least 1 character')) {
        return t('register.errors.required');
      }
      if (message.includes('Required')) {
        return t('register.errors.required');
      }
      return message;
    },
    [t],
  );

  const handleFormKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (step !== 1 || event.key !== 'Enter') return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'textarea' || target?.getAttribute('type') === 'submit') {
        return;
      }

      event.preventDefault();
      void goToNextStep();
    },
    [goToNextStep, step],
  );

  const onInvalid = React.useCallback(
    (invalidErrors: FieldErrors<RegisterData>) => {
      const firstError = findFirstError(invalidErrors);
      if (firstError?.name) {
        setFocus(firstError.name as any, { shouldSelect: true });
      }
      setErrorMessage(mapErrorMessage(firstError?.name, firstError?.message));
      console.warn('Registration validation failed', invalidErrors);
    },
    [findFirstError, mapErrorMessage, setFocus],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060f] text-gray-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(58,88,214,0.12),transparent_70%)]" />
        <div className="absolute -left-32 top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-primary/18 blur-[240px]" />
        <div className="absolute right-[-24rem] bottom-[-10rem] h-[34rem] w-[34rem] rounded-full bg-emerald-500/14 blur-[260px]" />
        <div className="absolute left-1/2 top-1/3 h-[20rem] w-[52rem] -translate-x-1/2 rounded-full bg-white/5 blur-[320px] opacity-20" />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-6 py-20 md:px-16 xl:max-w-[1650px] xl:px-20 2xl:max-w-[1750px] 2xl:px-24">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] xl:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] xl:gap-22">
          <div className="flex flex-col gap-12 lg:pr-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-primary/70">
              {t('register.tagline')}
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold text-white md:text-5xl">
                {step === 1 ? t('register.steps.intro.heroTitle') : t('register.steps.details.heroTitle')}
              </h1>
              <p className="text-base text-white/75 md:text-lg">
                {step === 1 ? t('register.steps.intro.heroSubtitle') : t('register.steps.details.heroSubtitle')}
              </p>
            </div>
            <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_120px_rgba(6,12,32,0.42)] backdrop-blur-xl">
              <p className="text-sm text-white/70">{t('register.steps.intro.helper')}</p>
              <ul className="space-y-4">
                {highlightKeys.map((key, index) => {
                  const accent = highlightAccentByKey[key];
                  return (
                    <li
                      key={key}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1124]/60 p-5 transition duration-500 ease-out hover:border-primary/60 hover:shadow-[0_24px_80px_rgba(12,18,44,0.5)]"
                    >
                      <span
                        className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br ${accent}`}
                      />
                      <div className="relative z-10 flex items-start gap-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-xs font-semibold text-white/70">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">
                            {t(`register.highlights.${key}.title`)}
                          </p>
                          <p className="text-sm text-white/65">
                            {t(`register.highlights.${key}.description`)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-0 -translate-y-12 rounded-[3rem] bg-gradient-to-br from-primary/20 via-transparent to-transparent blur-3xl" />
            <form
              onSubmit={handleSubmit(onSubmit, onInvalid)}
              onKeyDown={handleFormKeyDown}
              className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#090d1d]/90 px-10 py-12 shadow-[0_45px_160px_rgba(5,10,30,0.65)] backdrop-blur-2xl sm:px-12 sm:py-14 lg:px-16 xl:px-20"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),transparent_65%)] opacity-80" />
              <div className="relative z-10 space-y-10">
                {successMessage ? (
                  <div className="space-y-10 text-center">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300/80">
                        {t('register.successTitle')}
                      </p>
                      <p className="text-base text-white/85">{successMessage}</p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm text-white/65">{t('register.successHint')}</p>
                      <Link
                        to="/login"
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary via-amber-400 to-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-dark-900 shadow-[0_24px_80px_rgba(245,184,0,0.4)] transition hover:scale-[1.02]"
                      >
                        {t('register.goToLogin')}
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMessage(null);
                        setErrorMessage(null);
                        reset({
                          email: '',
                          password: '',
                          role: 'contractor',
                          contractor_profile: createEmptyContractorProfile(),
                          specialist_profile: undefined,
                        });
                        setContractorCityDraft('');
                        setSpecialistCityDraft('');
                        setLanguageDraft('');
                        setStep(1);
                      }}
                      className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60 underline underline-offset-4 transition hover:text-white"
                    >
                      {t('register.registerAgain')}
                    </button>
                  </div>
                ) : (
                  <>
                    <input type="hidden" value={selectedRole} readOnly {...registerField('role')} />
                    <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-white/55">
                      <span>{t('register.steps.stepLabel', { current: step, total: totalSteps })}</span>
                      <span>{step === 1 ? t('register.steps.intro.pill') : t('register.steps.details.pill')}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition ${step === 1 ? 'border-primary bg-primary/20 text-primary' : 'border-white/15 text-white/45'
                          }`}
                      >
                        1
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-r from-white/15 via-white/5 to-transparent" />
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition ${step === 2 ? 'border-primary bg-primary/20 text-primary' : 'border-white/15 text-white/45'
                          }`}
                      >
                        2
                      </div>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-rose-400 transition-[width] duration-700 ease-[cubic-bezier(.22,1.28,.33,1.01)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="relative overflow-hidden rounded-[1.9rem] border border-white/8 bg-[#0b1124]/80">
                      <div
                        className={`flex w-full transition-transform duration-700 ease-[cubic-bezier(.22,1.28,.33,1.01)] ${sliderTransform}`}
                      >
                        <div className="w-full shrink-0 space-y-6 px-8 py-10 md:px-10 md:py-14 xl:px-14">
                          <div className="space-y-4">
                            <h3 className="text-2xl font-semibold text-white md:text-3xl">
                              {t('register.steps.intro.title')}
                            </h3>
                            <p className="text-sm text-white/65 md:text-base">
                              {t('register.steps.intro.subtitle')}
                            </p>
                          </div>
                          <div className="space-y-5 rounded-3xl border border-white/10 bg-[#070b1f]/70 px-5 pt-5 pb-2 shadow-[0_26px_90px_rgba(4,10,26,0.55)]">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                                {t('register.role')}
                              </label>
                              <div className="grid gap-4 sm:grid-cols-1 sm:gap-5 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
                                {roleOptions.map(({ key, hue, accent, captionKey }) => {
                                  const active = selectedRole === key;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => setRole(key)}
                                      className={`group relative flex h-full flex-col items-center overflow-hidden rounded-2xl border border-white/12 px-5 py-5 text-center text-base font-semibold uppercase tracking-[0.025em] transition-all duration-500 ease-[cubic-bezier(.22,1.61,.36,1)] hover:-translate-y-1 hover:scale-[1.01] xl:px-6 xl:py-6 2xl:px-8 2xl:py-8 ${active ? 'bg-white/10 text-white' : 'bg-[#0D1423] text-white/75'
                                        }`}
                                    >
                                      <span
                                        className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 ${active ? 'opacity-100' : 'group-hover:opacity-70'
                                          } ${hue}`}
                                      />
                                      <span className="pointer-events-none absolute -left-14 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
                                      <span
                                        className={`relative z-10 block text-sm font-semibold uppercase tracking-[0.035em] ${accent} leading-snug whitespace-normal`}
                                      >
                                        {t(`register.${key}`)}
                                      </span>
                                      <span className="relative z-10 mt-3 block text-xs lowercase text-white/70 leading-relaxed break-words">
                                        {t(`register.roles.${captionKey}.caption`)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                {t('form.email')}
                              </label>
                              <input
                                {...registerField('email')}
                                className="w-full rounded-2xl border border-white/10 bg-[#050910]/80 px-4 py-3 text-base text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                              />
                              {errors.email && (
                                <p className="text-xs font-medium text-rose-300">{errors.email.message}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                {t('form.password')}
                              </label>
                              <input
                                type="password"
                                {...registerField('password')}
                                className="w-full rounded-2xl border border-white/10 bg-[#050910]/80 px-4 py-3 text-base text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                              />
                              {errors.password && (
                                <p className="text-xs font-medium text-rose-300">{errors.password.message}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={goToNextStep}
                              disabled={isSubmitting}
                              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-primary to-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t('register.steps.next')}
                            </button>
                          </div>
                        </div>

                        <div className="w-full shrink-0 space-y-6 px-8 py-10 md:px-10 md:py-14">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-3">
                              <h3 className="text-2xl font-semibold text-white md:text-3xl">
                                {t('register.steps.details.title')}
                              </h3>
                              <p className="text-sm text-white/70 md:text-base">
                                {t('register.steps.details.subtitle')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={goToPreviousStep}
                              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-primary/60 hover:text-primary"
                            >
                              {t('register.steps.back')}
                            </button>
                          </div>

                          {errorMessage && (
                            <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                              {errorMessage}
                            </div>
                          )}
                          {selectedRole === 'contractor' && contractorProfileError && (
                            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                              {contractorProfileError}
                            </div>
                          )}
                          {selectedRole === 'specialist' && specialistProfileError && (
                            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                              {specialistProfileError}
                            </div>
                          )}

                          {selectedRole === 'contractor' && (
                            <div className="space-y-5 rounded-3xl border border-white/10 bg-[#0B121F] px-5 py-6 shadow-[0_26px_80px_rgba(3,7,18,0.6)]">
                              <div className="space-y-3">
                                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                  {t('register.contractorExtra.identity')}
                                </span>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('form.username')}
                                    </label>
                                    <input
                                      {...registerField('contractor_profile.username')}
                                      autoComplete="username"
                                      placeholder={t('register.contractorExtra.usernamePlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                    />
                                    {errors.contractor_profile?.username && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.contractor_profile.username.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.personal.firstName')}
                                    </label>
                                    <input
                                      {...registerField('contractor_profile.first_name')}
                                      autoComplete="given-name"
                                      placeholder={t('profile.contractor.personal.firstNamePlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                    />
                                    {errors.contractor_profile?.first_name && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.contractor_profile.first_name.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.personal.lastName')}
                                    </label>
                                    <input
                                      {...registerField('contractor_profile.last_name')}
                                      autoComplete="family-name"
                                      placeholder={t('profile.contractor.personal.lastNamePlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                    />
                                    {errors.contractor_profile?.last_name && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.contractor_profile.last_name.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.personal.birthday')}
                                    </label>
                                    <input
                                      type="date"
                                      max={maxBirthday}
                                      {...registerField('contractor_profile.birthday')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                    />
                                    {errors.contractor_profile?.birthday && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.contractor_profile.birthday.message as string}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                  {t('register.contractorExtra.business')}
                                </span>
                                <div className="space-y-6">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                        {t('profile.contractor.business.name')}
                                      </label>
                                      <input
                                        {...registerField('contractor_profile.business_name')}
                                        autoComplete="organization"
                                        placeholder={t('profile.contractor.business.namePlaceholder')}
                                        className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                      />
                                      {errors.contractor_profile?.business_name && (
                                        <p className="text-xs font-medium text-rose-300">
                                          {errors.contractor_profile.business_name.message as string}
                                        </p>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                        {t('profile.contractor.business.country')}
                                      </label>
                                      <div className="relative">
                                        <select
                                          {...registerField('contractor_profile.business_country')}
                                          autoComplete="country-name"
                                          className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
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
                                      {errors.contractor_profile?.business_country && (
                                        <p className="text-xs font-medium text-rose-300">
                                          {errors.contractor_profile.business_country.message as string}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('register.contractorExtra.provinces')}
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {contractorProvinceOptions.length === 0 ? (
                                        <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                                          {t('register.contractorExtra.noProvinces')}
                                        </span>
                                      ) : (
                                        contractorProvinceOptions.map((option) => {
                                          const active = contractorProvinces.includes(option.code);
                                          return (
                                            <button
                                              key={option.code}
                                              type="button"
                                              onClick={() => toggleContractorProvince(option.code)}
                                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] transition ${active
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
                                      {t('register.contractorExtra.provincesHint')}
                                    </p>
                                    {errors.contractor_profile?.business_provinces && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.contractor_profile.business_provinces.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.business.years')}
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      inputMode="numeric"
                                      {...registerField('contractor_profile.years_in_business')}
                                      placeholder={t('profile.contractor.business.yearsPlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                    />
                                    {errors.contractor_profile?.years_in_business && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.contractor_profile.years_in_business.message as string}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                  {t('profile.contractor.business.cities')}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {contractorCities.length === 0 ? (
                                    <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                                      {t('profile.contractor.business.citiesEmpty')}
                                    </span>
                                  ) : (
                                    contractorCities.map((city, index) => (
                                      <span
                                        key={`${city}-${index.toString()}`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs text-white"
                                      >
                                        {city}
                                        <button
                                          type="button"
                                          onClick={() => removeContractorCity(index)}
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
                                    value={contractorCityDraft}
                                    onChange={(event) => setContractorCityDraft(event.target.value)}
                                    onKeyDown={handleContractorCityKeyDown}
                                    placeholder={t('profile.contractor.business.cityPlaceholder')}
                                    className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
                                  />
                                  <button
                                    type="button"
                                    onClick={addContractorCity}
                                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-primary/60 hover:text-primary"
                                  >
                                    {t('register.contractorExtra.addCity')}
                                  </button>
                                </div>
                                <p className="text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
                                  {t('register.contractorExtra.cityHelper')}
                                </p>
                                {errors.contractor_profile?.business_cities && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.contractor_profile.business_cities.message as string}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {selectedRole === 'specialist' && (
                            <div className="space-y-5 rounded-3xl border border-white/10 bg-[#0B121F] px-5 py-6 shadow-[0_26px_80px_rgba(3,7,18,0.6)]">
                              <div className="space-y-3">
                                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                  {t('register.specialistExtra.identity')}
                                </span>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('form.username')}
                                    </label>
                                    <input
                                      {...registerField('specialist_profile.username')}
                                      autoComplete="username"
                                      placeholder={t('register.specialistExtra.usernamePlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                    />
                                    {errors.specialist_profile?.username && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.username.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.personal.firstName')}
                                    </label>
                                    <input
                                      {...registerField('specialist_profile.first_name')}
                                      autoComplete="given-name"
                                      placeholder={t('profile.contractor.personal.firstNamePlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                    />
                                    {errors.specialist_profile?.first_name && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.first_name.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.personal.lastName')}
                                    </label>
                                    <input
                                      {...registerField('specialist_profile.last_name')}
                                      autoComplete="family-name"
                                      placeholder={t('profile.contractor.personal.lastNamePlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                    />
                                    {errors.specialist_profile?.last_name && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.last_name.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.personal.birthday')}
                                    </label>
                                    <input
                                      type="date"
                                      max={maxBirthday}
                                      {...registerField('specialist_profile.birthday')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                    />
                                    {errors.specialist_profile?.birthday && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.birthday.message as string}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                  {t('register.specialistExtra.business')}
                                </span>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.business.name')}
                                    </label>
                                    <input
                                      {...registerField('specialist_profile.business_name')}
                                      placeholder={t('profile.contractor.business.namePlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                    />
                                    {errors.specialist_profile?.business_name && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.business_name.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('profile.contractor.business.country')}
                                    </label>
                                    <div className="relative">
                                      <select
                                        {...registerField('specialist_profile.business_country')}
                                        autoComplete="country-name"
                                        className="w-full appearance-none rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
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
                                    {errors.specialist_profile?.business_country && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.business_country.message as string}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <span className="text-xs font-semibold uppercase tracking-[0.32em] text-white/55">
                                    {t('register.specialistExtra.provinces')}
                                  </span>
                                  <div className="flex flex-wrap gap-2">
                                    {specialistProvinceOptions.length === 0 ? (
                                      <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                                        {t('register.specialistExtra.noProvinces')}
                                      </span>
                                    ) : (
                                      specialistProvinceOptions.map((option) => {
                                        const active = specialistProvinces.includes(option.code);
                                        return (
                                          <button
                                            key={option.code}
                                            type="button"
                                            onClick={() => toggleSpecialistProvince(option.code)}
                                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] transition ${active
                                              ? 'border-emerald-400 bg-emerald-400 text-dark-900 shadow-[0_12px_30px_rgba(52,199,89,0.45)]'
                                              : 'border-white/15 bg-white/10 text-white hover:border-emerald-400/70 hover:text-emerald-300'
                                              }`}
                                          >
                                            {option.label}
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                  <p className="text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
                                    {t('register.specialistExtra.provincesHint')}
                                  </p>
                                  {errors.specialist_profile?.business_provinces && (
                                    <p className="text-xs font-medium text-rose-300">
                                      {errors.specialist_profile.business_provinces.message as string}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                  {t('register.specialistExtra.citiesLabel')}
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {specialistCities.length === 0 ? (
                                    <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                                      {t('register.specialistExtra.citiesEmpty')}
                                    </span>
                                  ) : (
                                    specialistCities.map((city, index) => (
                                      <span
                                        key={`${city}-${index.toString()}`}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs text-white"
                                      >
                                        {city}
                                        <button
                                          type="button"
                                          onClick={() => removeSpecialistCity(index)}
                                          className="text-white/70 transition hover:text-rose-300"
                                          aria-label={t('register.specialistExtra.removeCity', { city })}
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))
                                  )}
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                  <input
                                    value={specialistCityDraft}
                                    onChange={(event) => setSpecialistCityDraft(event.target.value)}
                                    onKeyDown={handleSpecialistCityKeyDown}
                                    placeholder={t('register.specialistExtra.cityPlaceholder')}
                                    className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                  />
                                  <button
                                    type="button"
                                    onClick={addSpecialistCity}
                                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-emerald-400/70 hover:text-emerald-300"
                                  >
                                    {t('register.specialistExtra.addCity')}
                                  </button>
                                </div>
                                <p className="text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
                                  {t('register.specialistExtra.cityHelper')}
                                </p>
                                {errors.specialist_profile?.business_cities && (
                                  <p className="text-xs font-medium text-rose-300">
                                    {errors.specialist_profile.business_cities.message as string}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-3">
                                <span className="text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-white/55">
                                  {t('register.specialistExtra.experience')}
                                </span>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('register.specialistExtra.years')}
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      inputMode="numeric"
                                      {...registerField('specialist_profile.years_of_experience')}
                                      placeholder={t('register.specialistExtra.yearsPlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                    />
                                    {errors.specialist_profile?.years_of_experience && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.years_of_experience.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('register.specialistExtra.languagesLabel')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                      {specialistLanguages.length === 0 ? (
                                        <span className="rounded-full border border-dashed border-white/15 px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] text-white/40">
                                          {t('register.specialistExtra.languagesEmpty')}
                                        </span>
                                      ) : (
                                        specialistLanguages.map((language, index) => (
                                          <span
                                            key={`${language}-${index.toString()}`}
                                            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs text-white"
                                          >
                                            {language}
                                            <button
                                              type="button"
                                              onClick={() => removeLanguage(index)}
                                              className="text-white/70 transition hover:text-rose-300"
                                              aria-label={t('register.specialistExtra.removeLanguage', { language })}
                                            >
                                              ×
                                            </button>
                                          </span>
                                        ))
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                      <input
                                        value={languageDraft}
                                        onChange={(event) => setLanguageDraft(event.target.value)}
                                        onKeyDown={handleLanguageKeyDown}
                                        placeholder={t('register.specialistExtra.languagePlaceholder')}
                                        className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                      />
                                      <button
                                        type="button"
                                        onClick={addLanguage}
                                        className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-emerald-400/70 hover:text-emerald-300"
                                      >
                                        {t('register.specialistExtra.addLanguage')}
                                      </button>
                                    </div>
                                    <p className="text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
                                      {t('register.specialistExtra.languageHelper')}
                                    </p>
                                    {errors.specialist_profile?.languages && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.languages.message as string}
                                      </p>
                                    )}
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                                      {t('register.specialistExtra.bioLabel')}
                                    </label>
                                    <textarea
                                      rows={4}
                                      {...registerField('specialist_profile.bio')}
                                      placeholder={t('register.specialistExtra.bioPlaceholder')}
                                      className="w-full rounded-2xl border border-white/10 bg-[#070B14]/80 px-4 py-3 text-sm text-white placeholder-white/45 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition"
                                    />
                                    {errors.specialist_profile?.bio && (
                                      <p className="text-xs font-medium text-rose-300">
                                        {errors.specialist_profile.bio.message as string}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 via-primary to-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-dark-900 shadow-[0_28px_70px_rgba(245,184,0,0.45)] transition-transform duration-300 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSubmitting ? t('form.sending') : t('register.submit')}
                            </button>
                            <p className="text-center text-xs text-white/55">
                              {t('register.haveAccount')} <Link to="/login" className="font-semibold text-primary transition hover:text-white">{t('register.loginLink')}</Link>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {step === 1 && (
                <p className="mt-3 text-[0.6rem] uppercase tracking-[0.26em] text-white/45">
                  {t('register.steps.intro.privacy')}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Register;
