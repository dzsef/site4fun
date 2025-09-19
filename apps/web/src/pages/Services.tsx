import React from 'react';
import { useTranslation } from 'react-i18next';

const Services: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">{t('services.title')}</h1>
      <p className="mb-6">{t('services.description')}</p>
      {/* Add service cards or list here in the future */}
    </section>
  );
};

export default Services;