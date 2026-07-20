"use client";

import { useActionState } from "react";
import { activateAccount, type ActivationState } from "@/app/activate/actions";

const initialState: ActivationState = { error: "" };

export function ActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(activateAccount, initialState);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <div className="field full"><label htmlFor="password">Nouveau mot de passe</label><input id="password" type="password" name="password" autoComplete="new-password" required /></div>
      <div className="field full"><label htmlFor="confirm">Confirmation</label><input id="confirm" type="password" name="confirm" autoComplete="new-password" required /></div>
      <p className="muted">Au moins 12 caractères, avec majuscule, minuscule, chiffre et caractère spécial.</p>
      {state.error && <div className="notice error">{state.error}</div>}
      <button disabled={pending}>{pending ? "Enregistrement…" : "Définir mon mot de passe"}</button>
    </form>
  );
}
