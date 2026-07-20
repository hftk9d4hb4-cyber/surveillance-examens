"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false
    });

    if (result?.ok) {
      window.location.href = "/dashboard";
    } else {
      setError("Identifiants incorrects");
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ maxWidth: 480, margin: "60px auto" }}>
      <h1>Connexion</h1>
      <div className="field">
        <label>Email</label>
        <input name="email" type="email" required />
      </div>
      <div className="field">
        <label>Mot de passe</label>
        <input name="password" type="password" required />
      </div>
      {error && <p>{error}</p>}
      <button className="btn">Se connecter</button>
    </form>
  );
}
