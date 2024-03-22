const {
  AuthenticationError,
  UnAuthRouteAccess,
} = require('./authenticationError');

const {
  ValidationError,
  BadRequestParameter,
  ForbiddenError,
} = require('./validationError');
const { ServerResponseError, ErrorResponse } = require('./serverResponseError');

module.exports = {
  AuthenticationError,
  UnAuthRouteAccess,
  ValidationError,
  BadRequestParameter,
  ForbiddenError,
  ServerResponseError,
  ErrorResponse,
};
