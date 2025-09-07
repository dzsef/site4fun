import RFQForm from '@/components/RFQForm';
import { useTranslation } from 'react-i18next';

export default function RequestQuote(){
  const { t } = useTranslation();
  return (
    <section className="container py-16">
      <h2 className="text-3xl font-extrabold">{t('rfq.title')}</h2>
      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="card"><RFQForm /></div>
        <div>
          <div className="h-64 bg-white/5 rounded-xl" />
          <p className="text-white/70 mt-4">Kapcsolat: info@buildco.hu • +36 1 234 5678</p>
        </div>
      </div>
    </section>
  );
}
