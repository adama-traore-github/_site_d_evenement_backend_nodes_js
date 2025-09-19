const { Router } = require('express');
const pool = require('../../config/database');
const { protect } = require('../middlewares/auth.middleware');

const router = Router();


/**
 * @swagger
 * /api/events/{id}/comments:
 *   get:
 *     summary: Récupérer les commentaires d’un événement
 *     description: Retourne la liste des commentaires associés à un événement spécifique.
 *     tags: [Commentaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l’événement
 *     responses:
 *       200:
 *         description: Liste des commentaires
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   contenu:
 *                     type: string
 *                   cree_le:
 *                     type: string
 *                     format: date-time
 *                   auteur:
 *                     type: string
 *       500:
 *         description: Erreur serveur
 */

// GET /api/events/:id/comments
router.get('/:id/comments', async (req, res) => {
  const { id: eventId } = req.params;
  try {
    // On fait une JOINTURE pour récupérer aussi le prénom de l'auteur du commentaire
    const comments = await pool.query(
      `SELECT c.id, c.contenu, c.cree_le, u.prenom AS auteur
       FROM commentaires c
       JOIN utilisateurs u ON c.utilisateur_id = u.id
       WHERE c.evenement_id = $1
       ORDER BY c.cree_le DESC`,
      [eventId]
    );
    res.status(200).json(comments.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur." });
  }
});


/**
 * @swagger
 * /api/events/{id}/comments:
 *   post:
 *     summary: Ajouter un commentaire à un événement
 *     description: Permet à un utilisateur authentifié d’ajouter un commentaire sur un événement donné.
 *     tags: [Commentaires]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l’événement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contenu
 *             properties:
 *               contenu:
 *                 type: string
 *                 example: "Cet événement a l'air génial, j'ai hâte de participer !"
 *     responses:
 *       201:
 *         description: Commentaire créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 contenu:
 *                   type: string
 *                 cree_le:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Contenu vide
 *       404:
 *         description: Événement non trouvé
 *       401:
 *         description: Non autorisé (token invalide ou absent)
 *       500:
 *         description: Erreur serveur
 */

// POST /api/events/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  const { id: eventId } = req.params;
  const { id: userId } = req.user;
  const { contenu } = req.body;

  try {
    if (!contenu) {
      return res.status(400).json({ message: "Le contenu du commentaire ne peut pas être vide." });
    }

    const newComment = await pool.query(
      `INSERT INTO commentaires (contenu, utilisateur_id, evenement_id)
       VALUES ($1, $2, $3)
       RETURNING id, contenu, cree_le`,
      [contenu, userId, eventId]
    );

    res.status(201).json(newComment.rows[0]);

  } catch (error) {
    // Gère le cas où l'événement n'existe pas (erreur de clé étrangère)
    if (error.code === '23503') {
        return res.status(404).json({ message: "L'événement sur lequel vous essayez de commenter n'existe pas." });
    }
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur lors de l'ajout du commentaire." });
  }
});

module.exports = router;