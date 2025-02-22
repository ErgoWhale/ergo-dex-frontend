import { Button, DownOutlined, Flex, Form, Modal } from '@ergolabs/ui-kit';
import { Trans } from '@lingui/macro';
import React from 'react';
import { Observable } from 'rxjs';
import styled from 'styled-components';

import { panalytics } from '../../../../common/analytics';
import { PAnalytics } from '../../../../common/analytics/@types/types';
import { AssetInfo } from '../../../../common/models/AssetInfo';
import { AssetTitle } from '../../../AssetTitle/AssetTitle';
import { AssetListModal } from './AssetListModal/AssetListModal';

interface TokenSelectProps {
  readonly value?: AssetInfo | undefined;
  readonly onChange?: (value: AssetInfo) => void;
  readonly assets$?: Observable<AssetInfo[]>;
  readonly assetsToImport$?: Observable<AssetInfo[]>;
  readonly importedAssets$?: Observable<AssetInfo[]>;
  readonly disabled?: boolean;
  readonly readonly?: boolean;
  readonly analytics?: PAnalytics;
}

const StyledDownOutlined = styled(DownOutlined)`
  font-size: 1rem;
`;

const StyledButton = styled(Button)`
  padding: 0 calc(var(--spectrum-base-gutter) * 3);
  width: 100%;
`;

const AssetSelect: React.FC<TokenSelectProps> = ({
  value,
  onChange,
  disabled,
  readonly,
  assets$,
  assetsToImport$,
  importedAssets$,
  analytics,
}) => {
  const handleSelectChange = (newValue: AssetInfo): void => {
    if (value?.id !== newValue?.id && onChange) {
      onChange(newValue);
    }
    if (analytics && analytics.operation && analytics.tokenAssignment) {
      panalytics.selectToken(analytics.operation, analytics.tokenAssignment, {
        tokenId: newValue.id,
        tokenName: newValue.ticker,
      });
    }
  };

  const openTokenModal = () => {
    if (readonly) {
      return;
    }
    Modal.open(({ close }) => (
      <AssetListModal
        assetsToImport$={assetsToImport$}
        assets$={assets$}
        importedAssets$={importedAssets$}
        close={close}
        value={value}
        onSelectChanged={handleSelectChange}
      />
    ));
  };

  return (
    <StyledButton
      type={value ? 'ghost' : 'primary'}
      size="large"
      onClick={openTokenModal}
      disabled={disabled}
    >
      <Flex align="center">
        <Flex.Item flex={1} align="flex-start" display="flex">
          {value ? (
            <AssetTitle gap={2} asset={value} />
          ) : (
            <Trans>Select a token</Trans>
          )}
        </Flex.Item>
        <Flex.Item marginLeft={2}>
          <StyledDownOutlined />
        </Flex.Item>
      </Flex>
    </StyledButton>
  );
};

interface TokeSelectFormItem extends TokenSelectProps {
  name: string;
}

const AssetSelectFormItem: React.FC<TokeSelectFormItem> = ({
  name,
  ...rest
}) => {
  return (
    <Form.Item name={name}>
      {(params) => <AssetSelect {...{ ...rest, ...params }} />}
    </Form.Item>
  );
};

export { AssetSelect, AssetSelectFormItem };
