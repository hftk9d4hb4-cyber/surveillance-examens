"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false
    });
    setLoading(false);
    if (result?.ok) window.location.href = "/dashboard";
    else setError("Identifiants incorrects, compte inactif ou activation encore nécessaire.");
  }

  return (
    <form onSubmit={submit}>
      <div className="field full">
        <label htmlFor="email">Adresse électronique</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field full">
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && <div className="notice error">{error}</div>}
      <button type="submit" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
