/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import './Swap.less';

import { AmmPool } from '@ergolabs/ergo-dex-sdk';
import { AssetAmount } from '@ergolabs/ergo-sdk';
import React, { FC, useEffect } from 'react';
import { Observable, of } from 'rxjs';

import {
  ActionForm,
  ActionFormStrategy,
} from '../../components/common/ActionForm/ActionForm';
import {
  TokenControlFormItem,
  TokenControlValue,
} from '../../components/common/TokenControl/TokenControl';
import { TxHistory } from '../../components/common/TxHistory/TxHistory';
import { FormPageWrapper } from '../../components/FormPageWrapper/FormPageWrapper';
import {
  ERG_DECIMALS,
  ERG_TOKEN_ID,
  ERG_TOKEN_NAME,
  UI_FEE,
} from '../../constants/erg';
import { defaultExFee } from '../../constants/settings';
import { useSettings } from '../../context';
import {
  Box,
  Button,
  Flex,
  Form,
  FormInstance,
  Modal,
  SettingOutlined,
  SwapOutlined,
  Typography,
} from '../../ergodex-cdk';
import { useObservable, useObservableAction } from '../../hooks/useObservable';
import { assets$, getAssetsByPairAsset } from '../../services/new/assets';
import { Balance, useWalletBalance } from '../../services/new/balance';
import { getPoolByPair, pools$ } from '../../services/new/pools';
import { fractionsToNum, parseUserInputToFractions } from '../../utils/math';
import { calculateTotalFee } from '../../utils/transactions';
import {
  openSwapConfirmationModal,
  SwapConfirmationModal,
} from './SwapConfirmationModal';
import { TransactionSettings } from './TransactionSettings';

interface SwapFormModel {
  readonly from?: TokenControlValue;
  readonly to?: TokenControlValue;
  readonly pool?: AmmPool;
}

class SwapStrategy implements ActionFormStrategy {
  constructor(private balance: Balance, private minerFee: number) {}

  actionButtonCaption(): React.ReactNode {
    return 'Swap';
  }

  getInsufficientTokenForFee(
    form: FormInstance<SwapFormModel>,
  ): string | undefined {
    const { from } = form.getFieldsValue();
    let totalFees = +calculateTotalFee(
      [this.minerFee, UI_FEE, defaultExFee],
      ERG_DECIMALS,
    );
    totalFees =
      from?.asset?.id === ERG_TOKEN_ID
        ? totalFees + from.amount?.value!
        : totalFees;

    return +totalFees > this.balance.get(ERG_TOKEN_ID)
      ? ERG_TOKEN_NAME
      : undefined;
  }

  getInsufficientTokenForTx(
    form: FormInstance<SwapFormModel>,
  ): Observable<string | undefined> | string | undefined {
    const { from } = form.getFieldsValue();
    const asset = from?.asset;
    const amount = from?.amount?.value;

    if (asset && amount && amount > this.balance.get(asset)) {
      return asset.name;
    }

    return undefined;
  }

  isAmountNotEntered(form: FormInstance<SwapFormModel>): boolean {
    const value = form.getFieldsValue();

    return !value.from?.amount?.value || !value.to?.amount?.value;
  }

  isTokensNotSelected(form: FormInstance<SwapFormModel>): boolean {
    const value = form.getFieldsValue();

    return !value.to?.asset || !value.from?.asset;
  }

  request(form: FormInstance): void {
    openSwapConfirmationModal(form.getFieldsValue());
  }

  isLiquidityInsufficient(form: FormInstance<SwapFormModel>): boolean {
    const { to, pool } = form.getFieldsValue();

    if (!to?.amount?.value || !pool) {
      return false;
    }

    return (
      to.amount.value > fractionsToNum(pool?.y.amount, pool?.y.asset.decimals)
    );
  }
}

const getAssetsByToken = (pairAssetId?: string) =>
  pairAssetId ? getAssetsByPairAsset(pairAssetId) : pools$;

const initialValues: SwapFormModel = {
  from: {
    asset: {
      name: 'ERG',
      id: '0000000000000000000000000000000000000000000000000000000000000000',
      decimals: ERG_DECIMALS,
    },
  },
};

const fromToTo = (fromValue: TokenControlValue, pool: AmmPool): number => {
  const toAmount = pool.outputAmount(
    new AssetAmount(
      fromValue.asset!,
      parseUserInputToFractions(
        fromValue.amount?.value!,
        fromValue.asset?.decimals,
      ),
    ),
  );
  console.log(toAmount, fromValue);

  return fractionsToNum(toAmount.amount, toAmount.asset?.decimals);
};

const toToFrom = (
  toValue: TokenControlValue,
  pool: AmmPool,
): number | undefined => {
  const fromAmount = pool.inputAmount(
    new AssetAmount(
      toValue.asset!,
      parseUserInputToFractions(
        toValue.amount?.value!,
        toValue.asset?.decimals,
      ),
    ),
  );

  return fromAmount
    ? fractionsToNum(fromAmount.amount, fromAmount.asset?.decimals)
    : undefined;
};

const isFromFieldAssetChanged = (
  value: SwapFormModel,
  prevValue: SwapFormModel,
): boolean => value?.from?.asset?.id !== prevValue?.from?.asset?.id;

const isToAssetChanged = (
  value: SwapFormModel,
  prevValue: SwapFormModel,
): boolean =>
  !!value?.from?.asset &&
  !!value?.to?.asset &&
  value?.to?.asset?.id !== prevValue?.to?.asset?.id;

const getAvailablePools = (xId?: string, yId?: string): Observable<AmmPool[]> =>
  xId && yId ? getPoolByPair(xId, yId) : of([]);

const isFromAmountChangedWithEmptyPool = (
  value: SwapFormModel,
  prevValue: SwapFormModel,
): boolean => !value?.pool && value?.from?.amount !== prevValue?.from?.amount;

const isToAmountChangedWithEmptyPool = (
  value: SwapFormModel,
  prevValue: SwapFormModel,
): boolean => !value?.pool && value?.to?.amount !== prevValue?.to?.amount;

const isFromAmountChangedWithActivePool = (
  value: SwapFormModel,
  prevValue: SwapFormModel,
): boolean => !!value?.pool && value?.from?.amount !== prevValue?.from?.amount;

const isToAmountChangedWithActivePool = (
  value: SwapFormModel,
  prevValue: SwapFormModel,
): boolean => !!value?.pool && value?.to?.amount !== prevValue?.to?.amount;

const sortPoolByLpDesc = (poolA: AmmPool, poolB: AmmPool) =>
  fractionsToNum(poolB.lp.amount) - fractionsToNum(poolA.lp.amount);

export const Swap: FC = () => {
  const [form] = Form.useForm<SwapFormModel>();
  const [fromAssets] = useObservable(assets$);
  const [toAssets, updateToAssets] = useObservableAction(getAssetsByToken);
  const [pools, updatePoolsByPair] = useObservableAction(getAvailablePools);
  const [balance] = useWalletBalance();
  const [{ minerFee }] = useSettings();
  const swapStrategy = new SwapStrategy(balance, minerFee);

  useEffect(() => {
    updateToAssets(initialValues.from?.asset?.id);
  }, [updateToAssets]);

  useEffect(() => {
    const { pool, to, from } = form.getFieldsValue();

    if (!pool) {
      const newPool = pools?.slice().sort(sortPoolByLpDesc)[0];
      const fromAmount =
        !from?.amount && to?.amount && newPool
          ? {
              value: toToFrom(to, newPool),
              viewValue: toToFrom(to, newPool)?.toString(),
            }
          : from?.amount;
      const toAmount =
        !to?.amount && from?.amount && newPool
          ? {
              value: fromToTo(from, newPool),
              viewValue: fromToTo(from, newPool).toString(),
            }
          : to?.amount;

      form.setFieldsValue({
        pool: newPool,
        from: { ...from, amount: fromAmount },
        to: { ...to, amount: toAmount },
      });
    }
  }, [pools, form]);

  const onValuesChange = (
    changes: SwapFormModel,
    value: SwapFormModel,
    prevValue: SwapFormModel,
  ) => {
    if (isFromFieldAssetChanged(value, prevValue)) {
      updateToAssets(value?.from?.asset?.id);
      form.setFieldsValue({ to: undefined, pool: undefined });
      updatePoolsByPair();
    }
    if (isToAssetChanged(value, prevValue)) {
      updatePoolsByPair(value?.from?.asset?.id!, value?.to?.asset?.id!);
    }
    if (isFromAmountChangedWithEmptyPool(value, prevValue)) {
      form.setFieldsValue({ to: undefined });
    }
    if (isToAmountChangedWithEmptyPool(value, prevValue)) {
      form.setFieldsValue({ from: { ...value.from, amount: undefined } });
    }
    if (isFromAmountChangedWithActivePool(value, prevValue)) {
      const toAmount = fromToTo(value.from!, value.pool!);
      form.setFieldsValue({
        to: {
          ...value.to,
          amount: { value: toAmount, viewValue: toAmount.toString() },
        },
      });
    }
    if (isToAmountChangedWithActivePool(value, prevValue)) {
      const fromAmount = toToFrom(value.to!, value.pool!);
      form.setFieldsValue({
        from: {
          ...value.from,
          amount: { value: fromAmount, viewValue: fromAmount?.toString() },
        },
      });
    }
  };

  const swapTokens = () => {
    const { to, from } = form.getFieldsValue();

    // TODO: REPLACE_WITH_SET_FIELDS_VALUES
    form.setFields([
      { name: 'from', value: to },
      { name: 'to', value: from },
    ]);
    // openSwapConfirmationModal(form.getFieldsValue());
  };

  const priceTooltip = (
    <>
      <Box className="price-content">
        <Typography.Text className="price-content__left">
          Minimum received
        </Typography.Text>
        <Typography.Text className="price-content__right">
          0.044WETH
        </Typography.Text>
      </Box>
      <Box className="price-content">
        <Typography.Text className="price-content__left">
          Price impact
        </Typography.Text>
        <Typography.Text className="price-content__right">0.5%</Typography.Text>
      </Box>
      <Box className="price-content">
        <Typography.Text className="price-content__left">
          Slippage tollerance
        </Typography.Text>
        <Typography.Text className="price-content__right">0.5%</Typography.Text>
      </Box>
      <Box className="price-content">
        <Typography.Text className="price-content__left">
          Total fees
        </Typography.Text>
        <Typography.Text className="price-content__right">
          0.000055ERG(~$3.065)
        </Typography.Text>
      </Box>
    </>
  );

  return (
    <FormPageWrapper width={480}>
      <ActionForm
        form={form}
        strategy={swapStrategy}
        onValuesChange={onValuesChange}
        initialValues={initialValues}
      >
        <Flex flexDirection="col">
          <Flex flexDirection="row" alignItems="center">
            <Flex.Item flex={1}>
              <Typography.Title level={4}>Swap</Typography.Title>
            </Flex.Item>
            <TransactionSettings />
            <TxHistory />
          </Flex>
          <Flex.Item marginBottom={6}>
            <Typography.Footnote>Ergo network</Typography.Footnote>
          </Flex.Item>
          <Flex.Item marginBottom={1}>
            <TokenControlFormItem
              assets={fromAssets}
              name="from"
              label="From"
              maxButton
            />
          </Flex.Item>
          <Flex.Item className="swap-button">
            <Button onClick={swapTokens} icon={<SwapOutlined />} size="large" />
          </Flex.Item>
          <Flex.Item marginBottom={4}>
            <TokenControlFormItem assets={toAssets} name="to" label="To" />
          </Flex.Item>
          <Flex.Item
            marginBottom={4}
            display={!!pools?.length ? 'block' : 'none'}
          >
            <Flex>
              <Flex.Item flex={1} />
              <Flex>
                <Form.Item name="pool" />
              </Flex>
            </Flex>
          </Flex.Item>
        </Flex>
      </ActionForm>
    </FormPageWrapper>
  );
};
