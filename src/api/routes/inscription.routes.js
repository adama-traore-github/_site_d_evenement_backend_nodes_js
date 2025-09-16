const { Router } = require('express');
const pool = require('../../config/database');
const { protect } = require('../middlewares/auth.middleware');

const router = Router();

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
