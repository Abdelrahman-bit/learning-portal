/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three', 'postprocessing'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-syntax-highlighter', 'mermaid'],
  },
};

export default nextConfig;
