import { NextRequest } from 'next/server';
import prisma from 'prisma/prisma';
import {
  ParseWebhookEvent,
  parseWebhookEvent,
  verifyAppKeyWithNeynar,
} from '@farcaster/miniapp-node';

export async function POST(request: NextRequest) {
  const requestJson = await request.json();

  let data;
  try {
    data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

    switch (error.name) {
      case 'VerifyJsonFarcasterSignature.InvalidDataError':
      case 'VerifyJsonFarcasterSignature.InvalidEventDataError':
        return Response.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      case 'VerifyJsonFarcasterSignature.InvalidAppKeyError':
        return Response.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      case 'VerifyJsonFarcasterSignature.VerifyAppKeyError':
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
    }
  }

  const fid = Number(data.fid ?? 0);
  const event = data.event;

  switch (event.event) {
    case 'miniapp_added':
    case 'notifications_enabled': {
      const details = event.notificationDetails;
      const { token, url } = details || {};

      if (!fid || !token || !url) {
        return new Response('missing fields', { status: 400 });
      }

      try {
        await prisma.notificationTokens.upsert({
          where: { token },
          update: { fid, url },
          create: { fid, token, url },
        });
      } catch (e) {
        console.error('prisma upsert error', e);
      }

      return new Response('ok', { status: 200 });
    }
    case 'notifications_disabled':
    case 'miniapp_removed':
      try {
        if (fid) {
          await prisma.notificationTokens.deleteMany({ where: { fid } });
        }
      } catch (e) {
        console.error('prisma delete error', e);
      }
  }
  return Response.json({ success: true });
}
