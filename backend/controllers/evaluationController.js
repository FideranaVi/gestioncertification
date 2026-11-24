
const { Op } = require("sequelize");

const {
  db,
  obtenirIdUtilisateur,
  reponseErreur
} = require("./utilsController");

const {
  Evaluation,
  TentativeQuiz,
  Quiz,
  Utilisateur,
  Module,
  Formation
} = db;

const construireIncludes = (idFormateur, search = "") => {
  const apprenantWhere = {};

  if (search.trim()) {
    apprenantWhere[Op.or] = [
      { nom: { [Op.like]: `%${search.trim()}%` } },
      { prenom: { [Op.like]: `%${search.trim()}%` } },
      { email: { [Op.like]: `%${search.trim()}%` } }
    ];
  }

  return [{
    model: TentativeQuiz,
    as: "tentative",
    required: true,
    include: [
      {
        model: Utilisateur,
        as: "apprenant",
        attributes: [
          "idUtilisateur",
          "nom",
          "prenom",
          "email"
        ],
        where: apprenantWhere,
        required: true
      },
      {
        model: Quiz,
        as: "quiz",
        where: { idFormateur },
        required: true,
        attributes: [
          "codeQuiz",
          "nomQuiz",
          "seuilReussite"
        ],
        include: [{
          model: Module,
          as: "module",
          attributes: ["codeModule", "titreModule"],
          include: [{
            model: Formation,
            as: "formation",
            attributes: ["numFormation", "titre"]
          }]
        }]
      }
    ]
  }];
};

exports.obtenirEvaluations = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const { search = "", resultat } = req.query;

    if (!idFormateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    if (
      resultat &&
      !["reussi", "echoue"].includes(resultat)
    ) {
      return res.status(400).json({
        message: "Filtre de résultat invalide."
      });
    }

    const where = {};

    if (resultat) {
      where.resultat = resultat;
    }

    const evaluations = await Evaluation.findAll({
      where,
      include: construireIncludes(idFormateur, search),
      order: [
        ["dateEvaluation", "DESC"],
        ["codeEvaluation", "DESC"]
      ]
    });

    return res.status(200).json(evaluations);
  } catch (error) {
    console.error("Erreur récupération évaluations :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de récupérer les évaluations."
    );
  }
};

exports.obtenirEvaluationParId = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const codeEvaluation = Number(req.params.id);

    if (!idFormateur) {
      return res.status(401).json({
        message: "Utilisateur non authentifié."
      });
    }

    if (!Number.isInteger(codeEvaluation) || codeEvaluation <= 0) {
      return res.status(400).json({
        message: "Identifiant d'évaluation invalide."
      });
    }

    const evaluation = await Evaluation.findOne({
      where: { codeEvaluation },
      include: construireIncludes(idFormateur)
    });

    if (!evaluation) {
      return res.status(404).json({
        message: "Évaluation introuvable ou accès interdit."
      });
    }

    return res.status(200).json(evaluation);
  } catch (error) {
    console.error("Erreur récupération évaluation :", error);

    return reponseErreur(
      res,
      error,
      "Impossible de récupérer cette évaluation."
    );
  }
};
