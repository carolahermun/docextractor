import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocExtractor — Extracción inteligente de documentos",
  description: "Sube facturas y guías de despacho. La IA extrae los datos automáticamente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
