/**
 * Response Handler Utilities
 */

const sendToken = (res, user, status = 200, message = "OK") => {
  const { signToken } = require("./jwt");
  return res.status(status).json({
    success: true,
    message,
    token: signToken(user._id),
    user: user.toPublicJSON(),
  });
};

const sendSuccess = (res, data = {}, status = 200, message = "OK") => {
  const response = { success: true, message };
  Object.assign(response, data);
  return res.status(status).json(response);
};

const sendError = (res, message, statusCode = 400, additionalData = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...additionalData,
  });
};

module.exports = {
  sendToken,
  sendSuccess,
  sendError,
};
