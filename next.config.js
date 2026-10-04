/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: { domains: ["weather.bangkok.go.th"] },
};
module.exports = nextConfig;
