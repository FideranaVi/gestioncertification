"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Mail, User, Trophy, BookOpen, FileText } from "lucide-react";
import styles from "./profil.module.css";

import { obtenirApiApprenant } from "@/lib/api";
const API = obtenirApiApprenant();

export default function ProfilPage() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState(null);
  const [statistiques, setStatistiques] = useState({});
  const [chargement, setChargement] = useState(true);

  // ✅ CORRIGÉ : lecture de localStorage directement dans useState, pas dans useEffect
  const [photoProfil, setPhotoProfil] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("photoProfil") || "";
  });

  const fileRef = useRef(null);

  useEffect(() => {
    const charger = async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) throw new Error("Non connecté");
        const res = await fetch(`${API}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store"
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
        setUtilisateur(data.utilisateur || {});
        setStatistiques(data.statistiques || {});
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
      localStorage.setItem("photoProfil", reader.result);
    };
    reader.readAsDataURL(file);
  };

  if (chargement) {
    return <main className={styles.page}><div className={styles.loading}>Chargement...</div></main>;
  }

  const nomComplet = `${utilisateur?.nom || ""} ${utilisateur?.prenom || ""}`.trim();
  const initiale = utilisateur?.nom?.charAt(0)?.toUpperCase() || "A";
  const photoAffichee = utilisateur?.photo || utilisateur?.picture || photoProfil;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/dashboard/apprenant" className={styles.back}>
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
            <h1>{nomComplet || "Apprenant"}</h1>
            <span className={styles.role}>Apprenant</span>
            <p>Clique sur l&apos;icône caméra pour changer ta photo de profil.</p>
          </div>

          <div className={styles.infos}>
            <div className={styles.row}>
              <User size={20} />
              <div><small>Nom</small><strong>{utilisateur?.nom || "-"}</strong></div>
            </div>
            <div className={styles.row}>
              <User size={20} />
              <div><small>Prénom</small><strong>{utilisateur?.prenom || "-"}</strong></div>
            </div>
            <div className={styles.row}>
              <Mail size={20} />
              <div><small>Email</small><strong>{utilisateur?.email || "-"}</strong></div>
            </div>
            <div className={styles.row}>
              <BookOpen size={20} />
              <div><small>Formations</small><strong>{statistiques.nombreFormations ?? 0}</strong></div>
            </div>
            <div className={styles.row}>
              <FileText size={20} />
              <div><small>Quiz terminés</small><strong>{statistiques.tentativesTerminees ?? 0}</strong></div>
            </div>
            <div className={styles.row}>
              <Trophy size={20} />
              <div><small>Certificats</small><strong>{statistiques.nombreCertificats ?? 0}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}