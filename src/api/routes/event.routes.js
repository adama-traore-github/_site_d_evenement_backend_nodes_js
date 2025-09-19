const { Router } = require('express');
const pool = require('../../config/database');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = Router();


/**
 * @swagger
 * tags:
 *   name: Événements
 *   description: Gestion des événements
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Liste tous les événements
 *     tags: [Événements]
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nom:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date-time
 *                   lieu:
 *                     type: string
 *                   est_gratuit:
 *                     type: boolean
 *                   prix:
 *                     type: number
 *                     format: float
 *                   image_url:
 *                     type: string
 *       500:
 *         description: Erreur serveur
 */

// GET /api/events
router.get('/', async (req, res) => {
  try {
    const allEvents = await pool.query('SELECT id, nom, date, lieu, est_gratuit, prix, image_url FROM evenements ORDER BY date DESC');
    res.status(200).json(allEvents.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur." });
  }
});


/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Récupérer un événement par son ID
 *     tags: [Événements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'événement
 *     responses:
 *       200:
 *         description: Détails de l'événement
 *       404:
 *         description: Événement non trouvé
 *       500:
 *         description: Erreur serveur
 */

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await pool.query('SELECT * FROM evenements WHERE id = $1', [id]);

    if (event.rows.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé." });
    }

    res.status(200).json(event.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur." });
  }
});


/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Créer un nouvel événement
 *     tags: [Événements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - description
 *               - date
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               lieu:
 *                 type: string
 *               est_gratuit:
 *                 type: boolean
 *               prix:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Événement créé
 *       400:
 *         description: Champs obligatoires manquants
 *       500:
 *         description: Erreur serveur
 */

// POST /api/events
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { nom, description, date, lieu, est_gratuit, prix } = req.body;
    const organisateur_id = req.user.id;
    const image_url = req.file ? `/public/uploads/${req.file.filename}` : null;

    if (!nom || !description || !date) {
      return res.status(400).json({ message: "Les champs nom, description et date sont requis." });
    }

    const newEvent = await pool.query(
      `INSERT INTO evenements (nom, description, date, lieu, est_gratuit, prix, organisateur_id, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nom, description, date, lieu, est_gratuit, prix, organisateur_id, image_url]
    );

    res.status(201).json(newEvent.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur lors de la création de l'événement." });
  }
});

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Mettre à jour un événement
 *     tags: [Événements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'événement
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nom:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               lieu:
 *                 type: string
 *               est_gratuit:
 *                 type: boolean
 *               prix:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Événement mis à jour
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Événement non trouvé
 *       500:
 *         description: Erreur serveur
 */

// PUT /api/events/:id
router.put('/:id', protect, upload.single('image'), async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { id: userId } = req.user;

    const eventResult = await pool.query('SELECT organisateur_id FROM evenements WHERE id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé." });
    }
    if (eventResult.rows[0].organisateur_id !== userId) {
      return res.status(403).json({ message: "Action non autorisée. Vous n'êtes pas l'organisateur." });
    }

    const { nom, description, date, lieu, est_gratuit, prix } = req.body;
    const image_url = req.file ? `/public/uploads/${req.file.filename}` : undefined;

    const updatedEvent = await pool.query(
      `UPDATE evenements SET
        nom = COALESCE($1, nom),
        description = COALESCE($2, description),
        date = COALESCE($3, date),
        lieu = COALESCE($4, lieu),
        est_gratuit = COALESCE($5, est_gratuit),
        prix = COALESCE($6, prix),
        image_url = COALESCE($7, image_url),
        mis_a_jour_le = NOW()
       WHERE id = $8 RETURNING *`,
      [nom, description, date, lieu, est_gratuit, prix, image_url, eventId]
    );

    res.status(200).json(updatedEvent.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur lors de la mise à jour." });
  }
});


/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Supprimer un événement
 *     tags: [Événements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de l'événement
 *     responses:
 *       200:
 *         description: Événement supprimé avec succès
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Événement non trouvé
 *       500:
 *         description: Erreur serveur
 */

// DELETE /api/events/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { id: userId } = req.user;

    const eventResult = await pool.query('SELECT organisateur_id FROM evenements WHERE id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: "Événement non trouvé." });
    }
    if (eventResult.rows[0].organisateur_id !== userId) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    await pool.query('DELETE FROM evenements WHERE id = $1', [eventId]);
    res.status(200).json({ message: "Événement supprimé avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur du serveur lors de la suppression." });
  }
});

module.exports = router;