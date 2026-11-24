
const { db, obtenirIdUtilisateur } = require("./utilsController");

const { Question, Quiz, Reponse, ReponseApprenant } = db;

const Op = require("sequelize").Op;

/* =====================================================
   OUTILS
===================================================== */

const normaliserId = (valeur) => {
  const id = Number(valeur);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const obtenirValeurCorrecte = (donnees) => {
  if (typeof donnees.esCorrect === "boolean") return donnees.esCorrect;
  if (typeof donnees.estCorrecte === "boolean") return donnees.estCorrecte;
  return undefined;
};

const normaliserReponse = (reponse) => {
  if (!reponse) return reponse;

  const resultat = typeof reponse.toJSON === "function"
    ? reponse.toJSON()
    : { ...reponse };

  resultat.esCorrect = resultat.estCorrecte;
  return resultat;
};

const normaliserQuestion = (question) => {
  if (!question) return question;

  const resultat = typeof question.toJSON === "function"
    ? question.toJSON()
    : { ...question };

  resultat.reponses = (resultat.reponses || []).map(normaliserReponse);
  return resultat;
};

const obtenirQuestionAutorisee = async (
  numQuestion,
  idFormateur,
  transaction = undefined
) => {
  return Question.findOne({
    where: { numQuestion },
    include: [{
      model: Quiz,
      as: "quiz",
      where: { idFormateur },
      required: true
    }],
    transaction
  });
};

const obtenirReponseAutorisee = async (
  numReponse,
  idFormateur,
  transaction = undefined
) => {
  return Reponse.findOne({
    where: { numReponse },
    include: [{
      model: Question,
      as: "question",
      required: true,
      include: [{
        model: Quiz,
        as: "quiz",
        where: { idFormateur },
        required: true
      }]
    }],
    transaction
  });
};

const verifierHistoriqueQuestion = async (
  numQuestion,
  transaction = undefined
) => {
  const nombre = await ReponseApprenant.count({
    where: { numQuestion },
    transaction
  });

  return nombre > 0;
};

const verifierHistoriqueReponse = async (
  numReponse,
  transaction = undefined
) => {
  const nombre = await ReponseApprenant.count({
    where: { numReponse },
    transaction
  });

  return nombre > 0;
};

const obtenirQuestionAvecReponses = async (
  numQuestion,
  transaction = undefined
) => {
  return Question.findByPk(numQuestion, {
    include: [{
      model: Reponse,
      as: "reponses"
    }],
    transaction
  });
};

const verifierDonneesQuestion = ({
  typeQuestion,
  enonce,
  points
}) => {
  if (
    typeof typeQuestion !== "string" ||
    !typeQuestion.trim() ||
    typeQuestion.trim().length > 30
  ) {
    return "Le type de question est obligatoire et limité à 30 caractères.";
  }

  if (
    typeof enonce !== "string" ||
    !enonce.trim() ||
    enonce.trim().length > 500
  ) {
    return "L'énoncé est obligatoire et limité à 500 caractères.";
  }

  const nombrePoints = Number(points);

  if (
    points === undefined ||
    !Number.isInteger(nombrePoints) ||
    nombrePoints <= 0
  ) {
    return "Les points doivent être un entier supérieur à zéro.";
  }

  return null;
};

const verifierDonneesReponse = ({
  libelle,
  estCorrecte,
  esCorrect
}) => {
  const valeurCorrecte = obtenirValeurCorrecte({
    estCorrecte,
    esCorrect
  });

  if (
    typeof libelle !== "string" ||
    !libelle.trim() ||
    libelle.trim().length > 300
  ) {
    return {
      valide: false,
      message: "Le libellé est obligatoire et limité à 300 caractères."
    };
  }

  if (valeurCorrecte === undefined) {
    return {
      valide: false,
      message: "Le statut de correction doit être booléen."
    };
  }

  return {
    valide: true,
    libelle: libelle.trim(),
    estCorrecte: valeurCorrecte
  };
};

const verifierLibelleVraiFaux = (libelle) => {
  return ["Vrai", "Faux"].includes(libelle);
};

const verifierReponseVraiFaux = async (
  question,
  libelle,
  estCorrecte,
  transaction = undefined,
  numReponseExclue = null
) => {
  if (question.typeQuestion !== "vrai_faux") {
    return { valide: true };
  }

  if (!verifierLibelleVraiFaux(libelle)) {
    return {
      valide: false,
      message: "Une question Vrai/Faux doit uniquement contenir les réponses Vrai et Faux."
    };
  }

  const existantes = await Reponse.findAll({
    where: { numQuestion: question.numQuestion },
    transaction
  });

  const autres = existantes.filter(
    (r) => Number(r.numReponse) !== Number(numReponseExclue)
  );

  if (
    autres.some(
      (r) => r.libelle.toLowerCase() === libelle.toLowerCase()
    )
  ) {
    return {
      valide: false,
      message: `La réponse ${libelle} existe déjà pour cette question.`
    };
  }

  if (autres.length >= 2) {
    return {
      valide: false,
      message: "Une question Vrai/Faux ne peut contenir que deux réponses."
    };
  }

  if (estCorrecte && autres.some((r) => r.estCorrecte)) {
    return {
      valide: false,
      message: "Une question Vrai/Faux ne peut avoir qu'une seule bonne réponse."
    };
  }

  if (!estCorrecte && autres.length === 1 && !autres[0].estCorrecte) {
    return {
      valide: false,
      message: "Une question Vrai/Faux doit conserver une seule bonne réponse."
    };
  }

  return { valide: true };
};

/* =====================================================
   RÉCUPÉRER LES QUESTIONS D'UN QUIZ
===================================================== */

exports.obtenirQuestions = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const codeQuiz = normaliserId(req.query.codeQuiz);

    if (!codeQuiz) {
      return res.status(400).json({
        message: "Le code du quiz est obligatoire et doit être valide."
      });
    }

    const quiz = await Quiz.findOne({
      where: { codeQuiz, idFormateur }
    });

    if (!quiz) {
      return res.status(404).json({
        message: "Quiz introuvable ou accès interdit."
      });
    }

    const questions = await Question.findAll({
      where: { codeQuiz },
      include: [{
        model: Reponse,
        as: "reponses"
      }],
      order: [["numQuestion", "ASC"]]
    });

    return res.status(200).json(
      questions.map(normaliserQuestion)
    );
  } catch (error) {
    console.error("Erreur récupération questions :", error);

    return res.status(500).json({
      message: "Impossible de charger les questions.",
      erreur: error.message
    });
  }
};

/* =====================================================
   RÉCUPÉRER UNE QUESTION
===================================================== */

exports.obtenirQuestion = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const numQuestion = normaliserId(req.params.id);

    if (!numQuestion) {
      return res.status(400).json({
        message: "Identifiant de question invalide."
      });
    }

    const questionAutorisee = await obtenirQuestionAutorisee(
      numQuestion,
      idFormateur
    );

    if (!questionAutorisee) {
      return res.status(404).json({
        message: "Question introuvable ou accès interdit."
      });
    }

    const question = await obtenirQuestionAvecReponses(numQuestion);

    return res.status(200).json(normaliserQuestion(question));
  } catch (error) {
    console.error("Erreur récupération question :", error);

    return res.status(500).json({
      message: "Impossible de charger la question.",
      erreur: error.message
    });
  }
};

/* =====================================================
   AJOUTER UNE QUESTION
===================================================== */

exports.ajouterQuestion = async (req, res) => {
  let transaction;

  try {
    const idFormateur = obtenirIdUtilisateur(req);

    const { typeQuestion, enonce, points, codeQuiz } = req.body;

    const erreurValidation = verifierDonneesQuestion({
      typeQuestion,
      enonce,
      points
    });

    if (erreurValidation) {
      return res.status(400).json({ message: erreurValidation });
    }

    const idQuiz = normaliserId(codeQuiz);

    if (!idQuiz) {
      return res.status(400).json({
        message: "Le code du quiz est invalide."
      });
    }

    transaction = await Question.sequelize.transaction();

    const quiz = await Quiz.findOne({
      where: { codeQuiz: idQuiz, idFormateur },
      transaction
    });

    if (!quiz) {
      await transaction.rollback();
      transaction = null;

      return res.status(404).json({
        message: "Quiz introuvable ou accès interdit."
      });
    }

    const question = await Question.create({
      typeQuestion: typeQuestion.trim(),
      enonce: enonce.trim(),
      points: Number(points),
      codeQuiz: idQuiz
    }, { transaction });

    await transaction.commit();
    transaction = null;

    const resultat = await obtenirQuestionAvecReponses(
      question.numQuestion
    );

    return res.status(201).json({
      message: "Question créée avec succès.",
      question: normaliserQuestion(resultat)
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur création question :", error);

    return res.status(500).json({
      message: "Impossible de créer la question.",
      erreur: error.message
    });
  }
};

/* =====================================================
   MODIFIER UNE QUESTION
===================================================== */

exports.modifierQuestion = async (req, res) => {
  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const numQuestion = normaliserId(req.params.id);

    if (!numQuestion) {
      return res.status(400).json({
        message: "Identifiant de question invalide."
      });
    }

    const question = await obtenirQuestionAutorisee(
      numQuestion,
      idFormateur
    );

    if (!question) {
      return res.status(404).json({
        message: "Question introuvable ou accès interdit."
      });
    }

    if (await verifierHistoriqueQuestion(numQuestion)) {
      return res.status(409).json({
        message: "Cette question a déjà été utilisée dans une évaluation. Sa modification est interdite."
      });
    }

    const { typeQuestion, enonce, points } = req.body;

    if (typeQuestion !== undefined) {
      if (
        typeof typeQuestion !== "string" ||
        !typeQuestion.trim() ||
        typeQuestion.trim().length > 30
      ) {
        return res.status(400).json({
          message: "Type de question invalide."
        });
      }

      if (typeQuestion.trim() !== question.typeQuestion) {
        const nombreReponses = await Reponse.count({
          where: { numQuestion }
        });

        if (nombreReponses > 0) {
          return res.status(409).json({
            message: "Le type de question ne peut pas être changé lorsqu'elle possède déjà des réponses. Supprimez d'abord ses réponses."
          });
        }
      }

      question.typeQuestion = typeQuestion.trim();
    }

    if (enonce !== undefined) {
      if (
        typeof enonce !== "string" ||
        !enonce.trim() ||
        enonce.trim().length > 500
      ) {
        return res.status(400).json({
          message: "Énoncé invalide."
        });
      }

      question.enonce = enonce.trim();
    }

    if (points !== undefined) {
      const valeur = Number(points);

      if (!Number.isInteger(valeur) || valeur <= 0) {
        return res.status(400).json({
          message: "Les points doivent être un entier positif."
        });
      }

      question.points = valeur;
    }

    await question.save();

    const resultat = await obtenirQuestionAvecReponses(numQuestion);

    return res.status(200).json({
      message: "Question modifiée avec succès.",
      question: normaliserQuestion(resultat)
    });
  } catch (error) {
    console.error("Erreur modification question :", error);

    return res.status(500).json({
      message: "Impossible de modifier la question.",
      erreur: error.message
    });
  }
};

/* =====================================================
   SUPPRIMER UNE QUESTION
===================================================== */

exports.supprimerQuestion = async (req, res) => {
  let transaction;

  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const numQuestion = normaliserId(req.params.id);

    if (!numQuestion) {
      return res.status(400).json({
        message: "Identifiant de question invalide."
      });
    }

    transaction = await Question.sequelize.transaction();

    const question = await obtenirQuestionAutorisee(
      numQuestion,
      idFormateur,
      transaction
    );

    if (!question) {
      await transaction.rollback();
      transaction = null;

      return res.status(404).json({
        message: "Question introuvable ou accès interdit."
      });
    }

    if (await verifierHistoriqueQuestion(numQuestion, transaction)) {
      await transaction.rollback();
      transaction = null;

      return res.status(409).json({
        message: "Cette question est déjà utilisée dans une évaluation. Sa suppression est interdite."
      });
    }

    await Reponse.destroy({
      where: { numQuestion },
      transaction
    });

    await question.destroy({ transaction });

    await transaction.commit();
    transaction = null;

    return res.status(200).json({
      message: "Question et réponses supprimées avec succès."
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur suppression question :", error);

    return res.status(500).json({
      message: "Impossible de supprimer la question.",
      erreur: error.message
    });
  }
};

/* =====================================================
   AJOUTER UNE RÉPONSE
===================================================== */

exports.ajouterReponse = async (req, res) => {
  let transaction;

  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const numQuestion = normaliserId(req.params.id);

    if (!numQuestion) {
      return res.status(400).json({
        message: "Identifiant de question invalide."
      });
    }

    const validation = verifierDonneesReponse(req.body);

    if (!validation.valide) {
      return res.status(400).json({
        message: validation.message
      });
    }

    transaction = await Reponse.sequelize.transaction();

    const question = await obtenirQuestionAutorisee(
      numQuestion,
      idFormateur,
      transaction
    );

    if (!question) {
      await transaction.rollback();
      transaction = null;

      return res.status(404).json({
        message: "Question introuvable ou accès interdit."
      });
    }

    if (await verifierHistoriqueQuestion(numQuestion, transaction)) {
      await transaction.rollback();
      transaction = null;

      return res.status(409).json({
        message: "Cette question a déjà été utilisée dans une évaluation. L'ajout de réponses est interdit."
      });
    }

    const validationVF = await verifierReponseVraiFaux(
      question,
      validation.libelle,
      validation.estCorrecte,
      transaction
    );

    if (!validationVF.valide) {
      await transaction.rollback();
      transaction = null;

      return res.status(400).json({
        message: validationVF.message
      });
    }

    const reponse = await Reponse.create({
      libelle: validation.libelle,
      estCorrecte: validation.estCorrecte,
      numQuestion
    }, { transaction });

    await transaction.commit();
    transaction = null;

    return res.status(201).json({
      message: "Réponse ajoutée avec succès.",
      reponse: normaliserReponse(reponse)
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur ajout réponse :", error);

    return res.status(500).json({
      message: "Impossible d'ajouter la réponse.",
      erreur: error.message
    });
  }
};

/* =====================================================
   MODIFIER UNE RÉPONSE
===================================================== */

exports.modifierReponse = async (req, res) => {
  let transaction;

  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const numReponse = normaliserId(req.params.id);

    if (!numReponse) {
      return res.status(400).json({
        message: "Identifiant de réponse invalide."
      });
    }

    transaction = await Reponse.sequelize.transaction();

    const reponse = await obtenirReponseAutorisee(
      numReponse,
      idFormateur,
      transaction
    );

    if (!reponse) {
      await transaction.rollback();
      transaction = null;

      return res.status(404).json({
        message: "Réponse introuvable ou accès interdit."
      });
    }

    if (await verifierHistoriqueReponse(numReponse, transaction)) {
      await transaction.rollback();
      transaction = null;

      return res.status(409).json({
        message: "Cette réponse est déjà utilisée dans une évaluation. Modification interdite."
      });
    }

    const question = await Question.findByPk(
      reponse.numQuestion,
      { transaction }
    );

    const { libelle, estCorrecte, esCorrect } = req.body;

    let nouveauLibelle = reponse.libelle;

    if (libelle !== undefined) {
      if (
        typeof libelle !== "string" ||
        !libelle.trim() ||
        libelle.trim().length > 300
      ) {
        await transaction.rollback();
        transaction = null;

        return res.status(400).json({
          message: "Libellé invalide."
        });
      }

      nouveauLibelle = libelle.trim();
    }

    const valeurCorrecte = obtenirValeurCorrecte({
      estCorrecte,
      esCorrect
    });

    let nouvelleCorrection = reponse.estCorrecte;

    if (estCorrecte !== undefined || esCorrect !== undefined) {
      if (valeurCorrecte === undefined) {
        await transaction.rollback();
        transaction = null;

        return res.status(400).json({
          message: "Le statut de correction doit être booléen."
        });
      }

      nouvelleCorrection = valeurCorrecte;
    }

    const validationVF = await verifierReponseVraiFaux(
      question,
      nouveauLibelle,
      nouvelleCorrection,
      transaction,
      numReponse
    );

    if (!validationVF.valide) {
      await transaction.rollback();
      transaction = null;

      return res.status(400).json({
        message: validationVF.message
      });
    }

    if (question.typeQuestion === "vrai_faux" && !nouvelleCorrection) {
      const autresCorrectes = await Reponse.count({
        where: {
          numQuestion: question.numQuestion,
          estCorrecte: true,
          numReponse: { [Op.ne]: numReponse }
        },
        transaction
      });

      if (autresCorrectes === 0) {
        await transaction.rollback();
        transaction = null;

        return res.status(400).json({
          message: "Une question Vrai/Faux doit conserver une seule bonne réponse."
        });
      }
    }

    reponse.libelle = nouveauLibelle;
    reponse.estCorrecte = nouvelleCorrection;

    await reponse.save({ transaction });

    await transaction.commit();
    transaction = null;

    return res.status(200).json({
      message: "Réponse modifiée avec succès.",
      reponse: normaliserReponse(reponse)
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur modification réponse :", error);

    return res.status(500).json({
      message: "Impossible de modifier la réponse.",
      erreur: error.message
    });
  }
};

/* =====================================================
   SUPPRIMER UNE RÉPONSE
===================================================== */

exports.supprimerReponse = async (req, res) => {
  let transaction;

  try {
    const idFormateur = obtenirIdUtilisateur(req);
    const numReponse = normaliserId(req.params.id);

    if (!numReponse) {
      return res.status(400).json({
        message: "Identifiant de réponse invalide."
      });
    }

    transaction = await Reponse.sequelize.transaction();

    const reponse = await obtenirReponseAutorisee(
      numReponse,
      idFormateur,
      transaction
    );

    if (!reponse) {
      await transaction.rollback();
      transaction = null;

      return res.status(404).json({
        message: "Réponse introuvable ou accès interdit."
      });
    }

    if (await verifierHistoriqueReponse(numReponse, transaction)) {
      await transaction.rollback();
      transaction = null;

      return res.status(409).json({
        message: "Cette réponse est déjà utilisée dans une évaluation. Suppression interdite."
      });
    }

    const nombreReponses = await Reponse.count({
      where: { numQuestion: reponse.numQuestion },
      transaction
    });

    if (nombreReponses <= 2) {
      await transaction.rollback();
      transaction = null;

      return res.status(409).json({
        message: "Une question doit conserver au moins deux réponses."
      });
    }

    if (reponse.estCorrecte) {
      const autresCorrectes = await Reponse.count({
        where: {
          numQuestion: reponse.numQuestion,
          estCorrecte: true,
          numReponse: { [Op.ne]: numReponse }
        },
        transaction
      });

      if (autresCorrectes === 0) {
        await transaction.rollback();
        transaction = null;

        return res.status(409).json({
          message: "Une question doit conserver au moins une réponse correcte."
        });
      }
    }

    await reponse.destroy({ transaction });

    await transaction.commit();
    transaction = null;

    return res.status(200).json({
      message: "Réponse supprimée avec succès."
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Erreur suppression réponse :", error);

    return res.status(500).json({
      message: "Impossible de supprimer la réponse.",
      erreur: error.message
    });
  }
};
