const jwt = require('jsonwebtoken')

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decodedToken.userId };
    console.log('req,user:', req.user);
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = authMiddleware;