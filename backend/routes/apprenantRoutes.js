
const express = require("express");
const router = express.Router();

const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Reponse = require("../models/Reponse");

const certificatController = require("../controllers/certificatController");
const tentativeQuizController = require("../controllers/tentativeQuizController");
const activiteController = require("../controllers/activiteController");

const {
  obtenirProfil,
  obtenirCatalogueFormations,
  obtenirFormations,
  suivreFormation,
  arreterSuivreFormation,
  commencerModule,
  terminerModule,
  marquerFormationTerminee,
  obtenirModules,
  obtenirQuiz,
  obtenirTentatives,
  obtenirCertificats,
  obtenirDashboard
} = require("../controllers/apprenantController");

const {
  authMiddleware,
  verifierRole
} = require("../middlewares/authMiddleware");

router.use(authMiddleware);
router.use(verifierRole("apprenant"));

// ======================================================
// DASHBOARD ET PROFIL
// ======================================================

router.get("/dashboard", obtenirDashboard);

router.get("/profil", obtenirProfil);

// ======================================================
// FORMATIONS
// ======================================================

router.get(
  "/formations-disponibles",
  obtenirCatalogueFormations
);

router.get(
  "/formations",
  obtenirFormations
);

router.post(
  "/formations/:id/inscription",
  suivreFormation
);

router.patch(
  "/formations/:id/terminer",
  marquerFormationTerminee
);

router.delete(
  "/formations/:id/desinscription",
  arreterSuivreFormation
);

// ======================================================
// MODULES ET PROGRESSION
// ======================================================

router.get(
  "/modules",
  obtenirModules
);

router.post(
  "/modules/:id/commencer",
  commencerModule
);

router.put(
  "/modules/:id/terminer",
  terminerModule
);

// ======================================================
// DÉTAIL D'UN QUIZ
// ======================================================

router.get("/quiz/:codeQuiz", async (req, res) => {
  try {
    const codeQuiz = Number(req.params.codeQuiz);
    const idApprenant = Number(
      req.utilisateur.idUtilisateur
    );

    if (
      !Number.isInteger(codeQuiz) ||
      codeQuiz < 1 ||
      !Number.isInteger(idApprenant) ||
      idApprenant < 1
    ) {
      return res.status(400).json({
        message: "Identifiant invalide."
      });
    }

    const quiz = await Quiz.findByPk(codeQuiz, {
      attributes: [
        "codeQuiz",
        "nomQuiz",
        "descriptionQuiz",
        "duree",
        "seuilReussite",
        "typeQuiz",
        "codeModule",
        "numFormation",
        "idFormateur"
      ],
      include: [
        {
          model: Question,
          as: "questions",
          attributes: [
            "numQuestion",
            "typeQuestion",
            "enonce",
            "points"
          ],
          include: [
            {
              model: Reponse,
              as: "reponses",
              attributes: [
                "numReponse",
                "libelle"
              ]
            }
          ]
        }
      ]
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz introuvable."
      });
    }

    const acces =
      await tentativeQuizController.verifierAccesQuiz(
        quiz,
        idApprenant
      );

    if (!acces.autorise) {
      return res.status(403).json({
        message: acces.message,
        progression: acces.progression || null
      });
    }

    return res.status(200).json({
      quiz,
      acces
    });

  } catch (error) {
    console.error("Erreur détail quiz :", error);

    return res.status(500).json({
      message: "Impossible de charger les questions."
    });
  }
});

// ======================================================
// QUIZ
// ======================================================

router.get(
  "/quiz",
  obtenirQuiz
);

// ======================================================
// TENTATIVES
// ======================================================

router.get(
  "/tentatives",
  tentativeQuizController.obtenirTentatives
);

router.get(
  "/tentatives/:id",
  tentativeQuizController.obtenirTentative
);

router.post(
  "/tentatives",
  tentativeQuizController.commencerTentative
);

router.patch(
  "/tentatives/:id/reponses",
  tentativeQuizController.enregistrerReponses
);

router.post(
  "/tentatives/:id/soumettre",
  tentativeQuizController.soumettreTentative
);

// ======================================================
// SUIVI D'ACTIVITÉ EN TEMPS RÉEL
// ======================================================

router.post(
  "/tentatives/:idTentative/activite",
  activiteController.signalerActivite
);

// ======================================================
// CERTIFICATS
// ======================================================

router.get(
  "/certificats",
  obtenirCertificats
);

router.get(
  "/certificats/:id/pdf",
  certificatController.telechargerCertificatPDF
);

router.post(
  "/certificats",
  certificatController.genererCertificat
);

module.exports = router;
