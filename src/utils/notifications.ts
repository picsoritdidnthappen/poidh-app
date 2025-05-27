import { getUserNotificationDetails } from '@/utils/kv';
import {
  SendNotificationRequest,
  sendNotificationResponseSchema,
} from '@farcaster/frame-sdk';

const appUrl = process.env.NEXT_PUBLIC_URL || '';

type SendFrameNotificationResult =
  | {
      state: 'error';
      error: unknown;
    }
  | { state: 'no_token' }
  | { state: 'rate_limit' }
  | { state: 'success' }
  | { state: 'skipped' };

export async function sendFrameNotification({
  fid,
  title,
  body,
  targetURL,
}: {
  fid: number;
  title: string;
  body: string;
  targetURL?: string;
}): Promise<SendFrameNotificationResult> {
  // Fetch user notification details
  const notificationDetails = await getUserNotificationDetails(fid);
  if (!notificationDetails) {
    return { state: 'no_token' };
  }

  // Check environment and restrict notifications during testing
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'; // Default to production
  const isTesting = environment === 'testing' || environment === 'development';

  // Allow only localhost notifications during testing
  if (isTesting && !notificationDetails.url.startsWith('http://localhost')) {
    console.log(
      `Skipping notification for production URL in ${environment} mode: ${notificationDetails.url}`
    );
    return { state: 'skipped' };
  }

  // Proceed with sending the notification
  const response = await fetch(notificationDetails.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: targetURL || appUrl,
      tokens: [notificationDetails.token],
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();

  if (response.status === 200) {
    const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
    if (responseBody.success === false) {
      // Malformed response
      return { state: 'error', error: responseBody.error.errors };
    }

    if (responseBody.data.result.rateLimitedTokens.length) {
      // Rate limited
      return { state: 'rate_limit' };
    }

    return { state: 'success' };
  } else {
    // Error response
    return { state: 'error', error: responseJson };
  }
}
