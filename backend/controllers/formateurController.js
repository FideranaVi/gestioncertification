const {
  db,
  obtenirIdUtilisateur,
  reponseErreur
} = require("./utilsController");

const {
  Formation,
  Module,
  Quiz,
  TentativeQuiz,
  Evaluation,
  Certificat,
  Utilisateur
} = db;

const obtenirDashboardFormateur = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);

    if (!idFormateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    const whereQuiz = { idFormateur };
    const whereFormation = { idFormateur };

    const [
      formations,
      modules,
      quizzes,
      tentatives,
      evaluations,
      certificats,
      derniersQuiz,
      dernieresTentatives
    ] = await Promise.all([
      Formation.count({
        where: whereFormation
      }),

      Module.count({
        include: [{
          model: Formation,
          as: "formation",
          where: whereFormation,
          attributes: [],
          required: true
        }]
      }),

      Quiz.count({
        where: whereQuiz
      }),

      TentativeQuiz.count({
        include: [{
          model: Quiz,
          as: "quiz",
          where: whereQuiz,
          attributes: [],
          required: true
        }]
      }),

      Evaluation.count({
        include: [{
          model: TentativeQuiz,
          as: "tentative",
          required: true,
          include: [{
            model: Quiz,
            as: "quiz",
            where: whereQuiz,
            attributes: [],
            required: true
          }]
        }]
      }),

      Certificat.count({
        where: { idFormateur }
      }),

      Quiz.findAll({
        where: whereQuiz,
        include: [{
          model: Module,
          as: "module",
          attributes: ["codeModule", "titreModule"]
        }],
        order: [["codeQuiz", "DESC"]],
        limit: 5
      }),

      TentativeQuiz.findAll({
        include: [
          {
            model: Quiz,
            as: "quiz",
            where: whereQuiz,
            attributes: ["codeQuiz", "nomQuiz"],
            required: true
          },
          {
            model: Utilisateur,
            as: "apprenant",
            attributes: [
              "idUtilisateur",
              "nom",
              "prenom",
              "email"
            ],
            required: false
          },
          {
            model: Evaluation,
            as: "evaluation",
            required: false
          }
        ],
        order: [["dateTentative", "DESC"]],
        limit: 5
      })
    ]);

    return res.status(200).json({
      statistiques: {
        formations,
        modules,
        quizzes,
        tentatives,
        evaluations,
        certificats
      },
      derniersQuiz,
      dernieresTentatives
    });
  } catch (error) {
    console.error("Erreur dashboard formateur :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de charger le tableau de bord formateur."
    );
  }
};

const obtenirModulesFormateur = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);

    if (!idFormateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    const modules = await Module.findAll({
      include: [{
        model: Formation,
        as: "formation",
        where: { idFormateur },
        attributes: ["numFormation", "titre"],
        required: true
      }],
      order: [
        ["numFormation", "ASC"],
        ["ordre", "ASC"]
      ]
    });

    return res.status(200).json(modules);
  } catch (error) {
    console.error("Erreur récupération modules formateur :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de récupérer les modules du formateur."
    );
  }
};

module.exports = {
  obtenirDashboardFormateur,
  obtenirModulesFormateur
};