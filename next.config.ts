import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  manifest: {
    name: "Granor",
    short_name: "Granor",
    description: "Seu companheiro financeiro pessoal.",
    background_color: "#ffffff",
    theme_color: "#18181b",
    display: "standalone",
    icons: [
      {
        src: "/icone/icone192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icone/icone512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icone/icone512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
