import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from 'react-i18next';

const Schema = z.object({
  name: z.string().min(2),
  company: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  project_type: z.string().optional(),
  budget_range: z.string().optional(),
  start_date: z.string().optional(),
  message: z.string().optional(),
});

type FormData = z.infer<typeof Schema>;

export default function RFQForm(){
  const { t } = useTranslation();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(Schema) });
  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: (data: FormData) => api.post('/api/v1/rfq/', data).then(r=>r.data)
  });

  const onSubmit = async (data: FormData) => {
    await mutateAsync(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid md:grid-cols-2 gap-4">
        <input className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.name')!} {...register('name')} />
        <input className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.company')!} {...register('company')} />
        <input className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.email')!} {...register('email')} />
        <input className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.phone')!} {...register('phone')} />
        <input className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.location')!} {...register('location')} />
        <input className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.project_type')!} {...register('project_type')} />
        <input className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.budget_range')!} {...register('budget_range')} />
        <input type="date" className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.start_date')!} {...register('start_date')} />
      </div>
      <textarea rows={5} className="bg-transparent border border-white/10 rounded-xl p-3" placeholder={t('rfq.message')!} {...register('message')} />
      <button className="btn-primary" disabled={isPending}>{t('rfq.submit')}</button>
      {isSuccess && <p className="text-green-400">{t('rfq.success')}</p>}
      {isError && <p className="text-red-400">{t('rfq.error')}</p>}
    </form>
  );
}
