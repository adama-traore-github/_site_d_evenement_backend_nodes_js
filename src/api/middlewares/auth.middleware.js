const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

     
      req.user = decoded;

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Non autorisé, le token a échoué.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Non autorisé, pas de token.' });
  }
};

module.exports = { protect };