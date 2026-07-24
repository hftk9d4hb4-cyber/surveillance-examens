import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasStaffRole } from "@/lib/guards";
import { SignOutButton } from "@/components/SignOutButton";

export async function AppNav() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = session.user.role;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">SE</span>
          <span>Surveillance des examens</span>
        </Link>
        <nav className="nav-links" aria-label="Navigation principale">
          <Link href="/dashboard">Tableau de bord</Link>
          <Link href="/availability">Disponibilités</Link>
          {role === "TEACHER" && <Link href="/my-convocations">Mes convocations</Link>}
          <Link href="/teacher-profile">Mon profil</Link>
          {hasStaffRole(role) && <Link href="/campaigns">Campagnes</Link>}
          {hasStaffRole(role) && <Link href="/teachers">Enseignants</Link>}
          {hasStaffRole(role) && <Link href="/exams">Examens</Link>}
          {hasStaffRole(role) && <Link href="/assignments">Affectations</Link>}
          {hasStaffRole(role) && <Link href="/convocations">Convocations</Link>}
          {role === "ADMIN" && <Link href="/admin">Administration</Link>}
          {hasStaffRole(role) && <Link href="/admin/imports">Imports</Link>}
          <SignOutButton />
        </nav>
        <span className="user-chip">{session.user.name} · {role === "ADMIN" ? "Administrateur" : role === "MANAGER" ? "Gestionnaire" : "Enseignant"}</span>
      </div>
    </header>
  );
}
