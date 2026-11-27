"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenirApiAuth } from "@/lib/api";
///import styles from "./connexion.module.css";//

const API = obtenirApiAuth();

export default function ConnexionPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    pwd: ""
  });

  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [afficher, setAfficher] = useState(false);
  const [chargementGoogle, setChargementGoogle] = useState(false);

  const googleDivRef = useRef(null);
  const googleInitRef = useRef(false);

  const sauvegarderSession = (data) => {
    const utilisateur = {
      ...data.utilisateur,
      role: data.utilisateur.role
    };

    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("utilisateur");
    sessionStorage.removeItem("user");

    localStorage.setItem("token", data.token);
    localStorage.setItem("utilisateur", JSON.stringify(utilisateur));
    localStorage.setItem("user", JSON.stringify(utilisateur));

    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("utilisateur", JSON.stringify(utilisateur));
    sessionStorage.setItem("user", JSON.stringify(utilisateur));

    return utilisateur;
  };

  const handleGoogle = async (response) => {
    setErreur("");
    setChargementGoogle(true);

    try {
      const res = await fetch(`${API}/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Connexion Google échouée.");
      }

      if (!data.token || !data.utilisateur) {
        throw new Error("Réponse du serveur invalide.");
      }

      sauvegarderSession(data);
      router.replace(data.redirectTo || "/dashboard/apprenant");
    } catch (error) {
      if (error?.message?.includes("Failed to fetch") || error?.name === "TypeError") {
        setErreur("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez (le serveur Render peut mettre 30s à se réveiller).");
      } else {
        setErreur(error.message || "Impossible de se connecter avec Google.");
      }
    } finally {
      setChargementGoogle(false);
    }
  };

  useEffect(() => {
    const initGoogle = () => {
      if (googleInitRef.current) return;
      if (!window.google || !googleDivRef.current) return;
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        setErreur("NEXT_PUBLIC_GOOGLE_CLIENT_ID manquant dans .env.local du frontend.");
        return;
      }

      googleInitRef.current = true;

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogle,
        use_fedcm_for_prompt: false,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(googleDivRef.current, {
        theme: "outline",
        size: "large",
        width: 400,
        text: "continue_with",
        shape: "rectangular",
      });
    };

    if (window.google) {
      initGoogle();
      return;
    }

    if (document.getElementById("google-script")) {
      const interval = setInterval(() => {
        if (window.google) {
          initGoogle();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    const script = document.createElement("script");
    script.id = "google-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const response = await fetch(`${API}/connexion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          pwd: form.pwd
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la connexion.");
      }

      if (!data.token || !data.utilisateur) {
        throw new Error("Réponse du serveur invalide.");
      }

      sauvegarderSession(data);
      router.replace(data.redirectTo || "/dashboard/apprenant");
    } catch (error) {
      if (error?.message?.includes("Failed to fetch") || error?.name === "TypeError") {
        setErreur("Impossible de joindre le serveur. Vérifiez votre connexion et réessayez (le serveur Render peut mettre 30s à se réveiller).");
      } else {
        setErreur(error.message || "Impossible de contacter le serveur.");
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
              Se connecter
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Connectez-vous pour accéder à vos formations et à votre progression.
            </p>
          </div>

          {erreur && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {erreur}
            </div>
          )}

          {/* 1. FORMULAIRE EMAIL - EN HAUT */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Votre mot de passe"
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
            </div>

            <button
              type="submit"
              disabled={chargement}
              className="like-btn w-full rounded-lg bg-[#1877f2] py-3.5 text- font-bold text-white shadow-sm transition hover:bg-[#166fe5] disabled:opacity-60"
            >
              {chargement ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          {/* 2. SEPARATEUR */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-gray-400">ou continuer avec</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {/* 3. GOOGLE - EN BAS */}
          <div className="w-full">
            <div ref={googleDivRef} className="flex w-full justify-center [&>div]:!w-full [&>div>div]:!w-full [&_iframe]:!w-full"></div>
          </div>

          {chargementGoogle && (
            <p className="mt-3 text-center text-sm text-gray-500">
              Connexion Google en cours...
            </p>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            Vous n&apos;avez pas de compte ?{" "}
            <Link href="/inscription" className="font-bold text-[#1877f2] hover:underline">
              S&apos;inscrire
            </Link>
          </p>

          <div className="mt-5 text-center">
            <Link href="/" className="text-sm font-medium text-gray-500 transition hover:text-[#1877f2]">
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Bienvenue sur Learning Pro — votre espace de formation.
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