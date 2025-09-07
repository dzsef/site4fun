import { useTranslation } from 'react-i18next';

export default function Services(){
  const { t } = useTranslation();
  const list = t('services.list', { returnObjects: true }) as string[];
  return (
    <section className="container py-16">
      <h2 className="text-3xl font-extrabold">{t('services.title')}</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {list.map((s, i)=> (
          <div key={i} className="card">
            <div className="h-32 bg-white/5 rounded-lg mb-3" />
            <h3 className="font-bold">{s}</h3>
            <p className="text-white/70 text-sm mt-2">Rövid leírás a szolgáltatásról.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
