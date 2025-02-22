import Cookies from 'js-cookie';
import { useState } from 'react';

import { applicationConfig } from '../../applicationConfig';

const REBRANDING_COOKIE = 'rebranding-showed';

class RebrandingCookies {
  setRebrandingShowed(): void {
    if (this.isRebrandingShowed()) {
      return;
    }

    Cookies.set(REBRANDING_COOKIE, 'true', {
      domain: applicationConfig.cookieDomain,
    });
  }

  isRebrandingShowed(): boolean {
    return Cookies.get(REBRANDING_COOKIE) === 'true';
  }
}

const rebrandingCookies = new RebrandingCookies();

export const useRebrandingShowed = (): [boolean, () => void] => {
  const [rebrandingShowed, setRebrandingShowed] = useState<boolean>(
    rebrandingCookies.isRebrandingShowed(),
  );

  const markRebrandingAsShowed = () => {
    rebrandingCookies.setRebrandingShowed();
    setRebrandingShowed(true);
  };

  return [rebrandingShowed, markRebrandingAsShowed];
};
