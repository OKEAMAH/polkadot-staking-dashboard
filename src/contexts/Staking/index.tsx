// Copyright 2022 @paritytech/polkadot-staking-dashboard authors & contributors
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useRef } from 'react';
import BN from 'bn.js';
// eslint-disable-next-line import/no-webpack-loader-syntax, import/no-unresolved
import Worker from 'worker-loader!../../workers/stakers';
import { useApi } from '../Api';
import { useNetworkMetrics } from '../Network';
import { useBalances } from '../Balances';
import { useConnect } from '../Connect';
import { rmCommas, localStorageOrDefault } from '../../Utils';
import * as defaults from './defaults';

const worker = new Worker();

export interface StakingContextState {
  getNominationsStatus: () => any;
  setTargets: (t: any) => any;
  hasController: () => any;
  getControllerNotImported: (a: string) => any;
  isBonding: () => any;
  isNominating: () => any;
  inSetup: () => any;
  staking: any;
  eraStakers: any;
  targets: any;
}

export const StakingContext: React.Context<StakingContextState> =
  React.createContext({
    getNominationsStatus: () => true,
    setTargets: (t: any) => false,
    hasController: () => false,
    getControllerNotImported: (a: string) => false,
    isBonding: () => false,
    isNominating: () => false,
    inSetup: () => false,
    staking: {},
    eraStakers: {},
    targets: [],
  });

export const useStaking = () => React.useContext(StakingContext);

export const StakingProvider = ({ children }: any) => {
  const {
    activeAccount,
    activeExtension,
    accounts: connectAccounts,
  } = useConnect();
  const { isReady, api, consts, status, network }: any = useApi();
  const { metrics }: any = useNetworkMetrics();
  const {
    accounts,
    getBondedAccount,
    getAccountLedger,
    getAccountNominations,
  }: any = useBalances();
  const { maxNominatorRewardedPerValidator } = consts;

  // store staking metrics in state
  const [stakingMetrics, setStakingMetrics]: any = useState(
    defaults.stakingMetrics
  );

  // store stakers metadata in state
  const [eraStakers, _setEraStakers]: any = useState(defaults.eraStakers);

  // store account target validators
  const [targets, _setTargets]: any = useState(
    localStorageOrDefault(`${activeAccount}_targets`, defaults.targets, true)
  );

  const eraStakersRef = useRef(eraStakers);
  const setEraStakers = (val: any) => {
    eraStakersRef.current = val;
    _setEraStakers(val);
  };

  const subscribeToStakingkMetrics = async (_api: any) => {
    if (isReady && metrics.activeEra.index !== 0) {
      const previousEra = metrics.activeEra.index - 1;

      // subscribe to staking metrics
      const unsub = await _api.queryMulti(
        [
          _api.query.staking.counterForNominators,
          _api.query.staking.counterForValidators,
          _api.query.staking.maxNominatorsCount,
          _api.query.staking.maxValidatorsCount,
          _api.query.staking.validatorCount,
          [_api.query.staking.erasValidatorReward, previousEra],
          [_api.query.staking.erasTotalStake, previousEra],
          _api.query.staking.minNominatorBond,
          _api.query.staking.historyDepth,
          [_api.query.staking.payee, activeAccount],
        ],
        ([
          _totalNominators,
          _totalValidators,
          _maxNominatorsCount,
          _maxValidatorsCount,
          _validatorCount,
          _lastReward,
          _lastTotalStake,
          _minNominatorBond,
          _historyDepth,
          _payee,
        ]: any) => {
          setStakingMetrics({
            ...stakingMetrics,
            payee: _payee.toHuman(),
            historyDepth: _historyDepth.toBn(),
            lastTotalStake: _lastTotalStake.toBn(),
            validatorCount: _validatorCount.toBn(),
            totalNominators: _totalNominators.toBn(),
            totalValidators: _totalValidators.toBn(),
            minNominatorBond: _minNominatorBond.toBn(),
            lastReward: _lastReward.unwrapOrDefault(new BN(0)),
            maxValidatorsCount: new BN(_maxValidatorsCount.toString()),
            maxNominatorsCount: new BN(_maxNominatorsCount.toString()),
          });
        }
      );

      setStakingMetrics({
        ...stakingMetrics,
        unsub,
      });
    }
  };

  /*
   * Fetches the active nominator set.
   * The top 256 nominators get rewarded. Nominators may have their bond  spread
   * among multiple nominees.
   * the minimum nominator bond is calculated by summing a particular bond of a nominator.
   */
  const fetchEraStakers = async () => {
    if (!isReady || metrics.activeEra.index === 0) {
      return;
    }

    const _exposures = await api.query.staking.erasStakers.entries(
      metrics.activeEra.index
    );

    // humanise exposures to send to worker
    const exposures = _exposures.map(([_keys, _val]: any) => ({
      keys: _keys.toHuman(),
      val: _val.toHuman(),
    }));

    // worker to calculate stats
    worker.postMessage({
      units: network.units,
      exposures,
      maxNominatorRewardedPerValidator,
    });
  };

  /*
   * Get the status of nominations.
   * Possible statuses: waiting, inactive, active.
   */
  const getNominationsStatus = () => {
    if (inSetup()) {
      return defaults.nominationStatus;
    }
    const nominations = getAccountNominations(activeAccount);
    const statuses: any = {};

    for (const nomination of nominations) {
      const s = eraStakersRef.current.stakers.find(
        (_n: any) => _n.address === nomination
      );

      if (s === undefined) {
        statuses[nomination] = 'waiting';
        continue;
      }
      const exists = (s.others ?? []).find(
        (_o: any) => _o.who === activeAccount
      );
      if (exists === undefined) {
        statuses[nomination] = 'inactive';
        continue;
      }
      statuses[nomination] = 'active';
    }

    return statuses;
  };

  useEffect(() => {
    if (status === 'connecting') {
      setEraStakers(defaults.eraStakers);
      setStakingMetrics(defaults.stakingMetrics);
    }
  }, [status]);

  useEffect(() => {
    if (isReady) {
      fetchEraStakers();
      subscribeToStakingkMetrics(api);
    }
    return () => {
      // unsubscribe from staking metrics
      if (stakingMetrics.unsub !== null) {
        stakingMetrics.unsub();
      }
    };
  }, [isReady, metrics.activeEra]);

  useEffect(() => {
    worker.onmessage = (message: any) => {
      if (message) {
        const { data } = message;

        const { stakers, activeNominators, activeValidators, minActiveBond } =
          data;

        setEraStakers({
          ...eraStakersRef.current,
          stakers,
          activeNominators,
          activeValidators,
          minActiveBond,
        });
      }
    };
  }, []);

  useEffect(() => {
    // calculates minimum bond of the user's chosen nominated validators.
    let _stakingMinActiveBond = new BN(0);

    const stakers = eraStakersRef.current?.stakers ?? null;
    const nominations = getAccountNominations(activeAccount);

    if (nominations.length && stakers !== null) {
      for (const n of nominations) {
        const staker = stakers.find((item: any) => item.address === n);

        if (staker !== undefined) {
          let { others } = staker;

          // order others by bonded value, largest first.
          others = others.sort((a: any, b: any) => {
            const x = new BN(rmCommas(a.value));
            const y = new BN(rmCommas(b.value));
            return y.sub(x);
          });

          if (others.length) {
            const _minActive = new BN(rmCommas(others[0].value.toString()));
            // set new minimum active bond if less than current value
            if (
              _minActive.lt(_stakingMinActiveBond) ||
              _stakingMinActiveBond !== new BN(0)
            ) {
              _stakingMinActiveBond = _minActive;
            }
          }
        }
      }
    }

    // convert _stakingMinActiveBond to base value
    const stakingMinActiveBond = _stakingMinActiveBond
      .div(new BN(10 ** network.units))
      .toNumber();

    setEraStakers({
      ...eraStakersRef.current,
      minStakingActiveBond: stakingMinActiveBond,
    });

    // set account's targets
    _setTargets(
      localStorageOrDefault(`${activeAccount}_targets`, defaults.targets, true)
    );
  }, [isReady, accounts, activeAccount, eraStakersRef.current?.stakers]);

  /* Sets an account's stored target validators */
  const setTargets = (_targets: any) => {
    localStorage.setItem(`${activeAccount}_targets`, JSON.stringify(_targets));
    _setTargets(_targets);
    return [];
  };

  /*
   * Helper function to determine whether the active account
   * has set a controller account.
   */
  const hasController = () => {
    if (activeAccount === '' || activeExtension === null) {
      return false;
    }
    return getBondedAccount(activeAccount) !== null;
  };

  /*
   * Helper function to determine whether the controller account
   * has been imported.
   */
  const getControllerNotImported = (address: string) => {
    if (address === null || activeAccount === '' || !activeExtension) {
      return false;
    }
    // check if controller is imported
    const exists = connectAccounts.find((acc: any) => acc.address === address);
    return !exists;
  };

  /*
   * Helper function to determine whether the active account
   * is bonding, or is yet to start.
   */
  const isBonding = () => {
    if (!hasController()) {
      return false;
    }
    const ledger = getAccountLedger(getBondedAccount(activeAccount));
    return ledger.active.gt(0);
  };

  /*
   * Helper function to determine whether the active account
   * has funds unlocking.
   */
  const isUnlocking = () => {
    if (!hasController()) {
      return false;
    }
    const ledger = getAccountLedger(getBondedAccount(activeAccount));
    return ledger.unlocking.length;
  };

  /*
   * Helper function to determine whether the active account
   * is nominating, or is yet to start.
   */
  const isNominating = () => {
    const nominations = getAccountNominations(activeAccount);
    return nominations.length > 0;
  };

  /*
   * Helper function to determine whether the active account
   * is nominating, or is yet to start.
   */
  const inSetup = () => {
    return (
      activeAccount === '' ||
      activeExtension === null ||
      (!hasController() && !isBonding() && !isNominating() && !isUnlocking())
    );
  };

  return (
    <StakingContext.Provider
      value={{
        getNominationsStatus,
        setTargets,
        hasController,
        getControllerNotImported,
        isBonding,
        isNominating,
        inSetup,
        staking: stakingMetrics,
        eraStakers: eraStakersRef.current,
        targets,
      }}
    >
      {children}
    </StakingContext.Provider>
  );
};
