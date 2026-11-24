"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  User,
  Mail,
  ShieldCheck,
  Camera,
  Pencil,
  Check,
  X,
  LogOut,
  Users,
  GraduationCap,
} from "lucide-react";
import styles from "./profil.module.css";

function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

function lirePayload(token) {
  try {
    const partie = token.split(".")[1];
    const base64 = partie.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
}

function lireUtilisateurStocke() {
  try {
    const brut =
      localStorage.getItem("utilisateur") ||
      localStorage.getItem("user") ||
      sessionStorage.getItem("utilisateur") ||
      sessionStorage.getItem("user");
    if (!brut) return {};
    return JSON.parse(brut) || {};
  } catch {
    return {};
  }
}

function initialesDe(nomComplet) {
  if (!nomComplet) return "A";
  return nomComplet
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot.charAt(0).toUpperCase())
    .join("");
}

// ✅ CORRIGÉ : pas de useEffect + pas de setState dans un effet
// On lit tout UNE FOIS dans l'initialiseur de useState
function lireProfilInitial() {
  if (typeof window === "undefined") {
    return {
      nom: "Administrateur",
      prenom: "",
      nomFamille: "",
      email: "",
      photo: "",
      role: "Administrateur",
    };
  }
  const token = getToken();
  const payload = token ? lirePayload(token) : {};
  const stocke = lireUtilisateurStocke();

  const prenom = payload.prenom || stocke.prenom || "";
  const nomFamille = payload.nom || stocke.nom || "";
  const nomComplet =
    payload.nomComplet ||
    [prenom, nomFamille].filter(Boolean).join(" ") ||
    stocke.nomComplet ||
    "Administrateur";
  const email =
    payload.email || stocke.email || localStorage.getItem("email") || "";
  const photo =
    stocke.photo ||
    stocke.photoProfil ||
    stocke.avatar ||
    payload.photo ||
    payload.photoProfil ||
    localStorage.getItem("photoProfil") ||
    "";

  return {
    nom: nomComplet,
    prenom,
    nomFamille,
    email,
    photo,
    role: payload.role || stocke.role || "Administrateur",
  };
}

export default function ProfilAdminPage() {
  const [admin, setAdmin] = useState(lireProfilInitial);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [edition, setEdition] = useState(false);
  const [formulaire, setFormulaire] = useState(() => {
    const initial = lireProfilInitial();
    return { prenom: initial.prenom, nom: initial.nomFamille, email: initial.email };
  });
  const [photoPreview, setPhotoPreview] = useState(() => lireProfilInitial().photo);
  const inputPhotoRef = useRef(null);

  function sauvegarderPhoto(photoBase64) {
    localStorage.setItem("photoProfil", photoBase64);

    const stocke = lireUtilisateurStocke();
    const maj = { ...stocke, photo: photoBase64, photoProfil: photoBase64 };
    if (localStorage.getItem("utilisateur"))
      localStorage.setItem("utilisateur", JSON.stringify(maj));
    if (localStorage.getItem("user"))
      localStorage.setItem("user", JSON.stringify(maj));

    setAdmin((prev) => ({ ...prev, photo: photoBase64 }));
    setPhotoPreview(photoBase64);
    setMessage("Photo de profil mise à jour.");
    setTimeout(() => setMessage(""), 3000);
  }

  function changerPhoto(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if (!fichier.type.startsWith("image/")) {
      setErreur("Veuillez choisir une image.");
      return;
    }
    if (fichier.size > 2 * 1024 * 1024) {
      setErreur("L'image doit faire moins de 2 Mo.");
      return;
    }
    setErreur("");
    const lecteur = new FileReader();
    lecteur.onload = () => {
      if (typeof lecteur.result === "string") {
        sauvegarderPhoto(lecteur.result);
      }
    };
    lecteur.readAsDataURL(fichier);
  }

  function supprimerPhoto() {
    if (!window.confirm("Supprimer votre photo de profil ?")) return;
    localStorage.removeItem("photoProfil");
    const stocke = lireUtilisateurStocke();
    const maj = { ...stocke, photo: "", photoProfil: "", avatar: "" };
    if (localStorage.getItem("utilisateur"))
      localStorage.setItem("utilisateur", JSON.stringify(maj));
    if (localStorage.getItem("user"))
      localStorage.setItem("user", JSON.stringify(maj));
    setAdmin((prev) => ({ ...prev, photo: "" }));
    setPhotoPreview("");
    setMessage("Photo supprimée.");
    setTimeout(() => setMessage(""), 3000);
  }

  function sauvegarderInfos(e) {
    e.preventDefault();
    setErreur("");
    const nomComplet = [formulaire.prenom, formulaire.nom]
      .filter(Boolean)
      .join(" ");
    if (!nomComplet) {
      setErreur("Le nom est obligatoire.");
      return;
    }
    if (!formulaire.email.includes("@")) {
      setErreur("Email invalide.");
      return;
    }

    const stocke = lireUtilisateurStocke();
    const maj = {
      ...stocke,
      prenom: formulaire.prenom,
      nom: formulaire.nom,
      nomComplet,
      email: formulaire.email,
      photo: admin.photo,
      photoProfil: admin.photo,
    };
    if (localStorage.getItem("utilisateur"))
      localStorage.setItem("utilisateur", JSON.stringify(maj));
    if (localStorage.getItem("user"))
      localStorage.setItem("user", JSON.stringify(maj));
    localStorage.setItem("email", formulaire.email);

    setAdmin((prev) => ({
      ...prev,
      nom: nomComplet,
      prenom: formulaire.prenom,
      nomFamille: formulaire.nom,
      email: formulaire.email,
    }));
    setEdition(false);
    setMessage("Profil mis à jour.");
    setTimeout(() => setMessage(""), 3000);
  }

  function deconnexion() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/connexion";
  }

  return (
    <main className={styles.page}>
      <nav className={styles.topNav}>
        <Link href="/dashboard/admin" className={styles.brand}>
          <span className={styles.brandLogo}>L</span>
          <span>
            Learning Pro <small>Administration</small>
          </span>
        </Link>
        <div className={styles.topNavLinks}>
          <Link href="/dashboard/admin/profil" className={`${styles.topNavLink} ${styles.topNavActive}`}>
            <User size={18} /> Mon profil
          </Link>
          <Link href="/dashboard/admin" className={styles.topNavDashboard}>
            <ArrowLeft size={18} /> Tableau de bord
          </Link>
        </div>
      </nav>

      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <div className={styles.surtitre}>
              <span className={styles.surtitrePoint} />
              ADMINISTRATION • MON PROFIL
            </div>
            <h1>Mon profil</h1>
            <p>Gérez vos informations personnelles d&apos;administrateur.</p>
          </div>
          <Link href="/dashboard/admin" className={styles.dashboardButton}>
            <LayoutDashboard size={17} /> Tableau de bord
          </Link>
        </header>

        {message && (
          <div className={styles.successMessage}>
            <Check size={18} /> <span>{message}</span>
          </div>
        )}
        {erreur && (
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>!</span> <span>{erreur}</span>
          </div>
        )}

        <section className={styles.profilCard}>
          <div className={styles.profilTop}>
            <div className={styles.photoWrap}>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt={admin.nom} className={styles.photo} />
              ) : (
                <div className={styles.photoPlaceholder}>
                  {initialesDe(admin.nom)}
                </div>
              )}
              <button
                type="button"
                className={styles.photoButton}
                onClick={() => inputPhotoRef.current?.click()}
                title="Modifier la photo"
              >
                <Camera size={16} />
              </button>
              <input
                ref={inputPhotoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={changerPhoto}
              />
            </div>

            <div className={styles.profilInfos}>
              <span className={styles.badgeRole}>
                <ShieldCheck size={14} /> Administrateur
              </span>
              <h2>{admin.nom}</h2>
              <p className={styles.emailLigne}>
                <Mail size={15} /> {admin.email || "Email indisponible"}
              </p>
              <p className={styles.roleLigne}>
                <ShieldCheck size={15} /> Compte administrateur • Accès complet
              </p>
            </div>

            <div className={styles.profilActions}>
              <button
                type="button"
                className={styles.editButton}
                onClick={() => {
                  setEdition((v) => !v);
                  setFormulaire({
                    prenom: admin.prenom,
                    nom: admin.nomFamille,
                    email: admin.email,
                  });
                }}
              >
                {edition ? <X size={16} /> : <Pencil size={16} />}
                {edition ? "Annuler" : "Modifier"}
              </button>
              {photoPreview && (
                <button
                  type="button"
                  className={styles.deletePhotoButton}
                  onClick={supprimerPhoto}
                >
                  Supprimer la photo
                </button>
              )}
            </div>
          </div>

          {edition ? (
            <form className={styles.formulaire} onSubmit={sauvegarderInfos}>
              <div className={styles.formRow}>
                <label>
                  Prénom
                  <input
                    type="text"
                    value={formulaire.prenom}
                    onChange={(e) =>
                      setFormulaire((p) => ({ ...p, prenom: e.target.value }))
                    }
                    placeholder="Prénom"
                  />
                </label>
                <label>
                  Nom
                  <input
                    type="text"
                    value={formulaire.nom}
                    onChange={(e) =>
                      setFormulaire((p) => ({ ...p, nom: e.target.value }))
                    }
                    placeholder="Nom"
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  value={formulaire.email}
                  onChange={(e) =>
                    setFormulaire((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="email@exemple.com"
                />
              </label>
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveButton}>
                  <Check size={16} /> Enregistrer
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setEdition(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailIcon}>
                  <User size={18} />
                </span>
                <div>
                  <span className={styles.detailLabel}>Nom complet</span>
                  <strong>{admin.nom}</strong>
                </div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailIcon}>
                  <Mail size={18} />
                </span>
                <div>
                  <span className={styles.detailLabel}>Email</span>
                  <strong>{admin.email || "—"}</strong>
                </div>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailIcon}>
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <span className={styles.detailLabel}>Rôle</span>
                  <strong>Administrateur</strong>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={styles.actionsSection}>
          <h2>Accès rapide</h2>
          <div className={styles.actionsGrid}>
            <Link href="/dashboard/admin" className={styles.actionCard}>
              <span className={styles.actionIcon}>
                <LayoutDashboard size={22} />
              </span>
              <div>
                <strong>Tableau de bord</strong>
                <span>Retour à la vue d&apos;ensemble</span>
              </div>
            </Link>
            <Link href="/dashboard/admin/utilisateurs" className={styles.actionCard}>
              <span className={styles.actionIcon}>
                <Users size={22} />
              </span>
              <div>
                <strong>Gestion utilisateurs</strong>
                <span>Consulter tous les comptes</span>
              </div>
            </Link>
            <Link href="/dashboard/admin/utilisateurs/ajouter" className={styles.actionCard}>
              <span className={styles.actionIcon}>
                <GraduationCap size={22} />
              </span>
              <div>
                <strong>Créer un formateur</strong>
                <span>Ajouter un compte formateur</span>
              </div>
            </Link>
            <button type="button" className={styles.actionCard} onClick={deconnexion}>
              <span className={styles.actionIconDanger}>
                <LogOut size={22} />
              </span>
              <div>
                <strong>Déconnexion</strong>
                <span>Quitter votre session</span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}