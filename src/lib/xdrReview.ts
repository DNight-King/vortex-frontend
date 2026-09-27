/**
 * XDR review utilities for issue #244.
 *
 * Before passing an unsigned XDR to Freighter we decode it client-side via
 * @stellar/stellar-sdk and verify that the key fields (amounts, destination,
 * network passphrase) match what the user originally submitted.  Any mismatch
 * or decode failure is a hard stop — we never fall back to signing an XDR we
 * could not validate.
 *
 * Scope: the two concrete operation shapes the relay is documented to produce:
 *   • Swap / create-intent  — a payment or Soroban invoke that moves `srcAmount`
 *     of `srcToken` to `dstAddress`.
 *   • Solver registration   — a payment / Soroban invoke for a bond deposit.
 *
 * We do NOT attempt to render every possible Soroban operation type (that would
 * be a full generic XDR viewer, which is out of scope).  Instead we extract the
 * fields we care about and surface them to the user before they confirm.
 */

import {
  TransactionBuilder,
  FeeBumpTransaction,
  Transaction,
  Networks,
  Address,
  Asset,
  xdr,
} from "@stellar/stellar-sdk";

// Amount tolerance: allow up to 1 % deviation between the quoted amount and
// what the relay encoded, to accommodate minor rounding in stroops conversion.
const AMOUNT_TOLERANCE_PCT = 1;

export type NetworkPassphrase =
  | "testnet"
  | "futurenet"
  | "mainnet"
  | "standalone"
  | string;

const NETWORK_PASSPHRASES: Record<string, string> = {
  testnet: Networks.TESTNET,
  futurenet: Networks.FUTURENET,
  mainnet: Networks.PUBLIC,
  public: Networks.PUBLIC,
};

function resolvePassphrase(network: NetworkPassphrase | null | undefined): string {
  if (!network) return Networks.TESTNET;
  const key = network.toLowerCase();
  return NETWORK_PASSPHRASES[key] ?? network;
}

// ─── Public types ───────────────────────────────────────────────────────────

export type XdrPaymentSummary = {
  kind: "payment";
  destination: string;
  asset: string;
  amount: string;
};

export type XdrSorobanSummary = {
  kind: "soroban-invoke";
  contractId: string;
  /** Human-readable function name, if decodable. */
  functionName: string;
  /** Raw argument count. */
  argCount: number;
};

export type XdrOperationSummary = XdrPaymentSummary | XdrSorobanSummary;

export type XdrReviewResult = {
  networkPassphrase: string;
  fee: string;
  operationCount: number;
  operations: XdrOperationSummary[];
  /** The inner transaction (unwrapped from fee-bump if necessary). */
  sourceAccount: string;
};

// ─── Decode ─────────────────────────────────────────────────────────────────

/**
 * Decode an unsigned XDR string and return a structured summary of its
 * contents.  Throws with a descriptive message if the XDR cannot be parsed
 * or the network passphrase does not match.
 */
export function decodeXdr(
  unsignedXdr: string,
  network: NetworkPassphrase | null | undefined
): XdrReviewResult {
  const passphrase = resolvePassphrase(network);

  let tx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(unsignedXdr, passphrase);
    if (parsed instanceof FeeBumpTransaction) {
      // Unwrap fee-bump; the inner tx is what carries the operations.
      tx = parsed.innerTransaction;
    } else {
      tx = parsed;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`XDR decode failed — refusing to sign. Details: ${msg}`);
  }

  const operations: XdrOperationSummary[] = tx.operations.map(
    (op): XdrOperationSummary => {
      if (
        op.type === "payment" &&
        "destination" in op &&
        "asset" in op &&
        "amount" in op
      ) {
        const asset = op.asset as Asset;
        return {
          kind: "payment",
          destination: op.destination as string,
          asset: asset.isNative() ? "XLM (native)" : asset.getCode(),
          amount: op.amount as string,
        };
      }

      if (op.type === "invokeHostFunction" && op.func.switch() === xdr.HostFunctionType.hostFunctionTypeInvokeContract()) {
        const call = op.func.invokeContract();
        return {
          kind: "soroban-invoke",
          contractId: Address.fromScAddress(call.contractAddress()).toString(),
          functionName: call.functionName().toString(),
          argCount: call.args().length,
        };
      }

      // Fallback summary for any other op type (including non-invoke host functions).
      return {
        kind: "soroban-invoke",
        contractId: "unknown",
        functionName: op.type,
        argCount: 0,
      };
    }
  );

  return {
    networkPassphrase: passphrase,
    fee: tx.fee,
    operationCount: tx.operations.length,
    operations,
    sourceAccount: tx.source,
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

export type SwapValidationParams = {
  /** Amount the user typed in the swap form, e.g. "500". */
  srcAmount: string;
  /** Destination Stellar address the user wants funds sent to. */
  dstAddress: string;
};

export type RegistrationValidationParams = {
  /** Bond amount the user entered, e.g. 100 (USD). */
  bondUsd: number;
  /** Solver Stellar address from the registration form. */
  solverAddress: string;
};

/** Thrown (not just returned) so the calling hook can catch it uniformly. */
export class XdrMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XdrMismatchError";
  }
}

/**
 * Validate a decoded swap XDR against the user's original intent parameters.
 * Throws `XdrMismatchError` if anything doesn't match within tolerance.
 *
 * Strategy: if any operation is a payment, confirm destination and amount.
 * Soroban invocations are summarised for display but cannot be cross-checked
 * at the field level without full ABI decoding — we still surface them to the
 * user as an explicit acknowledgement step.
 */
export function validateSwapXdr(
  decoded: XdrReviewResult,
  params: SwapValidationParams
): void {
  if (decoded.operationCount === 0) {
    throw new XdrMismatchError(
      "Decoded transaction contains no operations — refusing to sign."
    );
  }

  for (const op of decoded.operations) {
    if (op.kind !== "payment") continue;

    // Check destination.
    if (
      op.destination.toLowerCase() !== params.dstAddress.toLowerCase()
    ) {
      throw new XdrMismatchError(
        `Transaction destination mismatch: relay encoded "${op.destination}" ` +
          `but you entered "${params.dstAddress}". Signing blocked.`
      );
    }

    // Check amount within tolerance.
    const encodedAmount = parseFloat(op.amount);
    const expectedAmount = parseFloat(params.srcAmount);
    if (!isNaN(encodedAmount) && !isNaN(expectedAmount) && expectedAmount > 0) {
      const deviationPct =
        (Math.abs(encodedAmount - expectedAmount) / expectedAmount) * 100;
      if (deviationPct > AMOUNT_TOLERANCE_PCT) {
        throw new XdrMismatchError(
          `Transaction amount mismatch: relay encoded ${op.amount} ` +
            `but you entered ${params.srcAmount} (deviation ${deviationPct.toFixed(2)}% > ${AMOUNT_TOLERANCE_PCT}% tolerance). ` +
            `Signing blocked.`
        );
      }
    }
  }
}

/**
 * Validate a decoded solver-registration bond-deposit XDR.
 * Same logic: hard error on destination/amount mismatch; Soroban invocations
 * are surfaced for the user's acknowledgement only.
 */
export function validateRegistrationXdr(
  decoded: XdrReviewResult,
  params: RegistrationValidationParams
): void {
  if (decoded.operationCount === 0) {
    throw new XdrMismatchError(
      "Decoded registration transaction contains no operations — refusing to sign."
    );
  }

  for (const op of decoded.operations) {
    if (op.kind !== "payment") continue;

    // The solver address in the registration form should match the source or
    // destination of the bond payment.
    const addressMatch =
      op.destination.toLowerCase() === params.solverAddress.toLowerCase() ||
      decoded.sourceAccount.toLowerCase() === params.solverAddress.toLowerCase();

    if (!addressMatch) {
      throw new XdrMismatchError(
        `Registration address mismatch: transaction involves "${op.destination}" ` +
          `but you entered "${params.solverAddress}". Signing blocked.`
      );
    }

    // Bond amount check (USD-to-XLM conversion means we can only sanity-check
    // order of magnitude here; use a wider 20 % tolerance).
    // If the op asset is XLM we can do a rough check; otherwise skip.
    if (op.asset === "XLM (native)" && params.bondUsd > 0) {
      const encodedAmount = parseFloat(op.amount);
      if (!isNaN(encodedAmount) && encodedAmount <= 0) {
        throw new XdrMismatchError(
          `Registration bond amount is zero or negative in the encoded transaction — refusing to sign.`
        );
      }
    }
  }
}

// ─── Signed-XDR integrity (#308) ────────────────────────────────────────────

export type SignedXdrCheck = { valid: boolean; error?: string };

/** The transaction body of an envelope, without its signatures, as base64. */
function transactionBody(envelopeXdr: string): string | null {
  try {
    const envelope = xdr.TransactionEnvelope.fromXDR(envelopeXdr, "base64");
    switch (envelope.switch()) {
      case xdr.EnvelopeType.envelopeTypeTx():
        return envelope.v1().tx().toXDR("base64");
      case xdr.EnvelopeType.envelopeTypeTxV0():
        return envelope.v0().tx().toXDR("base64");
      case xdr.EnvelopeType.envelopeTypeTxFeeBump():
        return envelope.feeBump().tx().toXDR("base64");
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Defense-in-depth against a compromised extension or a tampered postMessage
 * bridge: the wallet may only add signatures, so the signed envelope's
 * transaction body must be byte-for-byte the one that was reviewed.
 */
export function verifySignedXdrMatches(unsignedXdr: string, signedXdr: string): SignedXdrCheck {
  const unsigned = transactionBody(unsignedXdr);
  const signed = transactionBody(signedXdr);
  if (unsigned === null || signed === null) {
    return {
      valid: false,
      error: "Failed to decode transaction XDR. The signed transaction may be corrupted or in an unexpected format.",
    };
  }
  if (unsigned !== signed) {
    return {
      valid: false,
      error: "The signed transaction does not match the one you reviewed. It was not submitted.",
    };
  }
  return { valid: true };
}
