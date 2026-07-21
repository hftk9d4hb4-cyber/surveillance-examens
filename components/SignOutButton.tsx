"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="nav-button"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Déconnexion
    </button>
  );
}
