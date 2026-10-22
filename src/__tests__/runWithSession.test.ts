import { TRPCClientError } from '@trpc/client';
import { SignInCancelledError, runWithSession } from '@/utils/sessionClient';

/**
 * The error the client gets when the server turns a call away with this code.
 */
function trpcError(code: string) {
  return TRPCClientError.from({
    error: { message: 'nope', code: -32001, data: { code } },
  });
}

/**
 * Options for runWithSession, with mocks that report what was called.
 */
function setup({ isSignedIn }: { isSignedIn: boolean }) {
  return {
    isSignedIn,
    requestSignIn: jest.fn(() => Promise.resolve()),
    onSessionExpired: jest.fn(),
  };
}

describe('runWithSession', () => {
  it('runs the action straight away when signed in', async () => {
    const options = setup({ isSignedIn: true });

    await expect(runWithSession(async () => 'done', options)).resolves.toBe(
      'done'
    );
    expect(options.requestSignIn).not.toHaveBeenCalled();
  });

  it('asks the user to sign in first when signed out', async () => {
    const options = setup({ isSignedIn: false });
    const action = jest.fn(async () => 'done');

    await expect(runWithSession(action, options)).resolves.toBe('done');
    expect(options.requestSignIn).toHaveBeenCalledWith({ expired: false });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does not run the action when the user closes the prompt', async () => {
    const options = setup({ isSignedIn: false });
    options.requestSignIn.mockRejectedValue(new SignInCancelledError());
    const action = jest.fn(async () => 'done');

    await expect(runWithSession(action, options)).rejects.toBeInstanceOf(
      SignInCancelledError
    );
    expect(action).not.toHaveBeenCalled();
  });

  it('signs in again and retries once when the session has expired', async () => {
    const options = setup({ isSignedIn: true });
    const action = jest
      .fn()
      .mockRejectedValueOnce(trpcError('UNAUTHORIZED'))
      .mockResolvedValueOnce('done');

    await expect(runWithSession(action, options)).resolves.toBe('done');
    expect(options.onSessionExpired).toHaveBeenCalled();
    expect(options.requestSignIn).toHaveBeenCalledWith({ expired: true });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('passes other errors through without asking to sign in', async () => {
    const options = setup({ isSignedIn: true });
    const error = trpcError('TOO_MANY_REQUESTS');

    await expect(
      runWithSession(() => Promise.reject(error), options)
    ).rejects.toBe(error);
    expect(options.requestSignIn).not.toHaveBeenCalled();
  });

  it('only retries once', async () => {
    const options = setup({ isSignedIn: true });
    const action = jest.fn().mockRejectedValue(trpcError('UNAUTHORIZED'));

    await expect(runWithSession(action, options)).rejects.toThrow('nope');
    expect(action).toHaveBeenCalledTimes(2);
  });
});
