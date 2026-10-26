import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH=/stackglint-website when hosting on GitHub Pages (project site).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default config;
