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

      setMessage("Inscription réussie ! Bienvenue sur GestionFormation.");

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

  return (
    <main className="min-h-screen bg-[#f4f8f5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8">

        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-[#16834a]">
            GestionFormation
          </Link>

          <h1 className="text-2xl font-bold text-[#183b2b] mt-6">
            Créer un compte apprenant
          </h1>

          <p className="text-gray-500 mt-2">
            Inscrivez-vous pour accéder aux formations.
          </p>
        </div>

        {erreur && (
          <div className="mb-5 rounded-lg bg-red-100 p-3 text-red-700 text-sm">
            {erreur}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg bg-green-100 p-3 text-green-700 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-sm font-semibold">
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#16834a]"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#16834a]"
              />
            </div>
          </div>

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
              maxLength={100}
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
                placeholder="Minimum 8 caractères"
                minLength={8}
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

          <div>
            <label className="block mb-2 text-sm font-semibold">
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#16834a]"
            />
          </div>

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-lg bg-[#16834a] py-3 font-semibold text-white hover:bg-[#116638] disabled:opacity-60"
          >
            {chargement
              ? "Inscription en cours..."
              : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Vous avez déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="font-semibold text-[#16834a] hover:underline"
          >
            Se connecter
          </Link>
        </p>

        <div className="text-center mt-5">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-[#16834a]"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>

      </div>
    </main>
  );
}