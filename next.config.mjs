/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['react-syntax-highlighter', 'mermaid', 'three', 'postprocessing'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
