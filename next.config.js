/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  reactStrictMode: true,
  swcMinify: true,

  // Uncoment to add domain whitelist
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  webpack(config) {
    // Grab the existing rule that handles SVG imports
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: { not: /\.(css|scss|sass)$/ },
        resourceQuery: { not: /url/ }, // exclude if *.svg?url
        loader: '@svgr/webpack',
        options: {
          dimensions: false,
          titleProp: true,
        },
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
  async redirects() {
    return [
      {
        source: '/base/account/:address',
        destination: '/account/:address',
        permanent: true,
      },
      {
        source: '/arbitrum/account/:address',
        destination: '/account/:address',
        permanent: true,
      },
      {
        source: '/degen/account/:address',
        destination: '/account/:address',
        permanent: true,
      },
      {
        source: '/degen',
        destination: '/',
        permanent: true,
      },
      {
        source: '/base',
        destination: '/',
        permanent: true,
      },
      {
        source: '/arbitrum',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
