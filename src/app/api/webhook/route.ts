import {
  setUserNotificationDetails,
  deleteUserNotificationDetails,
} from '@/utils/kv';
import { sendFrameNotification } from '@/utils/notifications';
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from '@farcaster/frame-node';
import { NextRequest } from 'next/server';

console.log('Hello from webhook route');
export async function POST(request: NextRequest) {
  const requestJson = await request.json();

  console.log('Received webhook event:', requestJson, verifyAppKeyWithNeynar);

  let data;
  try {
    data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

    switch (error.name) {
      case 'VerifyJsonFarcasterSignature.InvalidDataError':
      case 'VerifyJsonFarcasterSignature.InvalidEventDataError':
        // The request data is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      case 'VerifyJsonFarcasterSignature.InvalidAppKeyError':
        // The app key is invalid
        return Response.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      case 'VerifyJsonFarcasterSignature.VerifyAppKeyError':
        // Internal error verifying the app key (caller may want to try again)
        console.log('Error verifying app key:', error.message);
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
    }
  }

  const fid = data.fid;
  const event = data.event;

  switch (event.event) {
    case 'frame_added':
      if (event.notificationDetails) {
        await setUserNotificationDetails(fid, event.notificationDetails);
        await sendFrameNotification({
          fid,
          title: 'Welcome to Footy',
          body: 'You will now receive notifications from the Footy app',
        });
      } else {
        await deleteUserNotificationDetails(fid);
      }

      break;
    case 'frame_removed':
      await deleteUserNotificationDetails(fid);

      break;
    case 'notifications_enabled':
      await setUserNotificationDetails(fid, event.notificationDetails);
      await sendFrameNotification({
        fid,
        title: 'Ding ding ding',
        body: 'Notifications are now enabled',
      });

      break;
    case 'notifications_disabled':
      await deleteUserNotificationDetails(fid);

      break;
  }

  return Response.json({ success: true });
}
export const runtime = 'edge';
