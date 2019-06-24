/* eslint-disable space-before-function-paren */

require('dotenv').config()

const { performance } = require('perf_hooks')
const fetch = require('node-fetch')
const btoa = require('btoa')
const chalk = require('chalk')

/**
 * @typedef {function} Test a test
 * @returns {TestResult} the result of the test
 */

/**
 * @typedef {Object} TestResult a test result
 * @property {TestStatus} status a status code
 * @property {string} message a message
 */

/**
 * an enum of test status codes
 * @enum {number}
 */
const TestStatus = {
  /** the test resulted in a pass */
  PASS: 0,
  /** the test resulted in a pass with a warning */
  WARNING: 1,
  /** the test resulted in an error */
  ERROR: 2,
  /** the test resulted in an error that prevents further testing */
  FATAL_ERROR: 3
}

/**
 * runs the provided test and logs its result
 * @param {Test} test an access token
 * @param {boolean} exitProcess whether process.exit() should be called after the test/**
 * @param {...*} args arguments to be passed to the test
 * @returns {?TestResult} the result of the test
 * @throws {Error} the test returned an unknown status code error
 */
async function runTestAndLog(test, exitProcess, ...args) {
  const start = performance.now()
  const result = await test(...args)
  const end = performance.now()
  const time = ((end - start) / 1000).toFixed(3)
  switch (result.status) {
    case TestStatus.PASS:
      console.log(
        `${chalk.bgGreen.black('PASS')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ` +
        `${chalk.green(result.message)}`
      )
      if (exitProcess) process.exit(0)
      else return result
    case TestStatus.WARNING:
      console.log(
        `${chalk.bgYellow.black('WARN')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ` +
        `${chalk.yellow(result.message)}`
      )
      if (exitProcess) process.exit(0)
      else return result
    case TestStatus.ERROR:
      console.log(
        `${chalk.bgBlack.red('ERR!')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ` +
        `${chalk.red(result.message)}`
      )
      if (exitProcess) process.exit(1)
      else return result
    case TestStatus.FATAL_ERROR:
      console.log(
        `${chalk.bgRed.black('ERR!')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ` +
        `${chalk.red(result.message)}`
      )
      if (exitProcess) process.exit(1)
      else return result
    default:
      throw new Error(`unknown test result status '${result.status}'`)
  }
}

/**
 * a wrapper for tests that handles evaluation
 * @type {Test}
 * @param {Test[]} tests an array of tests to run
 */
async function testAPI(tests) {
  let passCount = 0
  let warningCount = 0
  let errorCount = 0
  for (const test of tests) {
    const result = await runTestAndLog(test)
    if (result.status === TestStatus.PASS) {
      passCount++
    } else if (result.status === TestStatus.WARNING) {
      warningCount++
    } else if (result.status === TestStatus.ERROR) {
      errorCount++
    } else {
      errorCount++
      break
    }
  }
  let message = `passed ${passCount + warningCount}/${tests.length} API tests`
  if (errorCount) {
    return { status: TestStatus.ERROR, message: message }
  } else if (warningCount) {
    return {
      status: TestStatus.WARNING,
      message: message + ` (with ${warningCount} ${warningCount === 1 ? TestStatus.WARNING : 'warnings'})`
    }
  } else {
    return { status: TestStatus.PASS, message: message }
  }
}

/** @type {?string} */
let accessToken = null

/** @const {Test[]} */
const APITests = [
  /**
   * gets an OAuth access token for the bot user and saves it to the global variable `accessToken`
   * @type {Test}
   */
  async function getAccessToken() {
    const response = await fetch(`https://discordapp.com/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${process.env.DEBRIS_CLIENT_ID}:${process.env.DEBRIS_CLIENT_SECRET}`)}`
      },
      body: (
        `grant_type=client_credentials&scope=identify`
      )
    })
    const responseJSON = await response.json()
    if (responseJSON.access_token) {
      accessToken = responseJSON.access_token
      return { status: TestStatus.PASS, message: `access token is ${accessToken}` }
    } else {
      return { status: TestStatus.FATAL_ERROR, message: `Discord API responded with ${JSON.stringify(responseJSON)}` }
    }
  }
]

runTestAndLog(testAPI, true, APITests)
