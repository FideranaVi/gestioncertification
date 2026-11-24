"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const API = "http://localhost:5000/api/auth";

function VerifierEmailContenu() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const router = useRouter();

  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const res = await fetch(`${API}/verifier-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Code incorrect.");
      alert("Email vérifié ! Tu peux te connecter.");
      router.replace("/connexion");
    } catch (error) {
      setErreur(error.message || "Erreur lors de la vérification.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f8f5] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <Link href="/" className="text-3xl font-bold text-[#16834a]">
            Learning Pro
          </Link>
          <h1 className="text-2xl font-bold text-[#183b2b] mt-6">Vérifie ton email</h1>
          <p className="text-gray-500 mt-2 text-sm">
            On a envoyé un code à 6 chiffres à<br />
            <span className="font-semibold text-gray-700">{email || "ton adresse email"}</span>
          </p>
        </div>
        {erreur && (
          <div className="mb-5 rounded-lg bg-red-100 p-3 text-red-700 text-sm">{erreur}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold">Code de vérification</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex : 123456"
              maxLength={6}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#16834a] text-center text-xl tracking-widest"
            />
          </div>
          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-lg bg-[#16834a] py-3 font-semibold text-white hover:bg-[#116638] disabled:opacity-60"
          >
            {chargement ? "Vérification..." : "Vérifier mon email"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">
          Tu as déjà vérifié ?{" "}
          <Link href="/connexion" className="font-semibold text-[#16834a] hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function VerifierEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center">Chargement...</main>}>
      <VerifierEmailContenu />
    </Suspense>
  );
}