/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "springgreen-antelope-607895.hostingersite.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // If Hostinger image hosting ever changes domains, add the new
      // hostname here as well — do not remove the one above unless the
      // old domain is fully retired. Any host NOT listed here still
      // renders (via components/SafeImage.tsx's plain-<img> fallback) —
      // add it here too when you want next/image to optimize it. Keep
      // lib/images.ts's OPTIMIZABLE_HOSTS in sync with this list.
    ],
  },
};

export default nextConfig;
