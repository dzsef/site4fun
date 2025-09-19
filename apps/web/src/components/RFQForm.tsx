import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

// Define a schema for form validation using zod
const rfqSchema = z.object({
  name: z.string().min(2, { message: 'form.errors.name' }),
  email: z.string().email({ message: 'form.errors.email' }),
  phone: z.string().optional(),
  message: z.string().min(10, { message: 'form.errors.message' }),
});

type RFQData = z.infer<typeof rfqSchema>;

const RFQForm: React.FC = () => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RFQData>({
    resolver: zodResolver(rfqSchema),
  });

  const onSubmit = async (data: RFQData) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const res = await fetch(`${baseUrl}/rfq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to submit');
      alert(t('request.success'));
      reset();
    } catch (e) {
      console.error(e);
      alert(t('request.error'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl mx-auto">
      <div>
        <label className="block font-medium">{t('form.name')}</label>
        <input
          {...register('name')}
          className="mt-1 w-full rounded-md border-gray-600 bg-dark-700 p-2 text-gray-100"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{t(errors.name.message as any)}</p>
        )}
      </div>
      <div>
        <label className="block font-medium">{t('form.email')}</label>
        <input
          type="email"
          {...register('email')}
          className="mt-1 w-full rounded-md border-gray-600 bg-dark-700 p-2 text-gray-100"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{t(errors.email.message as any)}</p>
        )}
      </div>
      <div>
        <label className="block font-medium">{t('form.phone')}</label>
        <input
          type="tel"
          {...register('phone')}
          className="mt-1 w-full rounded-md border-gray-600 bg-dark-700 p-2 text-gray-100"
        />
      </div>
      <div>
        <label className="block font-medium">{t('form.message')}</label>
        <textarea
          {...register('message')}
          rows={4}
          className="mt-1 w-full rounded-md border-gray-600 bg-dark-700 p-2 text-gray-100"
        />
        {errors.message && (
          <p className="text-red-500 text-sm">{t(errors.message.message as any)}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-dark-900 hover:bg-yellow-600 disabled:opacity-70"
      >
        {isSubmitting ? t('form.sending') : t('form.submit')}
      </button>
    </form>
  );
};

export default RFQForm;