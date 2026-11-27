"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenirApiAuth } from "@/lib/api";

const API = obtenirApiAuth();

export default function InscriptionPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    pwd: "",
    confirmation: ""
  });

  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [afficher, setAfficher] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErreur("");
    setMessage("");

    if (form.pwd !== form.confirmation) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }

    if (form.pwd.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setChargement(true);

    try {
      const response = await fetch(`${API}/inscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim().toLowerCase(),
          pwd: form.pwd
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de l'inscription."
        );
      }

      if (!data.token || !data.utilisateur) {
        throw new Error("Réponse du serveur invalide.");
      }

      const utilisateur = {
        ...data.utilisateur,
        role: "apprenant"
      };

      localStorage.removeItem("token");
      localStorage.removeItem("utilisateur");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("utilisateur");

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "utilisateur",
        JSON.stringify(utilisateur)
      );

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem(
        "utilisateur",
        JSON.stringify(utilisateur)
      );

      setMessage("Inscription réussie ! Bienvenue sur Learning Pro.");

      router.replace("/dashboard/apprenant");
    } catch (error) {
      if (error?.message?.includes("Failed to fetch") || error?.name === "TypeError") {
        setErreur("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez (le serveur Render peut mettre 30s à se réveiller).");
      } else {
        setErreur(
          error.message || "Impossible de contacter le serveur."
        );
      }
    } finally {
      setChargement(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-[#f5f6f7] px-4 py-3 text- text-slate-900 outline-none transition placeholder:text-gray-400 focus:border-[#1877f2] focus:bg-white focus:ring-2 focus:ring-[#1877f2]/20";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f0f2f5] px-4 py-10">
      <div className="w-full max-w-">
        {/* LOGO */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1877f2] text-2xl font-black text-white shadow-md">
              L
            </span>
            <span className="text- font-extrabold tracking-tight text-slate-900">
              Learning <span className="text-[#1877f2]">Pro</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-gray-500">
            Apprenez. Progressez. Réussissez.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text- font-bold text-slate-900 sm:text-2xl">
              Créer un compte apprenant
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Inscrivez-vous gratuitement pour accéder aux formations,
              suivre votre progression et obtenir vos certificats.
            </p>
          </div>

          {erreur && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {erreur}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nom
                </label>
                <input
                  type="text"
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Votre nom"
                  maxLength={50}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Prénom
                </label>
                <input
                  type="text"
                  name="prenom"
                  value={form.prenom}
                  onChange={handleChange}
                  placeholder="Votre prénom"
                  maxLength={50}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Adresse email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="exemple@email.com"
                maxLength={100}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={afficher ? "text" : "password"}
                  name="pwd"
                  value={form.pwd}
                  onChange={handleChange}
                  placeholder="Minimum 8 caractères"
                  minLength={8}
                  required
                  className={`${inputClass} pr-`}
                />
                <button
                  type="button"
                  onClick={() => setAfficher((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm font-semibold text-[#1877f2] transition hover:bg-[#e7f0fe]"
                >
                  {afficher ? "Masquer" : "Afficher"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-400">
                Utilisez au moins 8 caractères pour sécuriser votre compte.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Confirmer le mot de passe
              </label>
              <input
                type={afficher ? "text" : "password"}
                name="confirmation"
                value={form.confirmation}
                onChange={handleChange}
                placeholder="Confirmez votre mot de passe"
                minLength={8}
                required
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={chargement}
              className="like-btn w-full rounded-lg bg-[#1877f2] py-3.5 text- font-bold text-white shadow-sm transition hover:bg-[#166fe5] disabled:opacity-60"
            >
              {chargement
                ? "Inscription en cours..."
                : "Créer mon compte"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">ou</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-600">
            Vous avez déjà un compte ?{" "}
            <Link
              href="/connexion"
              className="font-bold text-[#1877f2] hover:underline"
            >
              Se connecter
            </Link>
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 transition hover:text-[#1877f2]"
            >
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          En vous inscrivant, vous acceptez d&apos;utiliser Learning Pro pour suivre vos formations.
        </p>
      </div>

      <style jsx global>{`
        @keyframes likePop {
          0% { transform: scale(1); }
          40% { transform: scale(1.03); }
          70% { transform: scale(0.99); }
          100% { transform: scale(1); }
        }
        .like-btn:active {
          animation: likePop 0.35s ease;
        }
      `}</style>
    </main>
  );
}