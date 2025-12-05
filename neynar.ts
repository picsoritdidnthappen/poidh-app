import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import serverEnv from '@/utils/serverEnv';

declare global {
  // eslint-disable-next-line no-var
  var cachedNeynar: NeynarAPIClient;
}

let neynarClient: NeynarAPIClient;

if (process.env.NODE_ENV === 'production') {
  neynarClient = createNeynarClient();
} else {
  if (!global.cachedNeynar) {
    global.cachedNeynar = createNeynarClient();
  }
  neynarClient = global.cachedNeynar;
}

function createNeynarClient() {
  const config = new Configuration({
    apiKey: serverEnv.NEYNAR_API_KEY || '',
  });

  return new NeynarAPIClient(config);
}

export default neynarClient;
