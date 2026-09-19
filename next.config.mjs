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
  experimental: {
    serverActions: {
      // Raised from the 1MB default so artists can upload artwork images
      // (up to 8MB — see lib/uploads.ts / lib/validation/auth.ts) directly
      // through a Server Action's FormData.
      bodySizeLimit: "10mb",
    },
  },
  // sharp (lib/color-analysis.ts) ships a native binary — keep it external
  // to the server bundle rather than letting webpack try to bundle it.
  serverExternalPackages: ["sharp"],
  // @react-pdf/renderer (Artist Profile PDF builder, see
  // components/artist/profile-builder/) publishes as an ESM-only package.
  // Without this, webpack refuses to bundle it at all and the build fails
  // with "ESM packages (@react-pdf/renderer) need to be imported" the
  // moment anything reaches its static <Document>/<Page>/... imports
  // (components/artist/profile-builder/ArtistProfileDocument.tsx) --
  // transpilePackages tells webpack to actually process this package's
  // source instead of trying to treat it like a plain CommonJS external
  // the way serverExternalPackages does for sharp above. The opposite
  // mechanism from that line on purpose: sharp is a native binary that
  // must NOT be bundled, this is a JS/ESM package that must be.
  transpilePackages: ["@react-pdf/renderer"],
};

export default nextConfig;
