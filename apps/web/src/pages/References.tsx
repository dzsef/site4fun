import { useTranslation } from 'react-i18next';

export default function References(){
  const { t } = useTranslation();
  return (
    <section className="container py-16">
      <h2 className="text-3xl font-extrabold">{t('references.title')}</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {Array.from({length:6}).map((_,i)=> (
          <div key={i} className="card">
            <div className="h-40 bg-white/5 rounded-lg mb-3" />
            <h3 className="font-bold">Projekt #{i+1}</h3>
            <p className="text-white/70 text-sm mt-2">Rövid projektleírás.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
