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

// On ne fait PLUS d'include imbriqué - on joint à la main par les IDs
// Ça évite SequelizeEagerLoadingError si un alias est faux dans models/

async function chargerContexte(tentatives) {
  const codeQuizList = [...new Set(tentatives.map(t => t.codeQuiz).filter(Boolean))];
  const idApprenantList = [...new Set(tentatives.map(t => t.idApprenant ?? t.idUtilisateur).filter(Boolean))];

  const [quizzes, apprenants] = await Promise.all([
    codeQuizList.length ? Quiz.findAll({ where: { codeQuiz: { [Op.in]: codeQuizList } } }) : [],
    idApprenantList.length ? Utilisateur.findAll({
      where: { idUtilisateur: { [Op.in]: idApprenantList } },
      attributes: ["idUtilisateur", "nom", "prenom", "email"]
    }) : [],
  ]);

  const quizParCode = new Map(quizzes.map(q => [Number(q.codeQuiz), q]));

  const codeModuleList = [...new Set(quizzes.map(q => q.codeModule).filter(Boolean))];
  const modules = codeModuleList.length
    ? await Module.findAll({ where: { codeModule: { [Op.in]: codeModuleList } }, attributes: ["codeModule", "titreModule", "numFormation"] })
    : [];
  const moduleParCode = new Map(modules.map(m => [Number(m.codeModule), m]));

  const numFormationList = [...new Set(modules.map(m => m.numFormation).filter(Boolean))];
  const formations = numFormationList.length
    ? await Formation.findAll({ where: { numFormation: { [Op.in]: numFormationList } }, attributes: ["numFormation", "titre"] })
    : [];
  const formationParNum = new Map(formations.map(f => [Number(f.numFormation), f]));

  const apprenantParId = new Map(apprenants.map(a => [Number(a.idUtilisateur), a]));

  return { quizParCode, moduleParCode, formationParNum, apprenantParId };
}

exports.obtenirEvaluations = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const { search = "", resultat } = req.query;

    if (!idFormateur) {
      return res.status(401).json({ message: "Utilisateur non authentifié." });
    }

    if (resultat && !["reussi", "echoue"].includes(resultat)) {
      return res.status(400).json({ message: "Filtre de résultat invalide." });
    }

    const where = {};
    if (resultat) where.resultat = resultat;

    // 1. Evaluations seules, sans include = jamais de 500 d'association
    const evaluations = await Evaluation.findAll({
      where,
      order: [["dateEvaluation", "DESC"], ["codeEvaluation", "DESC"]],
    });

    if (!evaluations.length) return res.status(200).json([]);

    // 2. Tentatives de ces evaluations
    // Evaluation pointe vers TentativeQuiz via codeTentative (adapte si ton champ s'appelle autrement)
    const codeTentativeList = [...new Set(evaluations.map(e => e.codeTentative).filter(Boolean))];
    const tentatives = codeTentativeList.length
      ? await TentativeQuiz.findAll({ where: { codeTentative: { [Op.in]: codeTentativeList } } })
      : [];
    const tentativeParCode = new Map(tentatives.map(t => [Number(t.codeTentative), t]));

    const { quizParCode, moduleParCode, formationParNum, apprenantParId } = await chargerContexte(tentatives);

    const terme = search.trim().toLowerCase();

    // 3. On reconstruit EXACTEMENT la forme que ton frontend attend :
    // e.tentative.apprenant / e.tentative.quiz / e.tentative.quiz.module.formation
    const resultatFinal = evaluations.map((e) => {
      const json = e.toJSON ? e.toJSON() : { ...e };
      const tentative = tentativeParCode.get(Number(e.codeTentative));
      if (!tentative) return null;

      const quiz = quizParCode.get(Number(tentative.codeQuiz));
      // Sécurité : on ne garde que les quiz de CE formateur
      if (!quiz || Number(quiz.idFormateur) !== Number(idFormateur)) return null;

      const apprenant = apprenantParId.get(Number(tentative.idApprenant ?? tentative.idUtilisateur));
      const moduleInfo = moduleParCode.get(Number(quiz.codeModule));
      const formation = moduleInfo ? formationParNum.get(Number(moduleInfo.numFormation)) : null;

      // Filtre recherche en JS, comme avant mais sans SQL LIKE qui plantait
      if (terme) {
        const hay = `${apprenant?.nom || ""} ${apprenant?.prenom || ""} ${apprenant?.email || ""}`.toLowerCase();
        if (!hay.includes(terme)) return null;
      }

      return {
        ...json,
        tentative: {
          ...(tentative.toJSON ? tentative.toJSON() : { ...tentative }),
          apprenant: apprenant ? { ...apprenant.toJSON() } : null,
          quiz: {
            ...(quiz.toJSON ? quiz.toJSON() : { ...quiz }),
            codeQuiz: quiz.codeQuiz,
            nomQuiz: quiz.nomQuiz,
            seuilReussite: quiz.seuilReussite,
            module: moduleInfo ? {
              codeModule: moduleInfo.codeModule,
              titreModule: moduleInfo.titreModule,
              formation: formation ? { numFormation: formation.numFormation, titre: formation.titre } : null,
            } : null,
          },
        },
      };
    }).filter(Boolean);

    return res.status(200).json(resultatFinal);
  } catch (error) {
    console.error("Erreur récupération évaluations :", error);
    return reponseErreur(res, error, "Impossible de récupérer les évaluations.");
  }
};

exports.obtenirEvaluationParId = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const codeEvaluation = Number(req.params.id);

    if (!idFormateur) {
      return res.status(401).json({ message: "Utilisateur non authentifié." });
    }
    if (!Number.isInteger(codeEvaluation) || codeEvaluation <= 0) {
      return res.status(400).json({ message: "Identifiant d'évaluation invalide." });
    }

    const evaluation = await Evaluation.findOne({ where: { codeEvaluation } });
    if (!evaluation) {
      return res.status(404).json({ message: "Évaluation introuvable ou accès interdit." });
    }

    const tentative = await TentativeQuiz.findOne({ where: { codeTentative: evaluation.codeTentative } });
    if (!tentative) {
      return res.status(404).json({ message: "Évaluation introuvable ou accès interdit." });
    }

    const { quizParCode, moduleParCode, formationParNum, apprenantParId } = await chargerContexte([tentative]);
    const quiz = quizParCode.get(Number(tentative.codeQuiz));
    if (!quiz || Number(quiz.idFormateur) !== Number(idFormateur)) {
      return res.status(404).json({ message: "Évaluation introuvable ou accès interdit." });
    }
    const apprenant = apprenantParId.get(Number(tentative.idApprenant ?? tentative.idUtilisateur));
    const moduleInfo = moduleParCode.get(Number(quiz.codeModule));
    const formation = moduleInfo ? formationParNum.get(Number(moduleInfo.numFormation)) : null;

    const json = evaluation.toJSON ? evaluation.toJSON() : { ...evaluation };
    json.tentative = {
      ...(tentative.toJSON ? tentative.toJSON() : { ...tentative }),
      apprenant: apprenant ? { ...apprenant.toJSON() } : null,
      quiz: {
        ...(quiz.toJSON ? quiz.toJSON() : { ...quiz }),
        module: moduleInfo ? {
          codeModule: moduleInfo.codeModule,
          titreModule: moduleInfo.titreModule,
          formation: formation ? { numFormation: formation.numFormation, titre: formation.titre } : null,
        } : null,
      },
    };

    return res.status(200).json(json);
  } catch (error) {
    console.error("Erreur récupération évaluation :", error);
    return reponseErreur(res, error, "Impossible de récupérer cette évaluation.");
  }
};