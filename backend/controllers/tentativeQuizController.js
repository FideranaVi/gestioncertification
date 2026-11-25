const { Op } = require("sequelize");
const sequelize = require("../config/database");
const { db, obtenirIdUtilisateur } = require("./utilsController");

// On utilise les modeles si ils existent, sinon on passe par sequelize.models
const Tentative = sequelize.models.Tentative || sequelize.models.tentative || sequelize.models.TentativeQuiz;
const Quiz = sequelize.models.Quiz || sequelize.models.quiz;
const Certificat = sequelize.models.Certificat || sequelize.models.certificat;
const Question = sequelize.models.Question || sequelize.models.question;

function obtenirStatutCertificat(valeur) {
  return String(valeur || "").toLowerCase().trim();
}

// ================= CREER / DEMARRER UNE TENTATIVE =================
// POST /api/apprenant/tentatives  { codeQuiz }
// JAMAIS de blocage si deja reussi.
// JAMAIS de blocage si certificat refuse / valide.
// Seul cas de reprise : une tentative en_cours existe deja.
async function creerTentative(req, res) {
  try {
    const idApprenant = obtenirIdUtilisateur(req);
    const { codeQuiz } = req.body;

    if (!codeQuiz) {
      return res.status(400).json({ message: "codeQuiz est requis." });
    }

    const quiz = await Quiz.findOne({ where: { codeQuiz: Number(codeQuiz) } });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz introuvable." });
    }

    // 1. S'il y a une tentative EN COURS, on la reprend, on n'en cree pas une 2e
    const tentativeEnCours = await Tentative.findOne({
      where: {
        idApprenant,
        codeQuiz: Number(codeQuiz),
        statut: "en_cours",
      },
      order: [["dateTentative", "DESC"]],
    });

    if (tentativeEnCours) {
      return res.json({
        message: "Reprise de la tentative en cours.",
        reprise: true,
        tentative: tentativeEnCours,
        quiz,
        dureeRestante: tentativeEnCours.dureeRestante || null,
      });
    }

    // 2. On regarde la derniere tentative terminee, juste pour info
    // ON NE BLOQUE PAS, meme si reussie, meme si certificat valide/refuse.
    const derniereTentative = await Tentative.findOne({
      where: {
        idApprenant,
        codeQuiz: Number(codeQuiz),
        statut: { [Op.ne]: "en_cours" },
      },
      order: [["dateTentative", "DESC"]],
    });

    // 3. Si la derniere tentative avait un certificat REFUSE,
    // on prepare le retour en en_attente si la nouvelle tentative reussit.
    // On ne bloque rien ici.

    // 4. Creation d'une NOUVELLE tentative, toujours autorisee
    const nouvelleTentative = await Tentative.create({
      idApprenant,
      codeQuiz: Number(codeQuiz),
      dateTentative: new Date(),
      score: 0,
      statut: "en_cours",
      derniereActivite: new Date(),
      estEnLigne: 1,
      nbSortiesEcran: 0,
      nbReponsesDonnees: 0,
      questionActuelle: 1,
    });

    // On renvoie le quiz avec ses questions pour l'affichage
    let quizComplet = quiz.toJSON ? quiz.toJSON() : quiz;
    try {
      const quizAvecQuestions = await Quiz.findOne({
        where: { codeQuiz: Number(codeQuiz) },
        include: [{ model: Question, as: "questions", required: false }],
      });
      if (quizAvecQuestions) quizComplet = quizAvecQuestions.toJSON();
    } catch (e) {}

    return res.status(201).json({
      message: derniereTentative
        ? "Nouvelle tentative creee. Vous pouvez reprendre ce quiz."
        : "Tentative creee.",
      reprise: false,
      tentative: nouvelleTentative,
      quiz: quizComplet,
      dureeRestante: quizComplet.duree ? Number(quizComplet.duree) * 60 : null,
    });
  } catch (error) {
    console.error("creerTentative:", error);
    return res.status(500).json({ message: "Impossible de demarrer le quiz." });
  }
}

// ================= SAUVEGARDER REPONSES EN COURS =================
// PATCH /api/apprenant/tentatives/:id/reponses
async function sauvegarderReponses(req, res) {
  try {
    const idApprenant = obtenirIdUtilisateur(req);
    const { id } = req.params;
    const { reponses } = req.body;

    const tentative = await Tentative.findOne({
      where: { idTentative: id, idApprenant },
    });
    if (!tentative) return res.status(404).json({ message: "Tentative introuvable." });
    if (tentative.statut !== "en_cours") {
      return res.status(409).json({ message: "Tentative deja terminee.", tentativeTerminee: true, tentative });
    }

    await tentative.update({
      derniereActivite: new Date(),
      nbReponsesDonnees: Array.isArray(reponses) ? reponses.length : tentative.nbReponsesDonnees,
      reponsesSauvegardees: reponses || [],
    });

    return res.json({ message: "Reponses sauvegardees.", tentative });
  } catch (error) {
    console.error("sauvegarderReponses:", error);
    return res.status(500).json({ message: "Impossible de sauvegarder." });
  }
}

// ================= ACTIVITE / SURVEILLANCE =================
// POST /api/apprenant/tentatives/:id/activite  { type, dureeSecondes }
async function enregistrerActivite(req, res) {
  try {
    const idApprenant = obtenirIdUtilisateur(req);
    const { id } = req.params;
    const { type, dureeSecondes } = req.body;

    const tentative = await Tentative.findOne({
      where: { idTentative: id, idApprenant },
    });
    if (!tentative) return res.status(404).json({ message: "Tentative introuvable." });

    const estSortie = String(type || "").includes("sortie") || type === "sortie_onglet" || type === "sortie_fenetre";

    await tentative.update({
      derniereActivite: new Date(),
      estEnLigne: type === "retour" ? 1 : tentative.estEnLigne,
      nbSortiesEcran: estSortie ? (tentative.nbSortiesEcran || 0) + 1 : tentative.nbSortiesEcran,
      derniereSortie: estSortie ? new Date() : tentative.derniereSortie,
    });

    return res.json({ message: "Activite enregistree." });
  } catch (error) {
    return res.json({ message: "Activite ignoree." });
  }
}

// ================= SOUMETTRE =================
// POST /api/apprenant/tentatives/:id/soumettre  { reponses: [{numQuestion, numReponses}] }
async function soumettreTentative(req, res) {
  try {
    const idApprenant = obtenirIdUtilisateur(req);
    const { id } = req.params;
    const { reponses } = req.body;

    const tentative = await Tentative.findOne({
      where: { idTentative: id, idApprenant },
    });
    if (!tentative) return res.status(404).json({ message: "Tentative introuvable." });

    if (tentative.statut !== "en_cours") {
      return res.status(409).json({
        message: "Tentative deja terminee.",
        tentativeTerminee: true,
        tentative,
        score: tentative.score,
      });
    }

    const quiz = await Quiz.findOne({ where: { codeQuiz: tentative.codeQuiz } });
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable." });

    // --- Calcul du score ---
    // On recupere les questions avec bonnes reponses via sequelize.models
    let questions = [];
    try {
      const ReponseModel = sequelize.models.Reponse || sequelize.models.reponse;
      const qs = await Question.findAll({ where: { codeQuiz: tentative.codeQuiz } });
      for (const q of qs) {
        const reps = await ReponseModel.findAll({ where: { numQuestion: q.numQuestion } });
        questions.push({ question: q.toJSON(), reponses: reps.map((r) => r.toJSON()) });
      }
    } catch (e) {
      questions = [];
    }

    let pointsObtenus = 0;
    let pointsTotal = questions.length || 0;
    const reponsesMap = {};
    (reponses || []).forEach((r) => {
      reponsesMap[Number(r.numQuestion)] = (r.numReponses || []).map(Number);
    });

    questions.forEach((item, index) => {
      const numQ = item.question.numQuestion ?? index + 1;
      const bonnes = item.reponses.filter((r) => r.estCorrecte === true || r.estCorrect === true || r.correcte === true).map((r) => Number(r.numReponse));
      const donnees = reponsesMap[Number(numQ)] || [];
      const ok = bonnes.length > 0 && bonnes.length === donnees.length && bonnes.every((b) => donnees.includes(b));
      if (ok) pointsObtenus += 1;
    });

    const score = pointsTotal > 0 ? Math.round((pointsObtenus / pointsTotal) * 100) : 0;
    const seuil = Number(quiz.seuilReussite || 50);
    const reussi = score >= seuil;

    await tentative.update({
      score,
      statut: "termine",
      dateTentative: tentative.dateTentative,
      derniereActivite: new Date(),
      estEnLigne: 0,
    });

    // --- Gestion certificat ---
    // Si reussi : certificat passe / repasse en en_attente, meme si avant il etait refuse.
    // Si echoue : on ne touche pas au certificat, l'apprenant peut juste reprendre.
    let certificat = null;
    if (reussi && Certificat) {
      // On cherche le certificat lie a cette formation / tentative / apprenant
      const whereCert = { idApprenant };
      // On essaie de lier par codeQuiz si la colonne existe
      try {
        certificat = await Certificat.findOne({
          where: whereCert,
          order: [["dateCertificat", "DESC"]],
        });
      } catch (e) {
        certificat = null;
      }

      if (certificat) {
        // CAS CLE : refuse -> en_attente sur nouvelle reussite
        await certificat.update({
          statut: "en_attente",
          statutCertificat: "en_attente",
          score: score,
          idTentative: tentative.idTentative,
        });
      } else {
        try {
          certificat = await Certificat.create({
            idApprenant,
            codeQuiz: tentative.codeQuiz,
            idTentative: tentative.idTentative,
            score,
            statut: "en_attente",
            statutCertificat: "en_attente",
            dateCertificat: new Date(),
          });
        } catch (e) {
          // Si la table certificat a d'autres colonnes obligatoires, on ignore, le formateur verra la tentative
          certificat = null;
        }
      }
    }

    return res.json({
      message: reussi ? "Quiz reussi. En attente de validation du formateur." : "Quiz termine. Seuil non atteint, vous pouvez reprendre.",
      resultat: reussi ? "reussi" : "echoue",
      reussi,
      score,
      seuilReussite: seuil,
      pointsObtenus,
      pointsTotal,
      nomQuiz: quiz.nomQuiz,
      quiz,
      tentative,
      certificat,
      // Pour que la page apprenant sache que ce n'est PAS un blocage
      peutReprendre: true,
      certificatRefuse: false,
    });
  } catch (error) {
    console.error("soumettreTentative:", error);
    return res.status(500).json({ message: "Impossible de soumettre le quiz." });
  }
}

// ================= FORMATEUR : VALIDER / REFUSER CERTIFICAT =================
// PATCH /api/formateur/tentatives/:id/certificat  { action: "valider" | "refuser" } ou { statut: "valide" | "refuse" }
async function validerCertificatTentative(req, res) {
  try {
    const { id } = req.params;
    const action = String(req.body.action || req.body.statut || "").toLowerCase();

    const tentative = await Tentative.findOne({ where: { idTentative: id } });
    if (!tentative) return res.status(404).json({ message: "Tentative introuvable." });

    const veutValider = action === "valider" || action === "valide" || action === "accepte" || action === "accepter";
    const veutRefuser = action === "refuser" || action === "refuse" || action === "rejete" || action === "rejeter";

    if (!veutValider && !veutRefuser) {
      return res.status(400).json({ message: "Action invalide. Utilisez valider ou refuser." });
    }

    const nouveauStatut = veutValider ? "valide" : "refuse";

    // On met a jour la tentative
    await tentative.update({
      statutCertificat: nouveauStatut,
      statut: tentative.statut, // on ne change pas termine -> reste termine
    });

    // On met a jour le certificat lie
    if (Certificat) {
      try {
        const cert = await Certificat.findOne({
          where: { idTentative: tentative.idTentative },
          order: [["dateCertificat", "DESC"]],
        });
        if (cert) {
          await cert.update({ statut: nouveauStatut, statutCertificat: nouveauStatut });
        } else if (veutValider || veutRefuser) {
          // Si pas de certificat, on en cree un pour garder la trace du refus
          await Certificat.create({
            idApprenant: tentative.idApprenant,
            codeQuiz: tentative.codeQuiz,
            idTentative: tentative.idTentative,
            score: tentative.score,
            statut: nouveauStatut,
            statutCertificat: nouveauStatut,
            dateCertificat: new Date(),
          });
        }
      } catch (e) {}
    }

    return res.json({
      message: veutValider
        ? "Certificat valide. L'apprenant peut telecharger son certificat."
        : "Certificat refuse. L'apprenant peut reprendre le meme quiz.",
      tentative,
      statutCertificat: nouveauStatut,
      peutReprendre: true,
    });
  } catch (error) {
    console.error("validerCertificatTentative:", error);
    return res.status(500).json({ message: "Impossible de mettre a jour le certificat." });
  }
}

// ================= LISTE TENTATIVES APPRENANT =================
async function listerMesTentatives(req, res) {
  try {
    const idApprenant = obtenirIdUtilisateur(req);
    const tentatives = await Tentative.findAll({
      where: { idApprenant },
      order: [["dateTentative", "DESC"]],
    });
    return res.json(tentatives);
  } catch (error) {
    return res.status(500).json({ message: "Impossible de charger les tentatives." });
  }
}

module.exports = {
  creerTentative,
  demarrerTentative: creerTentative,
  sauvegarderReponses,
  enregistrerActivite,
  soumettreTentative,
  validerCertificatTentative,
  listerMesTentatives,
};