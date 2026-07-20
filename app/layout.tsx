import "./globals.css";

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <div className="shell">
          <nav className="nav">
            <a href="/dashboard">Tableau de bord</a>
            <a href="/availability">Disponibilités</a>
            <a href="/exams">Examens</a>
            <a href="/assignments">Affectations</a>
            <a href="/convocations">Convocations</a>
            <a href="/admin">Administration</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
