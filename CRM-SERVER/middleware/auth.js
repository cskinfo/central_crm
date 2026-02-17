// middleware/Auth.js
const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Check for 'Bearer ' prefix and extract the token
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7, authHeader.length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Token format is invalid" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user information to the request object
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = auth; // Corrected export