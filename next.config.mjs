/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.digitlink.mobi',
      },
      {
        protocol: 'https',
        hostname: 'digitlink.mobi',
      },
    ],
  },
};

export default nextConfig;
