"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Mail, User, BookOpen, Layers, Trophy, GraduationCap } from "lucide-react";
import styles from "./profil.module.css";

export default function ProfilFormateurPage() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true);

  // ✅ Pas de setState dans useEffect
  const [photoProfil, setPhotoProfil] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("photoProfilFormateur") || "";
  });

  const fileRef = useRef(null);

  useEffect(() => {
    const charger = () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) throw new Error("Non connecté");
        const partie = token.split(".")[1];
        const base64 = partie.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
        setUtilisateur(payload);
      } catch {
        router.replace("/connexion");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [router]);

  const changerPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoProfil(reader.result);
      localStorage.setItem("photoProfilFormateur", reader.result);
    };
    reader.readAsDataURL(file);
  };

  if (chargement) {
    return <main className={styles.page}><div className={styles.loading}>Chargement...</div></main>;
  }

  const nomComplet = `${utilisateur?.nom || ""} ${utilisateur?.prenom || ""}`.trim() || utilisateur?.username || "Formateur";
  const initiale = String(utilisateur?.prenom || utilisateur?.nom || "F").charAt(0).toUpperCase();
  const photoAffichee = utilisateur?.photo || utilisateur?.picture || photoProfil;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/dashboard/formateur" className={styles.back}>
          <ArrowLeft size={18} /> Retour au tableau de bord
        </Link>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.photoWrap}>
              {photoAffichee ? (
                <img src={photoAffichee} alt="Profil" className={styles.photo} />
              ) : (
                <div className={styles.avatar}>{initiale}</div>
              )}
              <button type="button" className={styles.camera} onClick={() => fileRef.current?.click()}>
                <Camera size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={changerPhoto} />
            </div>
            <h1>{nomComplet}</h1>
            <span className={styles.role}>Formateur</span>
            <p>Clique sur l&apos;icône caméra pour changer ta photo de profil.</p>
          </div>

          <div className={styles.infos}>
            <div className={styles.row}><User size={20} /><div><small>Nom</small><strong>{utilisateur?.nom || "-"}</strong></div></div>
            <div className={styles.row}><User size={20} /><div><small>Prénom</small><strong>{utilisateur?.prenom || "-"}</strong></div></div>
            <div className={styles.row}><Mail size={20} /><div><small>Email</small><strong>{utilisateur?.email || utilisateur?.mail || "-"}</strong></div></div>
            <div className={styles.row}><GraduationCap size={20} /><div><small>Rôle</small><strong>Formateur</strong></div></div>
            <div className={styles.row}><BookOpen size={20} /><div><small>Compte</small><strong>{utilisateur?.username || "-"}</strong></div></div>
            <div className={styles.row}><Layers size={20} /><div><small>Espace</small><strong>Dashboard Formateur</strong></div></div>
            <div className={styles.row}><Trophy size={20} /><div><small>Certificats</small><strong>Validation des certificats</strong></div></div>
          </div>
        </div>
      </div>
    </main>
  );
}