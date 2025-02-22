import { Flex, Typography } from '@ergolabs/ui-kit';
import { Trans } from '@lingui/macro';
import React, { FC } from 'react';

import { AmmPool } from '../../../../../common/models/AmmPool';
import { AssetIconPair } from '../../../../../components/AssetIconPair/AssetIconPair';
import { DataTag } from '../../../../../components/common/DataTag/DataTag';
import { Truncate } from '../../../../../components/Truncate/Truncate';
import { formatToUSD } from '../../../../../services/number';

interface PoolSelectorItemProps {
  readonly ammPool: AmmPool;
  readonly hover?: boolean;
  readonly active?: boolean;
  readonly hideInfo?: boolean;
}

export const PoolView: FC<PoolSelectorItemProps> = ({
  ammPool,
  hover,
  active,
  hideInfo,
}) => (
  <Flex align="center" stretch>
    <Flex.Item marginRight={1}>
      <AssetIconPair assetX={ammPool.x.asset} assetY={ammPool.y.asset} />
    </Flex.Item>
    <Flex.Item marginRight={2} align="center">
      <Typography.Title level={5}>
        <Truncate>{ammPool.x.asset.ticker}</Truncate>/
        <Truncate>{ammPool.y.asset.ticker}</Truncate>
      </Typography.Title>
    </Flex.Item>

    {!hideInfo && (
      <>
        <Flex.Item marginRight={1} align="center">
          <Typography.Footnote>
            <Trans>Fee:</Trans>
          </Typography.Footnote>
        </Flex.Item>
        <Flex.Item marginRight={2} align="center">
          <DataTag
            size="default"
            secondary={!hover && !active}
            content={`${ammPool.poolFee}%`}
          />
        </Flex.Item>
        <Flex.Item marginRight={1} align="center">
          <Typography.Footnote>TVL:</Typography.Footnote>
        </Flex.Item>
        <Flex.Item>
          <DataTag
            size="default"
            secondary={!hover && !active}
            content={
              ammPool?.tvl ? formatToUSD(ammPool.tvl.currency, 'abbr') : '–––'
            }
          />
        </Flex.Item>
      </>
    )}
  </Flex>
);
