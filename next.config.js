/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', '@sparticuz/chromium'],
  },
  webpack: (config, { isServer }) => {
    // Handle puppeteer / chromium packages
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'puppeteer': 'commonjs puppeteer',
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
      });
    }
    return config;
  },
};

module.exports = nextConfig;