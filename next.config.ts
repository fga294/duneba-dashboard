import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exifr loads fs/zlib via a variable dynamic import that Turbopack compiles
  // into a runtime thrower ("expression is too dynamic"), which silently kills
  // all EXIF reads. Keep it external so native require() resolves it instead.
  serverExternalPackages: ["exifr"],
};

export default nextConfig;
