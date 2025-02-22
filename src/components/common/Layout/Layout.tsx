import { Modal } from '@ergolabs/ui-kit';
import React, {
  FC,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';

import { applicationConfig } from '../../../applicationConfig';
import { panalytics } from '../../../common/analytics';
import { device } from '../../../common/constants/size';
import { useApplicationSettings, useAppLoadingState } from '../../../context';
import { useSelectedNetwork } from '../../../gateway/common/network';
import { useBodyClass } from '../../../hooks/useBodyClass';
import { useMetaThemeColor } from '../../../hooks/useMetaThemeColor';
import { openCookiePolicy } from '../../../services/notifications/CookiePolicy/CookiePolicy';
import { NetworkHeight } from '../../NetworkHeight/NetworkHeight';
import { RebrandingModal } from '../../RebrandingModal/RebrandingModal';
import { useRebrandingShowed } from '../../RebrandingModal/useRebrandingShowed';
import { SocialLinks } from '../../SocialLinks/SocialLinks';
import { KyaModal } from '../KyaModal/KyaModal';
import { CardanoUpdate } from './CardanoUpdate/CardanoUpdate';
import { FooterNavigation } from './FooterNavigation/FooterNavigation';
import { Glow } from './Glow/Glow';
import { Header } from './Header/Header';

const MainContainer = styled.main`
  padding: 80px 2px 80px 8px;

  ${device.m} {
    padding: 80px 18px 80px 24px;
  }

  ${device.l} {
    padding-top: 100px;
  }

  ${device.l} {
    padding-top: 120px;
  }
`;

const _Layout: FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  const [{ theme }] = useApplicationSettings();
  const [network] = useSelectedNetwork();
  const ref = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [scrolledTop, setScrolledTop] = useState(true);
  const [rebrandingShowed, markRebrandingAsShowed] = useRebrandingShowed();

  useBodyClass([theme, network.name.toLowerCase()]);
  useMetaThemeColor({ dark: '#1D1D1D', light: `#F0F2F5` }, theme);
  const [{ isKYAAccepted }] = useAppLoadingState();

  useEffect(() => {
    if (!isKYAAccepted) {
      Modal.open(({ close }) => <KyaModal onClose={close} />, {
        afterClose: (isConfirmed) => {
          !isConfirmed && panalytics.closeKya();
          markRebrandingAsShowed();
        },
      });
      return;
    }
    openCookiePolicy();

    let timeOutId: any;
    if (!rebrandingShowed) {
      timeOutId = setTimeout(() => {
        Modal.open(({ close }) => <RebrandingModal close={close} />, {
          afterClose: () => markRebrandingAsShowed(),
        });
      }, 10_000);
    }

    return () => (timeOutId ? clearTimeout(timeOutId) : undefined);
  }, [isKYAAccepted, rebrandingShowed]);

  useEffect(() => {
    let currentScrollY = ref.current?.scrollTop || 0;

    const handleScroll = () => {
      setScrolled(currentScrollY < (ref.current?.scrollTop || 0));
      setScrolledTop((ref.current?.scrollTop || 0) < 5);
      currentScrollY = ref.current?.scrollTop || 0;
    };

    ref.current?.addEventListener('scroll', handleScroll);

    return () => document.removeEventListener('scroll', handleScroll);
  }, [ref]);

  const footerHeight = footerRef?.current?.clientHeight || 0;

  return (
    <div ref={ref} className={className}>
      <Glow />
      {applicationConfig.cardanoUpdate && network.name === 'cardano' ? (
        <CardanoUpdate />
      ) : (
        <>
          <Header scrolled={scrolled} scrolledTop={scrolledTop} />
          <MainContainer
            style={{ paddingBottom: footerHeight ? footerHeight + 8 : 80 }}
          >
            {children}
          </MainContainer>
          <footer>
            <SocialLinks />
            <NetworkHeight />
          </footer>
          <FooterNavigation ref={footerRef} />
        </>
      )}
    </div>
  );
};

export const Layout = styled(_Layout)`
  position: relative;
  height: 100%;
  overflow-y: scroll;
`;
