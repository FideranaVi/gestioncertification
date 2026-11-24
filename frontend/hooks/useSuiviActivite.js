"use client";

import { useEffect, useRef } from "react";

const API = "http://localhost:5000/api/apprenant";

function obtenirToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token") || localStorage.getItem("token");
}

/**
 * Suivi en temps réel d'une tentative de quiz.
 *
 * Usage dans la page du quiz apprenant :
 *
 *   useSuiviActivite({
 *     idTentative: tentative?.idTentative,
 *     actif: tentative?.statut === "en_cours",
 *     questionActuelle: indexQuestion + 1,
 *     nbReponsesDonnees: Object.keys(reponses).length
 *   });
 */
export default function useSuiviActivite({
  idTentative,
  actif = true,
  questionActuelle,
  nbReponsesDonnees
}) {
  // On garde la progression la plus récente sans relancer l'effet principal
  const progression = useRef({ questionActuelle, nbReponsesDonnees });

  useEffect(() => {
    progression.current = { questionActuelle, nbReponsesDonnees };
  }, [questionActuelle, nbReponsesDonnees]);

  const envoyerRef = useRef(null);

  // Effet principal : heartbeat + détection de sortie d'onglet
  useEffect(() => {
    if (!idTentative || !actif) return;

    const url = `${API}/tentatives/${idTentative}/activite`;

    const envoyer = (type, extra = {}) => {
      const token = obtenirToken();
      if (!token) return;

      // keepalive : la requête part même si l'onglet se ferme
      fetch(url, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type, ...extra })
      }).catch(() => {});
    };

    envoyerRef.current = envoyer;

    const avecProgression = () => ({
      questionActuelle: progression.current.questionActuelle,
      nbReponsesDonnees: progression.current.nbReponsesDonnees
    });

    const surVisibilite = () => {
      if (document.visibilityState === "hidden") {
        envoyer("ecran_quitte");
      } else {
        envoyer("ecran_retour", avecProgression());
      }
    };

    const surFermeture = () => envoyer("page_quittee");

    // Premier signal immédiat, puis toutes les 10 s
    envoyer("heartbeat", avecProgression());
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        envoyer("heartbeat", avecProgression());
      }
    }, 10000);

    document.addEventListener("visibilitychange", surVisibilite);
    window.addEventListener("pagehide", surFermeture);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", surVisibilite);
      window.removeEventListener("pagehide", surFermeture);
      envoyerRef.current = null;
    };
  }, [idTentative, actif]);

  // Envoi immédiat quand la progression change (nouvelle question / réponse)
  useEffect(() => {
    if (!idTentative || !actif || !envoyerRef.current) return;
    if (document.visibilityState !== "visible") return;

    envoyerRef.current("heartbeat", {
      questionActuelle,
      nbReponsesDonnees
    });
  }, [idTentative, actif, questionActuelle, nbReponsesDonnees]);
}