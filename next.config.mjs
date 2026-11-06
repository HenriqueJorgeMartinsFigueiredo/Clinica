/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "15mb" } },
  // pdfkit lê arquivos de fonte do próprio pacote: não pode ser empacotado
  serverExternalPackages: ["pdfkit"],
};
export default nextConfig;
