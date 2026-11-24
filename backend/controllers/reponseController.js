
const { Op } = require("sequelize");

const {
  db,
  obtenirIdUtilisateur,
  reponseErreur
} = require("./utilsController");

const {
  Quiz,
  Module,
  Formation,
  Question,
  Reponse,
  TentativeQuiz
} = db;

const TYPES_QUIZ = ["module", "final"];

const obtenirAttributBonneReponse = () => {
  if (Reponse.rawAttributes?.esCorrect) return "esCorrect";
  if (Reponse.rawAttributes?.estCorrecte) return "estCorrecte";
  return null;
};

const obtenirModuleAutorise = async (codeModule, idFormateur) => {
  return Module.findOne({
    where: { codeModule },
    include: [{
      model: Formation,
      as: "formation",
      where: { idFormateur },
      required: true
    }]
  });
};

const obtenirFormationAutorisee = async (numFormation, idFormateur) => {
  return Formation.findOne({
    where: { numFormation, idFormateur }
  });
};

const obtenirQuizFormateur = async (codeQuiz, idFormateur) => {
  return Quiz.findOne({
    where: { codeQuiz, idFormateur }
  });
};

const normaliserBooleen = valeur => (
  valeur === true ||
  valeur === 1 ||
  valeur === "1" ||
  valeur === "true"
);

const verifierParametresTentatives = ({
  nombreTentativesMax,
  tentativesIllimitees
}) => {
  const illimitees = normaliserBooleen(tentativesIllimitees);

  if (illimitees) {
    return {
      valide: true,
      nombreTentativesMax: 3,
      tentativesIllimitees: true
    };
  }

  const nombre = Number(nombreTentativesMax ?? 3);

  if (!Number.isInteger(nombre) || nombre < 1 || nombre > 100) {
    return {
      valide: false,
      message: "Le nombre de tentatives doit être compris entre 1 et 100."
    };
  }

  return {
    valide: true,
    nombreTentativesMax: nombre,
    tentativesIllimitees: false
  };
};

const validerTypeEtAssociation = async ({
  typeQuiz,
  codeModule,
  numFormation,
  idFormateur
}) => {
  if (!TYPES_QUIZ.includes(typeQuiz)) {
    return {
      valide: false,
      message: "Le type de quiz doit être module ou final."
    };
  }

  if (typeQuiz === "module") {
    const moduleId = Number(codeModule);

    if (!Number.isInteger(moduleId) || moduleId <= 0) {
      return {
        valide: false,
        message: "Un module valide est obligatoire pour ce quiz."
      };
    }

    const module = await obtenirModuleAutorise(moduleId, idFormateur);

    if (!module) {
      return {
        valide: false,
        message: "Vous ne pouvez pas utiliser ce module."
      };
    }

    return {
      valide: true,
      codeModule: moduleId,
      numFormation: null
    };
  }

  const formationId = Number(numFormation);

  if (!Number.isInteger(formationId) || formationId <= 0) {
    return {
      valide: false,
      message: "Une formation valide est obligatoire pour le quiz final."
    };
  }

  const formation = await obtenirFormationAutorisee(formationId, idFormateur);

  if (!formation) {
    return {
      valide: false,
      message: "Vous ne pouvez pas utiliser cette formation."
    };
  }

  return {
    valide: true,
    codeModule: null,
    numFormation: formationId
  };
};

const ajouterFormationsAuxQuiz = async quizData => {
  const quizzes = Array.isArray(quizData) ? quizData : [quizData];

  const idsFormations = [
    ...new Set(
      quizzes
        .filter(quiz => quiz.typeQuiz === "final" && quiz.numFormation)
        .map(quiz => Number(quiz.numFormation))
    )
  ];

  if (!idsFormations.length) return quizData;

  const formations = await Formation.findAll({
    where: {
      numFormation: { [Op.in]: idsFormations }
    },
    attributes: ["numFormation", "titre"]
  });

  const formationsParId = new Map(
    formations.map(formation => [
      Number(formation.numFormation),
      formation.toJSON()
    ])
  );

  const resultats = quizzes.map(quiz => ({
    ...quiz,
    formationFinale:
      quiz.typeQuiz === "final"
        ? formationsParId.get(Number(quiz.numFormation)) || null
        : null
  }));

  return Array.isArray(quizData) ? resultats : resultats[0];
};

const verifierDonneesQuiz = ({
  nomQuiz,
  descriptionQuiz,
  duree,
  seuilReussite
}) => {
  if (
    typeof nomQuiz !== "string" ||
    !nomQuiz.trim() ||
    nomQuiz.trim().length > 150
  ) {
    return "Le nom du quiz est obligatoire et limité à 150 caractères.";
  }

  if (
    descriptionQuiz !== undefined &&
    descriptionQuiz !== null &&
    (
      typeof descriptionQuiz !== "string" ||
      descriptionQuiz.length > 255
    )
  ) {
    return "La description est invalide.";
  }

  const dureeNombre = Number(duree);

  if (
    duree === undefined ||
    !Number.isInteger(dureeNombre) ||
    dureeNombre <= 0
  ) {
    return "La durée doit être un entier supérieur à zéro.";
  }

  const seuilNombre = Number(seuilReussite);

  if (
    seuilReussite === undefined ||
    !Number.isFinite(seuilNombre) ||
    seuilNombre < 0 ||
    seuilNombre > 100
  ) {
    return "Le seuil doit être compris entre 0 et 100.";
  }

  return null;
};

const obtenirReponsesInclues = () => {
  const attributBonneReponse = obtenirAttributBonneReponse();
  const attributes = ["numReponse", "libelle"];

  if (attributBonneReponse) {
    attributes.push(attributBonneReponse);
  }

  return {
    model: Reponse,
    as: "reponses",
    attributes,
    required: false
  };
};

/* LISTE DES QUIZ */

exports.obtenirQuiz = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const {
      search = "",
      codeModule,
      typeQuiz,
      numFormation
    } = req.query;

    const where = { idFormateur };

    if (typeof search === "string" && search.trim()) {
      where.nomQuiz = {
        [Op.like]: `%${search.trim()}%`
      };
    }

    if (typeQuiz !== undefined && typeQuiz !== "") {
      if (!TYPES_QUIZ.includes(typeQuiz)) {
        return res.status(400).json({
          message: "Le type de quiz est invalide."
        });
      }

      where.typeQuiz = typeQuiz;
    }

    if (codeModule !== undefined && codeModule !== "") {
      const moduleId = Number(codeModule);

      if (!Number.isInteger(moduleId) || moduleId <= 0) {
        return res.status(400).json({
          message: "Le module sélectionné est invalide."
        });
      }

      where.codeModule = moduleId;
      where.typeQuiz = "module";
    }

    if (numFormation !== undefined && numFormation !== "") {
      const formationId = Number(numFormation);

      if (!Number.isInteger(formationId) || formationId <= 0) {
        return res.status(400).json({
          message: "La formation sélectionnée est invalide."
        });
      }

      where.numFormation = formationId;
      where.typeQuiz = "final";
    }

    const quizzes = await Quiz.findAll({
      where,
      include: [
        {
          model: Module,
          as: "module",
          required: false,
          include: [{
            model: Formation,
            as: "formation",
            attributes: ["numFormation", "titre"],
            required: false
          }]
        },
        {
          model: Question,
          as: "questions",
          attributes: [
            "numQuestion",
            "typeQuestion",
            "enonce",
            "points"
          ],
          required: false,
          include: [obtenirReponsesInclues()]
        }
      ],
      order: [["codeQuiz", "DESC"]]
    });

    const resultats = await ajouterFormationsAuxQuiz(
      quizzes.map(quiz => quiz.toJSON())
    );

    return res.status(200).json(resultats);
  } catch (error) {
    console.error("Erreur récupération quiz :", error);
    return reponseErreur(res, error, "Impossible de charger les quiz.");
  }
};

/* STATISTIQUES DES QUIZ */

exports.obtenirStatistiquesQuiz = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);

    const [
      totalQuiz,
      totalQuizModule,
      totalQuizFinal,
      totalModules,
      totalTentatives
    ] = await Promise.all([
      Quiz.count({ where: { idFormateur } }),

      Quiz.count({
        where: { idFormateur, typeQuiz: "module" }
      }),

      Quiz.count({
        where: { idFormateur, typeQuiz: "final" }
      }),

      Module.count({
        include: [{
          model: Formation,
          as: "formation",
          where: { idFormateur },
          attributes: [],
          required: true
        }]
      }),

      TentativeQuiz.count({
        include: [{
          model: Quiz,
          as: "quiz",
          where: { idFormateur },
          attributes: [],
          required: true
        }]
      })
    ]);

    return res.status(200).json({
      totalQuiz,
      totalQuizModule,
      totalQuizFinal,
      totalModules,
      totalTentatives
    });
  } catch (error) {
    console.error("Erreur statistiques quiz :", error);
    return reponseErreur(res, error);
  }
};

/* RÉCUPÉRER UN QUIZ */

exports.obtenirQuizParId = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const codeQuiz = Number(req.params.id);

    if (!Number.isInteger(codeQuiz) || codeQuiz <= 0) {
      return res.status(400).json({
        message: "Identifiant du quiz invalide."
      });
    }

    const quiz = await Quiz.findOne({
      where: { codeQuiz, idFormateur },
      include: [
        {
          model: Module,
          as: "module",
          required: false,
          include: [{
            model: Formation,
            as: "formation",
            required: false
          }]
        },
        {
          model: Question,
          as: "questions",
          required: false,
          include: [obtenirReponsesInclues()]
        }
      ]
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz introuvable ou accès interdit."
      });
    }

    const resultat = await ajouterFormationsAuxQuiz(quiz.toJSON());

    return res.status(200).json(resultat);
  } catch (error) {
    console.error("Erreur récupération quiz :", error);
    return reponseErreur(res, error, "Impossible de récupérer ce quiz.");
  }
};

/* CRÉER UN QUIZ */

exports.ajouterQuiz = async (req, res) => {
  let transaction;

  try {
    const idFormateur = obtenirIdUtilisateur(req);

    const {
      nomQuiz,
      descriptionQuiz,
      duree,
      seuilReussite,
      typeQuiz = "module",
      codeModule,
      numFormation,
      nombreTentativesMax = 3,
      tentativesIllimitees = false
    } = req.body;

    const erreurValidation = verifierDonneesQuiz({
      nomQuiz,
      descriptionQuiz,
      duree,
      seuilReussite
    });

    if (erreurValidation) {
      return res.status(400).json({ message: erreurValidation });
    }

    const parametresTentatives = verifierParametresTentatives({
      nombreTentativesMax,
      tentativesIllimitees
    });

    if (!parametresTentatives.valide) {
      return res.status(400).json({
        message: parametresTentatives.message
      });
    }

    const association = await validerTypeEtAssociation({
      typeQuiz,
      codeModule,
      numFormation,
      idFormateur
    });

    if (!association.valide) {
      return res.status(400).json({
        message: association.message
      });
    }

    transaction = await Quiz.sequelize.transaction();

    if (typeQuiz === "final") {
      const formationVerrouillee = await Formation.findOne({
        where: {
          numFormation: association.numFormation,
          idFormateur
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!formationVerrouillee) {
        await transaction.rollback();
        transaction = null;

        return res.status(403).json({
          message: "Vous ne pouvez pas utiliser cette formation."
        });
      }

      const quizFinalExistant = await Quiz.findOne({
        where: {
          numFormation: association.numFormation,
          typeQuiz: "final"
        },
        transaction
      });

      if (quizFinalExistant) {
        await transaction.rollback();
        transaction = null;

        return res.status(409).json({
          message: "Cette formation possède déjà un quiz final."
        });
      }
    }

    const quiz = await Quiz.create({
      nomQuiz: nomQuiz.trim(),
      descriptionQuiz: descriptionQuiz?.trim() || null,
      duree: Number(duree),
      seuilReussite: Number(seuilReussite),
      typeQuiz,
      codeModule: association.codeModule,
      numFormation: association.numFormation,
      idFormateur,
      nombreTentativesMax: parametresTentatives.nombreTentativesMax,
      tentativesIllimitees: parametresTentatives.tentativesIllimitees
    }, { transaction });

    await transaction.commit();
    transaction = null;

    return res.status(201).json({
      message: "Quiz créé avec succès.",
      quiz
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur création quiz :", error);
    return reponseErreur(res, error, "Impossible de créer le quiz.");
  }
};

/* MODIFIER UN QUIZ */

exports.modifierQuiz = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const codeQuiz = Number(req.params.id);

    if (!Number.isInteger(codeQuiz) || codeQuiz <= 0) {
      return res.status(400).json({
        message: "Identifiant du quiz invalide."
      });
    }

    const quiz = await obtenirQuizFormateur(codeQuiz, idFormateur);

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz introuvable ou accès interdit."
      });
    }

    const {
      nomQuiz,
      descriptionQuiz,
      duree,
      seuilReussite,
      typeQuiz,
      codeModule,
      numFormation,
      nombreTentativesMax,
      tentativesIllimitees
    } = req.body;

    if (nomQuiz !== undefined) {
      if (
        typeof nomQuiz !== "string" ||
        !nomQuiz.trim() ||
        nomQuiz.trim().length > 150
      ) {
        return res.status(400).json({
          message: "Le nom du quiz est invalide."
        });
      }

      quiz.nomQuiz = nomQuiz.trim();
    }

    if (descriptionQuiz !== undefined) {
      if (
        descriptionQuiz !== null &&
        (
          typeof descriptionQuiz !== "string" ||
          descriptionQuiz.length > 255
        )
      ) {
        return res.status(400).json({
          message: "La description est invalide."
        });
      }

      quiz.descriptionQuiz = descriptionQuiz?.trim() || null;
    }

    if (duree !== undefined) {
      const valeur = Number(duree);

      if (!Number.isInteger(valeur) || valeur <= 0) {
        return res.status(400).json({
          message: "La durée doit être un entier supérieur à zéro."
        });
      }

      quiz.duree = valeur;
    }

    if (seuilReussite !== undefined) {
      const valeur = Number(seuilReussite);

      if (!Number.isFinite(valeur) || valeur < 0 || valeur > 100) {
        return res.status(400).json({
          message: "Le seuil doit être compris entre 0 et 100."
        });
      }

      quiz.seuilReussite = valeur;
    }

    const nouveauType = typeQuiz !== undefined ? typeQuiz : quiz.typeQuiz;
    const nouveauCodeModule = codeModule !== undefined ? codeModule : quiz.codeModule;
    const nouvelleFormation = numFormation !== undefined ? numFormation : quiz.numFormation;

    const association = await validerTypeEtAssociation({
      typeQuiz: nouveauType,
      codeModule: nouveauCodeModule,
      numFormation: nouvelleFormation,
      idFormateur
    });

    if (!association.valide) {
      return res.status(400).json({
        message: association.message
      });
    }

    if (nouveauType === "final") {
      const autreQuizFinal = await Quiz.findOne({
        where: {
          numFormation: association.numFormation,
          typeQuiz: "final",
          codeQuiz: { [Op.ne]: codeQuiz }
        }
      });

      if (autreQuizFinal) {
        return res.status(409).json({
          message: "Cette formation possède déjà un autre quiz final."
        });
      }
    }

    if (
      nombreTentativesMax !== undefined ||
      tentativesIllimitees !== undefined
    ) {
      const parametresTentatives = verifierParametresTentatives({
        nombreTentativesMax:
          nombreTentativesMax !== undefined
            ? nombreTentativesMax
            : quiz.nombreTentativesMax,

        tentativesIllimitees:
          tentativesIllimitees !== undefined
            ? tentativesIllimitees
            : quiz.tentativesIllimitees
      });

      if (!parametresTentatives.valide) {
        return res.status(400).json({
          message: parametresTentatives.message
        });
      }

      quiz.nombreTentativesMax = parametresTentatives.nombreTentativesMax;
      quiz.tentativesIllimitees = parametresTentatives.tentativesIllimitees;
    }

    quiz.typeQuiz = nouveauType;
    quiz.codeModule = association.codeModule;
    quiz.numFormation = association.numFormation;

    await quiz.save();

    return res.status(200).json({
      message: "Quiz modifié avec succès.",
      quiz
    });
  } catch (error) {
    console.error("Erreur modification quiz :", error);
    return reponseErreur(res, error, "Impossible de modifier le quiz.");
  }
};

/* SUPPRIMER UN QUIZ */

exports.supprimerQuiz = async (req, res) => {
  let transaction;

  try {
    transaction = await Quiz.sequelize.transaction();

    const idFormateur = obtenirIdUtilisateur(req);
    const codeQuiz = Number(req.params.id);

    if (!Number.isInteger(codeQuiz) || codeQuiz <= 0) {
      await transaction.rollback();
      transaction = null;

      return res.status(400).json({
        message: "Identifiant du quiz invalide."
      });
    }

    const quiz = await Quiz.findOne({
      where: { codeQuiz, idFormateur },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!quiz) {
      await transaction.rollback();
      transaction = null;

      return res.status(404).json({
        message: "Quiz introuvable ou accès interdit."
      });
    }

    const nombreTentatives = await TentativeQuiz.count({
      where: { codeQuiz: quiz.codeQuiz },
      transaction
    });

    if (nombreTentatives > 0) {
      await transaction.rollback();
      transaction = null;

      return res.status(409).json({
        message: "Ce quiz possède déjà des tentatives. Sa suppression est interdite afin de préserver l'historique des apprenants."
      });
    }

    const questions = await Question.findAll({
      where: { codeQuiz: quiz.codeQuiz },
      attributes: ["numQuestion"],
      transaction
    });

    const idsQuestions = questions.map(question => question.numQuestion);

    if (idsQuestions.length > 0) {
      await Reponse.destroy({
        where: {
          numQuestion: { [Op.in]: idsQuestions }
        },
        transaction
      });

      await Question.destroy({
        where: { codeQuiz: quiz.codeQuiz },
        transaction
      });
    }

    await quiz.destroy({ transaction });

    await transaction.commit();
    transaction = null;

    return res.status(200).json({
      message: "Quiz supprimé avec succès."
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur suppression quiz :", error);
    return reponseErreur(res, error, "Impossible de supprimer le quiz.");
  }
};
