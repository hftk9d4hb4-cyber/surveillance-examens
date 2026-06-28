import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function Nav() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as any).role;
  return (
    <nav className="nav">
      <Link href="/dashboard">Tableau de bord</Link>
      <Link href="/availability">Disponibilités</Link>
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/exams">Examens</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/assignments">Affectations</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/convocations">Convocations</Link>}
      {role === "ADMIN" && <Link href="/admin">Administration</Link>}
      <a href="/api/auth/signout">Déconnexion</a>
    </nav>
  );
}
