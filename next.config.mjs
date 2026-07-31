/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'octanlink.com',
      },
    ],
  },
};

export default nextConfig;
