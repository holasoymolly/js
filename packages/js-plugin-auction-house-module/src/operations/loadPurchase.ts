import type { Commitment } from '@solana/web3.js';
import { Purchase, LazyPurchase } from '../models/Purchase';
import { assertNftOrSftWithToken } from '@metaplex-foundation/js-plugin-nft-module';
import type { Metaplex } from '@metaplex-foundation/js';

import {
  useOperation,
  Operation,
  OperationHandler,
  amount,
} from '@metaplex-foundation/js';
import { DisposableScope } from '@metaplex-foundation/js';

// -----------------
// Operation
// -----------------

const Key = 'LoadPurchaseOperation' as const;

/**
 * @group Operations
 * @category Constructors
 */
export const loadPurchaseOperation = useOperation<LoadPurchaseOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type LoadPurchaseOperation = Operation<
  typeof Key,
  LoadPurchaseInput,
  Purchase
>;

/**
 * @group Operations
 * @category Inputs
 */
export type LoadPurchaseInput = {
  lazyPurchase: LazyPurchase;
  loadJsonMetadata?: boolean; // Default: true

  /** The level of commitment desired when querying the blockchain. */
  commitment?: Commitment;
};

/**
 * @group Operations
 * @category Handlers
 */
export const loadPurchaseOperationHandler: OperationHandler<LoadPurchaseOperation> =
  {
    handle: async (
      operation: LoadPurchaseOperation,
      metaplex: Metaplex,
      scope: DisposableScope
    ) => {
      const {
        lazyPurchase,
        loadJsonMetadata = true,
        commitment,
      } = operation.input;

      const asset = await metaplex
        .nfts()
        .findByMetadata({
          metadata: lazyPurchase.metadataAddress,
          tokenOwner: lazyPurchase.buyerAddress,
          commitment,
          loadJsonMetadata,
        })
        .run(scope);
      assertNftOrSftWithToken(asset);

      return {
        ...lazyPurchase,
        lazy: false,
        isPublic: false,
        asset,
        tokens: amount(lazyPurchase.tokens, asset.mint.currency),
      };
    },
  };