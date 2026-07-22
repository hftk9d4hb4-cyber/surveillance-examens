import type { Metadata } from "next";
import "./globals.css";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
  title: "Surveillance des examens",
  description: "Gestion des disponibilités, affectations et convocations de surveillance d'examens."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
