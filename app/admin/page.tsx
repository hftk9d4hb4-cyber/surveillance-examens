import { requireSession } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await requireSession();
  if ((session.user as any).role !== "ADMIN") return <main className="container"><div className="alert">Accès administrateur requis.</div></main>;
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <main className="container"><h1>Administration</h1>
      <div className="card"><h2>Utilisateurs</h2><table><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Service</th><th>Spécialité</th><th>Actif</th></tr></thead><tbody>
        {users.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.department}</td><td>{u.speciality}</td><td>{u.isActive ? "Oui" : "Non"}</td></tr>)}
      </tbody></table></div>
    </main>
  );
}
