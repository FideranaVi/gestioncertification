"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenirApiAuth } from "@/lib/api";

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

  return (
    <main className="min-h-screen bg-[#f4f8f5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">

        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[#16834a]">
            GestionFormation
          </Link>
          <h1 className="text-2xl font-bold text-[#183b2b] mt-6">
            Se connecter
          </h1>
          <p className="text-gray-500 mt-2">
            Connectez-vous pour accéder à vos formations.
          </p>
        </div>

        {erreur && (
          <div className="mb-5 rounded-lg bg-red-100 p-3 text-red-700 text-sm">
            {erreur}
          </div>
        )}

        {/* GOOGLE - UNIQUEMENT SUR CONNEXION */}
        <div className="w-full flex justify-center">
          <div ref={googleDivRef}></div>
        </div>

        {chargementGoogle && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Connexion Google en cours...
          </p>
        )}

        <div className="flex items-center gap-3 my-6">
          <hr className="flex-1 border-gray-200" />
          <span className="text-sm text-gray-400">ou avec email</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold">
              Adresse email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="exemple@email.com"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#16834a]"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold">
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-20 outline-none focus:border-[#16834a]"
              />
              <button
                type="button"
                onClick={() => setAfficher((prev) => !prev)}
                className="absolute right-3 top-3 text-sm text-[#16834a]"
              >
                {afficher ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-lg bg-[#16834a] py-3 font-semibold text-white hover:bg-[#116638] disabled:opacity-60"
          >
            {chargement ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Vous n&apos;avez pas de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-[#16834a] hover:underline">
            S&apos;inscrire
          </Link>
        </p>

        <div className="text-center mt-5">
          <Link href="/" className="text-sm text-gray-500 hover:text-[#16834a]">
            ← Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </main>
  );
}