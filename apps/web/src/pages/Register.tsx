import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// We avoid useMutation here to prevent version-related errors
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Validation schema for registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['homeowner', 'contractor', 'subcontractor']),
});

type RegisterData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register: registerField,
    handleSubmit,
    formState,
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'homeowner' },
  });
  const { errors } = formState;

  // Custom submit handler since React Query caused issues
  const onSubmit = async (data: RegisterData) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Registration failed');
      }
      // registration successful, go to login page
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Registration failed');
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6">{t('register.title')}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block font-medium">{t('form.email')}</label>
          <input
            {...registerField('email')}
            className="w-full rounded-md border-gray-600 bg-dark-700 p-2 text-gray-100"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">{t('form.password')}</label>
          <input
            type="password"
            {...registerField('password')}
            className="w-full rounded-md border-gray-600 bg-dark-700 p-2 text-gray-100"
          />
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label className="block font-medium">{t('register.role')}</label>
          <select
            {...registerField('role')}
            className="w-full rounded-md border-gray-600 bg-dark-700 p-2 text-gray-100"
          >
            <option value="homeowner">{t('register.homeowner')}</option>
            <option value="contractor">{t('register.contractor')}</option>
            <option value="subcontractor">{t('register.subcontractor')}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 hover:bg-yellow-600 disabled:opacity-50"
        >
          {formState.isSubmitting ? t('form.sending') : t('register.submit')}
        </button>
      </form>
      <p className="mt-4">
        {t('register.haveAccount')} {''}
        <Link to="/login" className="text-primary underline">
          {t('register.loginLink')}
        </Link>
      </p>
    </div>
  );
};

export default Register;