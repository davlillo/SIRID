import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sin esto Next puede inferir un workspace root equivocado cuando existen
  // otros lockfiles por encima del proyecto.
  outputFileTracingRoot: path.join(import.meta.dirname, "."),
};

export default nextConfig;
