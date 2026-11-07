"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions";
import { APP_NAME } from "@/lib/brand";

/** Choix d'un nouveau mot de passe, après le lien reçu par e-mail (ou depuis la page Foyer). */
export default function NewPasswordPage() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">{APP_NAME}</span>
        <h1 className="font-display text-[32px] leading-none font-bold tracking-[-1px]">Nouveau mot de passe</h1>
      </div>

      <form action={action} className="card flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="label">Nouveau mot de passe</label>
          <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="field" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="label">Confirmer</label>
          <input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" className="field" />
        </div>
        {state?.error && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary">
          Enregistrer
        </button>
      </form>
    </main>
  );
}
