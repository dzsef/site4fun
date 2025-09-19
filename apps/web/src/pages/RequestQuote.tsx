import React from 'react';
import { useTranslation } from 'react-i18next';
import RFQForm from '@/components/RFQForm';

const RequestQuote: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto text-center mb-8 px-4">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-gray-800 dark:text-gray-100">
          {t('request.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {t('request.intro')}
        </p>
      </div>
      <RFQForm />
    </div>
  );
};

export default RequestQuote;