// Copyright 2023 @paritytech/polkadot-staking-dashboard authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type BigNumber from 'bignumber.js';
import type { AnyApi, MaybeAccount } from 'types';

export interface AccountBalance {
  nonce?: number;
  address?: string;
  balance?: Balance;
  bonded?: string;
  locks?: Array<Lock>;
}

export interface Balance {
  free: BigNumber;
  reserved: BigNumber;
  miscFrozen: BigNumber;
  feeFrozen: BigNumber;
  freeAfterReserve: BigNumber;
}
export interface AccountBalancesContextInterface {
  getLedgerForStash: (address: MaybeAccount) => Ledger;
  getLedgerForController: (address: MaybeAccount) => Ledger | null;
  ledgers: AnyApi;
}

export interface UnlockChunkRaw {
  era: string;
  value: string;
}
export interface UnlockChunk {
  era: number;
  value: BigNumber;
}

export interface Ledger {
  address: MaybeAccount;
  stash: string | null;
  active: BigNumber;
  total: BigNumber;
  unlocking: Array<UnlockChunk>;
}
