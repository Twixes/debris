/* eslint-disable space-before-function-paren */

require('dotenv').config()

const { performance } = require('perf_hooks')
const fetch = require('node-fetch')
const btoa = require('btoa')
const chalk = require('chalk')

async function runTestAndLog(test, exitProcess) {
  const start = performance.now()
  const result = await test()
  const end = performance.now()
  const time = ((end - start) / 1000).toFixed(3)
  switch (result.status) {
    case 'success':
      console.log(`${chalk.bgGreen.black('PASS')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ${chalk.green(result.message)}`)
      if (exitProcess) process.exit(0)
      else return result
    case 'warning':
      console.log(`${chalk.bgYellow.black('WARN')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ${chalk.yellow(result.message)}`)
      if (exitProcess) process.exit(0)
      else return result
    case 'error':
      console.log(`${chalk.bgBlack.red('ERR!')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ${chalk.red(result.message)}`)
      if (exitProcess) process.exit(1)
      else return result
    case 'criticalError':
      console.log(`${chalk.bgRed.black('ERR!')} ${chalk.bgWhite.black(`${time}s`)} ${chalk.bgBlack.white(test.name)} ${chalk.red(result.message)}`)
      if (exitProcess) process.exit(1)
      else return result
    default:
      throw new Error(`unknown test result status '${result.status}'`)
  }
}

let accessToken = null

const tests = [
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
      return { status: 'success', message: `access token is ${accessToken}` }
    } else {
      return { status: 'criticalError', message: `Discord API responded with ${JSON.stringify(responseJSON)}` }
    }
  }
]

async function runAPITests() {
  let successCount = 0
  let warningCount = 0
  let errorCount = 0
  for (const test of tests) {
    const result = await runTestAndLog(test)
    if (result.status === 'criticalError') break
    else if (result.status === 'warning') warningCount++
    else if (result.status === 'success') successCount++
    else if (result.status === 'error' || result.status === 'criticalError') errorCount++
  }
  let message = `passed ${successCount + warningCount}/${tests.length} API tests`
  if (errorCount) {
    return { status: 'error', message: message }
  } else if (warningCount) {
    return {
      status: 'warning', message: message + ` (with ${warningCount} ${warningCount === 1 ? 'warning' : 'warnings'})`
    }
  } else {
    return { status: 'success', message: message }
  }
}

runTestAndLog(runAPITests, true)
