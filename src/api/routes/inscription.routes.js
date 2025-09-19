const { Router } = require('express');
const pool = require('../../config/database');
const { protect } = require('../middlewares/auth.middleware');

const router = Router();

/**
 * @swagger
 * /api/events/{id}/inscriptions:
 *   post:
 *     summary: Inscrire un utilisateur à un événement
 *     description: >
 *       Permet à un utilisateur authentifié de s'inscrire à un événement gratuit.  
 *       Si l'événement est payant, l'inscription directe est bloquée (code 402).
 *     tags: [Inscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de l'événement
 *     responses:
 *       201:
 *         description: Inscription réussie
 *         content:
 *           application/json:
 *             example:
 *               message: "Inscription finalisée avec succès !"
 *       402:
 *         description: L'événement est payant, inscription directe bloquée
 *         content:
 *           application/json:
 *             example:
 *               message: "Cet événement est payant. Veuillez d'abord effectuer le paiement."
 *       404:
 *         description: Événement non trouvé
 *         content:
 *           application/json:
 *             example:
 *               message: "Événement non trouvé."
 *       409:
 *         description: Conflit, utilisateur déjà inscrit
 *         content:
 *           application/json:
 *             example:
 *               message: "Vous êtes déjà inscrit à cet événement."
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             example:
 *               message: "Erreur du serveur lors de l'inscription."
 */


// POST /api/events/:id/inscriptions
router.post('/:id/inscriptions', protect, async (req, res) => {
  const { id: eventId } = req.params;
  const { id: userId } = req.user;

  try {
    // Vérifier si l'événement existe et récupérer sa gratuité
    const eventResult = await pool.query(
      'SELECT id, est_gratuit, prix FROM evenements WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé." });
    }

    const event = eventResult.rows[0];

    // Si l'événement est payant -> on bloque l'inscription directe
    if (!event.est_gratuit) {
      return res.status(402).json({
        message: "Cet événement est payant. Veuillez d'abord effectuer le paiement."
      });
    }

    // Vérifier si déjà inscrit
    const existingInscription = await pool.query(
      'SELECT * FROM inscriptions WHERE utilisateur_id = $1 AND evenement_id = $2',
      [userId, eventId]
    );

    if (existingInscription.rows.length > 0) {
      return res.status(409).json({ message: "Vous êtes déjà inscrit à cet événement." });
    }

    // Ajouter l'inscription
    await pool.query(
      'INSERT INTO inscriptions (utilisateur_id, evenement_id) VALUES ($1, $2)',
      [userId, eventId]
    );

    res.status(201).json({ message: "Inscription finalisée avec succès !" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur lors de l'inscription." });
  }
});

module.exports = router;
