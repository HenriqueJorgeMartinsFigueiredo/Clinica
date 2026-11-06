import type { MetadataRoute } from "next";

// Permite "instalar" o sistema no celular (Adicionar à tela inicial)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clínica — Gestão",
    short_name: "Clínica",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#b93a62",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
