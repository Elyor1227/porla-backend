/**
 * JWT Token Utilities
 */

const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES } = require("../config/constants");

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  signToken,
  verifyToken,
};
