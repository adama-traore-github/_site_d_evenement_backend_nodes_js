const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../config/database');

const router = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Crée un nouvel utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prenom
 *               - nom
 *               - email
 *               - mot_de_passe
 *             properties:
 *               prenom:
 *                 type: string
 *                 description: Prénom de l'utilisateur
 *               nom:
 *                 type: string
 *                 description: Nom de l'utilisateur
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email de l'utilisateur
 *               mot_de_passe:
 *                 type: string
 *                 format: password
 *                 description: Mot de passe de l'utilisateur
 *     responses:
 *       '201':
 *         description: Utilisateur créé avec succès.
 *       '400':
 *         description: Tous les champs sont requis.
 *       '409':
 *         description: Cet email est déjà utilisé.
 *       '500':
 *         description: Erreur du serveur.
 */


router.post('/signup', async (req, res) => {
  try {
    const { prenom, nom, email, mot_de_passe } = req.body;
    if (!email || !mot_de_passe || !prenom || !nom) {
      return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(mot_de_passe, salt);
    const newUser = await pool.query(
      'INSERT INTO utilisateurs (prenom, nom, email, mot_de_passe) VALUES ($1, $2, $3, $4) RETURNING id, email, prenom',
      [prenom, nom, email, hashedPassword]
    );
    res.status(201).json({ message: 'Utilisateur créé.', user: newUser.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Connecte un utilisateur existant
 *     tags: [Authentification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - mot_de_passe
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: L'email de l'utilisateur
 *               mot_de_passe:
 *                 type: string
 *                 format: password
 *                 description: Le mot de passe de l'utilisateur
 *     responses:
 *       '200':
 *         description: Connexion réussie, renvoie un token JWT.
 *       '400':
 *         description: Email ou mot de passe manquant.
 *       '401':
 *         description: Identifiants incorrects.
 *       '500':
 *         description: Erreur du serveur.
 */



router.post('/login', async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;
    if (!email || !mot_de_passe) {
      return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
    }
    const result = await pool.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }
    const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }
    const payload = { id: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Connexion réussie.', token: token });
  } catch (error) {
    res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

module.exports = router;