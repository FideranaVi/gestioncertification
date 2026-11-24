
const {
  db,
  obtenirIdUtilisateur,
  reponseErreur
} = require("./controllerUtils");

const ReponseApprenant = db.ReponseApprenant;
const TentativeQuiz = db.TentativeQuiz;
const Question = db.Question;
const Reponse = db.Reponse;

exports.obtenirReponsesApprenant = async (req, res) => {
  try {
    const tentative = await TentativeQuiz.findOne({
      where: {
        idTentative: req.params.idTentative,
        idApprenant: obtenirIdUtilisateur(req)
      }
    });

    if (!tentative) {
      return res.status(404).json({ message: "Tentative introuvable." });
    }

    const reponses = await ReponseApprenant.findAll({
      where: { idTentative: tentative.idTentative },
      include: [
        {
          model: Question,
          as: "question",
          attributes: ["numQuestion", "enonce", "points"]
        },
        {
          model: Reponse,
          as: "reponse",
          attributes: ["numReponse", "libelle"]
        }
      ]
    });

    res.json(reponses);
  } catch (error) {
    reponseErreur(res, error);
  }
};
