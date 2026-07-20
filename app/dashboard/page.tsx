export default function Page() {
  return (
    <>
      <h1>Tableau de bord</h1>
      <div className="grid">
        <div className="card">
          <h2>Disponibilités</h2>
          <p className="muted">Déclarez vos demi-journées disponibles ou indisponibles.</p>
          <a className="btn" href="/availability">Ouvrir</a>
        </div>
        <div className="card">
          <h2>Examens</h2>
          <p className="muted">Créez et consultez les sessions d’examen.</p>
          <a className="btn" href="/exams">Ouvrir</a>
        </div>
        <div className="card">
          <h2>Convocations</h2>
          <p className="muted">Suivez les convocations et les invitations calendrier.</p>
          <a className="btn" href="/convocations">Ouvrir</a>
        </div>
      </div>
    </>
  );
}
