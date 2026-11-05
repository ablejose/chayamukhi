/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./lib/cloudinaryLoader.ts",
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    // Fewer, shared widths (default: 640…3840, 8 steps). Every distinct width is a separate
    // Cloudinary derivation that is slow the first time anyone asks for it (measured 1.1-1.9 s
    // vs ~0.4 s once cached), so fewer steps means more requests hit an already-made file.
    // 1920 is the cap: 2048/3840 only ever went to big desktop screens for full-width art.
    deviceSizes: [640, 828, 1080, 1200, 1920],
  },
};

export default nextConfig;
