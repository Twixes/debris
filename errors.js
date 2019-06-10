/* eslint-disable space-before-function-paren */

/**
 * @typedef {Object} Error an error
 * @property {number} status HTTP status code
 * @property {number} code Debris error code
 * @property {string} message error message
 */

const errors = {}
/**
 * error 40000: mandatory field {fieldName} absent (HTTP status code 400).
 * @param {string} fieldName name of the absent field.
 * @constructs Error error object
 */
errors.Error40000 = function (fieldName) {
  this.status = 400
  this.code = 40000
  this.message = `mandatory field ${fieldName} absent`
}
/**
 * error 40001: field {field} out of constraints ({constraints}) (HTTP status code 400)
 * @param {string} fieldName name of the out of constraints field
 * @param {string} constraints description of field constraints
 * @constructs Error error object
 */
errors.Error40001 = function (fieldName, constraints) {
  this.status = 400
  this.code = 40001
  this.message = `field ${fieldName} out of constraints (${constraints})`
}
/**
 * error 40100: authorization data missing or invalid (HTTP status code 401)
 * @constructs Error error object
 */
errors.Error40100 = function () {
  this.status = 401
  this.code = 40100
  this.message = 'authorization data missing or invalid'
}
/**
 * error 40300: user not permitted (HTTP status code 403)
 * @constructs Error error object
 */
errors.Error40300 = function () {
  this.status = 403
  this.code = 40300
  this.message = 'user not permitted'
}
/**
 * error 40400: endpoint not found (HTTP status code 404)
 * @constructs Error error object
 */
errors.Error40400 = function () {
  this.status = 404
  this.code = 40400
  this.message = 'endpoint not found'
}
/**
 * error 40401: {resourceName} not found (HTTP status code 404)
 * @param {string} resourceName name of the missing resource (e.g. 'file', 'user')
 * @constructs Error error object
 */
errors.Error40401 = function (resourceName) {
  this.status = 404
  this.code = 40401
  this.message = `${resourceName} not found`
}
/**
 * error 40500: method not allowed (HTTP status code 405)
 * @constructs Error error object
 */
errors.Error40500 = function () {
  this.status = 405
  this.code = 40500
  this.message = 'method not allowed'
}
/**
 * error 41300: payload too large (maximum {maximumSize}B) (HTTP status code 413)
 * @param {string|number} maximumSize maximum allowed payload size in bytes
 * @constructs Error error object
 */
errors.Error41300 = function (maximumSize) {
  this.status = 413
  this.code = 41300
  this.message = `payload too large (maximum ${maximumSize}B)`
}
/**
 * error 50000: internal error (HTTP status code 500)
 * @constructs Error error object
 */
errors.Error50000 = function () {
  this.status = 500
  this.code = 50000
  this.message = 'internal error'
}

module.exports = errors
