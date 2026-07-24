import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
  title: "Surveillance des examens",
  description: "Gestion des disponibilités, affectations et convocations de surveillance d'examens."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#102a43"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <a className="skip-link" href="#contenu-principal">Aller au contenu principal</a>
        <AppNav />
        <div id="contenu-principal" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
