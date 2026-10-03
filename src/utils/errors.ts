import { toast } from 'react-toastify';
import { TRPCClientError } from '@trpc/client';
import {
  BaseError,
  ChainMismatchError,
  ContractFunctionRevertedError,
  InsufficientFundsError,
  SwitchChainError,
  UserRejectedRequestError,
} from 'viem';

const MAX_LENGTH = 160;
const DEFAULT_MESSAGE = 'something went wrong, please try again';

function truncate(message: string) {
  const firstLine = message.trim().split('\n')[0];
  return firstLine.length > MAX_LENGTH
    ? `${firstLine.slice(0, MAX_LENGTH - 1)}…`
    : firstLine;
}

/**
 * Viem wraps the real cause in several layers (ContractFunctionExecutionError
 * → TransactionExecutionError → UserRejectedRequestError …). `walk` finds the
 * innermost error that matches, so we can map the actual cause to plain copy.
 */
const USER_REJECTED_PATTERN = /reject|cancel|denied|declin|disapprov/i;

function isUserRejection(error: BaseError) {
  if (error.walk((e) => e instanceof UserRejectedRequestError)) return true;
  // Some wallets answer a cancelled prompt with a generic RPC code (-32000 /
  // -32602) instead of 4001, so viem labels it "Missing or invalid
  // parameters". The wallet's own text in `details` still says it was
  // cancelled, so trust that over the code.
  return Boolean(
    error.walk(
      (e) =>
        e instanceof BaseError &&
        typeof e.details === 'string' &&
        USER_REJECTED_PATTERN.test(e.details)
    )
  );
}

function getViemMessage(error: BaseError) {
  if (isUserRejection(error)) {
    return 'transaction was rejected in your wallet';
  }

  if (error.walk((e) => e instanceof InsufficientFundsError)) {
    return 'your wallet does not have enough funds to cover this transaction and gas';
  }

  if (
    error.walk(
      (e) => e instanceof ChainMismatchError || e instanceof SwitchChainError
    )
  ) {
    return 'please switch your wallet to the correct network and try again';
  }

  const reverted = error.walk(
    (e) => e instanceof ContractFunctionRevertedError
  ) as ContractFunctionRevertedError | null;
  if (reverted) {
    const reason = reverted.data?.errorName ?? reverted.reason;
    return reason
      ? `the contract rejected this transaction (${reason})`
      : 'the contract rejected this transaction';
  }

  // shortMessage is the one-line summary; message is the multi-paragraph
  // dump with calldata, request args and a docs link.
  return error.shortMessage || DEFAULT_MESSAGE;
}

/**
 * tRPC surfaces zod input errors as a JSON array of issues in `message`.
 */
function getTrpcMessage(error: TRPCClientError<never>) {
  try {
    const parsed: unknown = JSON.parse(error.message);
    if (Array.isArray(parsed)) {
      const issues = parsed
        .map((issue: { message?: unknown }) =>
          typeof issue?.message === 'string' ? issue.message : null
        )
        .filter((m): m is string => Boolean(m));
      if (issues.length > 0) return issues.join(', ');
    }
  } catch {
    // not JSON, fall through
  }
  return error.message || DEFAULT_MESSAGE;
}

/**
 * Turn any thrown value into a short, human-readable sentence suitable for a
 * toast. Never returns calldata, stack traces or multi-line dumps.
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_MESSAGE
): string {
  if (error instanceof BaseError) return truncate(getViemMessage(error));
  if (error instanceof TRPCClientError) return truncate(getTrpcMessage(error));
  if (error instanceof Error) return truncate(error.message || fallback);
  if (typeof error === 'string' && error.trim()) return truncate(error);
  return fallback;
}

/**
 * Show an error toast as `${prefix}: ${readable message}` and log the full
 * error to the console so the detail is still available while debugging.
 */
export function toastError(prefix: string, error: unknown) {
  console.error(prefix, error);
  toast.error(`${prefix}: ${getErrorMessage(error)}`);
}
