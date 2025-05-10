import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  // Get the address from query parameters
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    // Make the request to Neynar API using the server-side API key
    const response = await axios.get(
      'https://api.neynar.com/v2/farcaster/user/bulk-by-address',
      {
        headers: {
          'x-api-key': process.env.NEYNAR_API_KEY,
          'Content-Type': 'application/json',
        },
        params: {
          addresses: address,
        },
      }
    );

    // Extract the user data for the address
    const userDataArray = response.data[address.toLowerCase()];
    if (userDataArray && userDataArray.length > 0) {
      return NextResponse.json(
        { username: userDataArray[0].username },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching Farcaster user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
