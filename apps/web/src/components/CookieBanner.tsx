import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function CookieBanner(){
  const { t } = useTranslation();
  const [ok, setOk] = useState(true);
  useEffect(()=>{
    setOk(localStorage.getItem('cookie-ok') === '1');
  },[]);
  if(ok) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-card border border-white/10 rounded-2xl p-4 shadow-xl max-w-xl w-[95%]">
      <div className="text-sm text-white/80">{t('cookies.text')}</div>
      <div className="mt-3 text-right">
        <button className="btn-primary" onClick={()=>{localStorage.setItem('cookie-ok','1'); setOk(true);}}>{t('cookies.accept')}</button>
      </div>
    </div>
  );
}
