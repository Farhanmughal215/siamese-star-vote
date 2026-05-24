/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.ourwebprojects.pro",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
