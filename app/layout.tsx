import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./session-provider";

export const metadata: Metadata = {
  title: "Extracta — Extracción inteligente de documentos",
  description: "Sube facturas y guías de despacho. La IA extrae los datos automáticamente.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
