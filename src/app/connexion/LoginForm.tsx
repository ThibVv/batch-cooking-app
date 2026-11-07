"use client";

import { useActionState, useState } from "react";
import { requestPasswordReset, signIn, signUp } from "@/app/actions";
import { LogoMark } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";

type Mode = "in" | "up" | "reset";

export default function LoginForm({ linkError }: { linkError: boolean }) {
  const [mode, setMode] = useState<Mode>(linkError ? "reset" : "in");
  const [stateIn, actionIn, pendingIn] = useActionState(signIn, undefined);
  const [stateUp, actionUp, pendingUp] = useActionState(signUp, undefined);
  const [stateReset, actionReset, pendingReset] = useActionState(requestPasswordReset, undefined);
  const error = mode === "in" ? stateIn?.error : mode === "up" ? stateUp?.error : stateReset?.error;
  const pending = pendingIn || pendingUp || pendingReset;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="rise flex flex-col items-center gap-2 py-2 text-brand">
        <LogoMark size={76} />
        <h1 className="font-display text-[40px] leading-none font-bold tracking-[-1px] text-ink">{APP_NAME}</h1>
        <span className="text-[13px] font-medium text-muted">Le batch cooking, à deux, sans y penser</span>
      </div>

      {mode === "reset" ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Mot de passe oublié</h2>
          <p className="text-sm text-ink-2">Recevez par e-mail un lien pour en choisir un nouveau.</p>
        </div>
      ) : (
        <div role="tablist" aria-label="Connexion ou inscription" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e4e7e1] p-1">
          {(["in", "up"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`min-h-10 rounded-[9px] text-sm ${mode === m ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
            >
              {m === "in" ? "Se connecter" : "Créer un compte"}
            </button>
          ))}
        </div>
      )}

      {linkError && mode === "reset" && !stateReset && (
        <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.
        </p>
      )}

      {mode === "reset" && stateReset?.sent ? (
        <div className="card flex flex-col gap-2 p-4 text-sm">
          <p className="font-semibold">E-mail envoyé</p>
          <p className="text-ink-2">
            Ouvrez le lien reçu (pensez aux spams). Il vous ramène dans l&apos;app pour choisir un nouveau mot de passe.
          </p>
        </div>
      ) : (
        <form
          action={mode === "in" ? actionIn : mode === "up" ? actionUp : actionReset}
          className="card flex flex-col gap-4 p-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="label">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          </div>
          {mode !== "reset" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="label">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                className="field"
              />
            </div>
          )}
          {error && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}
          <button type="submit" disabled={pending} className="btn-primary">
            {mode === "in" ? "Se connecter" : mode === "up" ? "Créer mon compte" : "Envoyer le lien"}
          </button>
        </form>
      )}

      {mode === "in" && (
        <button type="button" onClick={() => setMode("reset")} className="self-center text-sm font-medium text-ink-2 underline">
          Mot de passe oublié ?
        </button>
      )}
      {mode === "reset" && (
        <button type="button" onClick={() => setMode("in")} className="self-center text-sm font-medium text-ink-2 underline">
          Retour à la connexion
        </button>
      )}
    </main>
  );
}
