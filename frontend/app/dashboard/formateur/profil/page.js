"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Mail, User, BookOpen, Layers, Trophy, GraduationCap, BadgeCheck, Pencil } from "lucide-react";
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
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Chargement...
        </div>
      </main>
    );
  }

  const nomComplet = `${utilisateur?.nom || ""} ${utilisateur?.prenom || ""}`.trim() || utilisateur?.username || "Formateur";
  const initiale = String(utilisateur?.prenom || utilisateur?.nom || "F").charAt(0).toUpperCase();
  const photoAffichee = utilisateur?.photo || utilisateur?.picture || photoProfil;

  return (
    <main className={styles.page}>
      {/* --- TopBar Facebook --- */}
      <div className={styles.topBar}>
        <Link href="/dashboard/formateur" className={styles.back}>
          <ArrowLeft size={18} /> Retour
        </Link>
        <span className={styles.topTitle}>{nomComplet}</span>
        <span className={styles.topSpacer} />
      </div>

      <div className={styles.container}>
        {/* --- Profil Facebook : Cover + Avatar --- */}
        <section className={styles.profileCard}>
          <div className={styles.cover}>
            <div className={styles.coverGradient} />
            <span className={styles.coverLabel}>LEARNING PRO</span>
          </div>

          <div className={styles.profileHeader}>
            <div className={styles.photoWrap}>
              {photoAffichee ? (
                <img src={photoAffichee} alt="Profil" className={styles.photo} />
              ) : (
                <div className={styles.avatar}>{initiale}</div>
              )}
              <button type="button" className={styles.camera} onClick={() => fileRef.current?.click()} title="Changer la photo de profil">
                <Camera size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={changerPhoto} />
            </div>

            <div className={styles.profileInfo}>
              <h1>
                {nomComplet}
                <BadgeCheck size={22} className={styles.verified} />
              </h1>
              <span className={styles.role}>Formateur</span>
              <p className={styles.profileSub}>Compte formateur · Learning Pro</p>
              <p className={styles.profileHint}>Clique sur l&apos;icône caméra pour changer ta photo de profil.</p>
            </div>

            <div className={styles.profileActions}>
              <button type="button" className={styles.editButton} onClick={() => fileRef.current?.click()}>
                <Pencil size={16} /> Modifier la photo
              </button>
              <Link href="/dashboard/formateur" className={styles.dashboardButton}>
                Tableau de bord
              </Link>
            </div>
          </div>

          {/* --- Onglets Facebook --- */}
          <nav className={styles.tabs}>
            <span className={styles.tabActive}>À propos</span>
            <Link href="/dashboard/formateur/formations" className={styles.tab}>Formations</Link>
            <Link href="/dashboard/formateur/certificats" className={styles.tab}>Certificats</Link>
            <Link href="/dashboard/formateur" className={styles.tab}>Tableau de bord</Link>
          </nav>
        </section>

        {/* --- Infos --- */}
        <div className={styles.layout}>
          <section className={styles.infosCard}>
            <h2>Intro</h2>
            <p className={styles.introText}>Formateur sur Learning Pro. Gestion des formations, quiz et validation des certificats.</p>

            <div className={styles.infos}>
              <div className={styles.row}><User size={20} /><div><small>Nom</small><strong>{utilisateur?.nom || "-"}</strong></div></div>
              <div className={styles.row}><User size={20} /><div><small>Prénom</small><strong>{utilisateur?.prenom || "-"}</strong></div></div>
              <div className={styles.row}><Mail size={20} /><div><small>Email</small><strong>{utilisateur?.email || utilisateur?.mail || "-"}</strong></div></div>
              <div className={styles.row}><GraduationCap size={20} /><div><small>Rôle</small><strong>Formateur</strong></div></div>
              <div className={styles.row}><BookOpen size={20} /><div><small>Compte</small><strong>{utilisateur?.username || "-"}</strong></div></div>
              <div className={styles.row}><Layers size={20} /><div><small>Espace</small><strong>Dashboard Formateur</strong></div></div>
              <div className={styles.row}><Trophy size={20} /><div><small>Certificats</small><strong>Validation des certificats</strong></div></div>
            </div>
          </section>

          <section className={styles.aboutCard}>
            <h2>À propos</h2>
            <div className={styles.aboutGrid}>
              <div className={styles.aboutItem}>
                <GraduationCap size={22} />
                <div><strong>Formateur</strong><span>Learning Pro</span></div>
              </div>
              <div className={styles.aboutItem}>
                <BookOpen size={22} />
                <div><strong>{utilisateur?.username || "-"}</strong><span>Nom de compte</span></div>
              </div>
              <div className={styles.aboutItem}>
                <Mail size={22} />
                <div><strong>{utilisateur?.email || utilisateur?.mail || "-"}</strong><span>Email de contact</span></div>
              </div>
              <div className={styles.aboutItem}>
                <Trophy size={22} />
                <div><strong>Validation</strong><span>Certificats des apprenants</span></div>
              </div>
            </div>
            <p className={styles.aboutNote}>Ces informations viennent de ton compte. Elles sont affichées comme sur un profil Facebook.</p>
          </section>
        </div>
      </div>

      <nav className={styles.bottomNav}>
        <Link href="/dashboard/formateur" className={styles.bottomNavLink}>Tableau de bord</Link>
        <Link href="/dashboard/formateur/formations" className={styles.bottomNavLink}>Formations</Link>
        <Link href="/dashboard/formateur/certificats" className={styles.bottomNavLink}>Certificats</Link>
        <Link href="/dashboard/formateur/profil" className={`${styles.bottomNavLink} ${styles.bottomNavActive}`}>Profil</Link>
      </nav>
    </main>
  );
}