import { useEffect, useState } from 'react';
import { isPhoneLayout } from '../utils/viewport';

export function usePhoneLayout(): boolean {
  const [isPhone, setIsPhone] = useState(() => isPhoneLayout(window.innerWidth));

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsPhone(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return isPhone;
}
