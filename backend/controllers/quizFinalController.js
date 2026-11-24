const Formation = require("../models/Formation");
const Module = require("../models/Module");
const Quiz = require("../models/Quiz");

const obtenirIdFormateur = (req) =>
  Number(req.utilisateur.idUtilisateur);

const verifierFormation = async (req, numFormation) => {
  const id = Number(numFormation);

  if (!Number.isInteger(id) || id < 1) {
    return { erreur: "Identifiant de formation invalide.", statut: 400 };
  }

  const formation = await Formation.findOne({
    where: {
      numFormation: id,
      idFormateur: obtenirIdFormateur(req)
    }
  });

  if (!formation) {
    return { erreur: "Formation introuvable ou accès refusé.", statut: 404 };
  }

  return { formation };
};

// RÉCUPÉRER LE QUIZ FINAL
exports.obtenirQuizFinal = async (req, res) => {
  try {
    const resultat = await verifierFormation(req, req.params.numFormation);

    if (resultat.erreur) {
      return res.status(resultat.statut).json({
        message: resultat.erreur
      });
    }

    const dernierModule = await Module.findOne({
      where: { numFormation: resultat.formation.numFormation },
      order: [
        ["ordre", "DESC"],
        ["codeModule", "DESC"]
      ]
    });

    if (!dernierModule) {
      return res.status(404).json({
        message: "Ajoutez d'abord des leçons à cette formation."
      });
    }

    const quiz = await Quiz.findOne({
      where: {
        codeModule: dernierModule.codeModule,
        idFormateur: obtenirIdFormateur(req)
      }
    });

    return res.status(200).json({
      formation: resultat.formation,
      dernierModule,
      quiz
    });
  } catch (error) {
    console.error("Erreur récupération quiz final :", error);
    return res.status(500).json({
      message: "Impossible de récupérer le quiz final."
    });
  }
};

// CRÉER LE QUIZ FINAL
exports.ajouterQuizFinal = async (req, res) => {
  try {
    const resultat = await verifierFormation(req, req.params.numFormation);

    if (resultat.erreur) {
      return res.status(resultat.statut).json({
        message: resultat.erreur
      });
    }

    const dernierModule = await Module.findOne({
      where: { numFormation: resultat.formation.numFormation },
      order: [
        ["ordre", "DESC"],
        ["codeModule", "DESC"]
      ]
    });

    if (!dernierModule) {
      return res.status(400).json({
        message: "Ajoutez au moins une leçon avant de créer le quiz final."
      });
    }

    const {
      nomQuiz,
      descriptionQuiz,
      duree,
      seuilReussite
    } = req.body;

    if (
      typeof nomQuiz !== "string" ||
      !nomQuiz.trim() ||
      nomQuiz.trim().length > 150
    ) {
      return res.status(400).json({
        message: "Le nom du quiz est obligatoire (150 caractères maximum)."
      });
    }

    if (
      descriptionQuiz &&
      String(descriptionQuiz).length > 255
    ) {
      return res.status(400).json({
        message: "La description ne doit pas dépasser 255 caractères."
      });
    }

    if (
      !Number.isInteger(Number(duree)) ||
      Number(duree) < 1
    ) {
      return res.status(400).json({
        message: "La durée doit être un nombre entier positif."
      });
    }

    if (
      seuilReussite === undefined ||
      !Number.isFinite(Number(seuilReussite)) ||
      Number(seuilReussite) < 0 ||
      Number(seuilReussite) > 100
    ) {
      return res.status(400).json({
        message: "Le seuil de réussite doit être compris entre 0 et 100."
      });
    }

    const quizExistant = await Quiz.findOne({
      where: {
        codeModule: dernierModule.codeModule,
        idFormateur: obtenirIdFormateur(req)
      }
    });

    if (quizExistant) {
      return res.status(409).json({
        message: "Un quiz existe déjà sur la dernière leçon de cette formation.",
        quiz: quizExistant
      });
    }

    const quiz = await Quiz.create({
      nomQuiz: nomQuiz.trim(),
      descriptionQuiz: descriptionQuiz?.trim() || null,
      duree: Number(duree),
      seuilReussite: Number(seuilReussite),
      codeModule: dernierModule.codeModule,
      idFormateur: obtenirIdFormateur(req),
      // Nécessaires pour que l'apprenant retrouve le quiz final
      typeQuiz: "final",
      numFormation: resultat.formation.numFormation
    });

    return res.status(201).json({
      message: "Quiz final créé avec succès.",
      quiz,
      dernierModule
    });
  } catch (error) {
    console.error("Erreur création quiz final :", error);

    return res.status(500).json({
      message: "Impossible de créer le quiz final."
    });
  }
};