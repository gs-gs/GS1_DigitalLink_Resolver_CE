/* eslint-disable no-useless-constructor */
// eslint-disable-next-line max-classes-per-file
const CustomErrorBaseClass = require('./customErrorBaseClass');

class ValidationError extends CustomErrorBaseClass {
  constructor(message) {
    super(message);
  }
}

class BadRequestParameter extends ValidationError {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.cause = 'BadRequestParams (Bad Request Parameters)';
  }
}

class ForbiddenError extends ValidationError {
  constructor(message) {
    super(message);
    this.statusCode = 403;
    this.cause = 'ForbiddenError (Forbidden Error)';
  }
}

module.exports = {
  ValidationError,
  BadRequestParameter,
  ForbiddenError,
};
