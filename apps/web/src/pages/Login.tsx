import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// We avoid useMutation here to prevent version-related errors
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    register: registerField,
    handleSubmit,
    formState,
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });
  const { errors } = formState;

  // Custom submit handler since React Query caused issues
  const onSubmit = async (data: LoginData) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Invalid credentials');
      }
      const result = await res.json();
      localStorage.setItem('token', result.access_token);
      navigate('/');
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Login failed');
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <h1 className="text-3xl font-bold mb-6">{t('login.title')}</h1>
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
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 hover:bg-yellow-600 disabled:opacity-50"
        >
          {formState.isSubmitting ? t('form.sending') : t('login.submit')}
        </button>
      </form>
      <p className="mt-4">
        {t('login.noAccount')} {''}
        <Link to="/register" className="text-primary underline">
          {t('login.registerLink')}
        </Link>
      </p>
    </div>
  );
};

export default Login;