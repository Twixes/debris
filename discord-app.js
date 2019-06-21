/* eslint-disable space-before-function-paren */

const discord = require('discord.js')
const chalk = require('chalk')
const Sentry = require('@sentry/node')
const client = new discord.Client()

// DEBUG FLAGS

const resetStorageGuild = false // set to true to delete the existing storage guild on login and create a new one
const deleteAllFilesOnReady = false // set to true to delete all files in the storage guild
const printStorageGuildInviteURLOnReady = false // set to true to get an invite to the storage guild

// GLOBALS

var storageGuild = null
var botReady = false

// PRIVATE

class BotNotReadyError extends Error {
  constructor(methodName) {
    super('Discord bot not ready yet')
    Error.captureStackTrace(this, BotNotReadyError)
    log(`Tried to use discordApp.${methodName}() before bot ready`, 'red')
  }
}

function log(message, color) {
  console.log(
    `${chalk.bgBlack.white('discord-app')} ` +
    `${botReady ? chalk.bgGreen.black('READY') : chalk.bgBlack.red('NOT READY')}${message ? ' ' : ''}` +
    `${color ? chalk[color](message) : message || ''}`
  )
}

function findStorageGuild() {
  log(`Looking for storage guild...`, 'blue')
  storageGuild = client.guilds.find(guild => guild.owner.id === client.user.id)
  if (storageGuild) log(`Found storage guild ID ${storageGuild.id}`, 'green')
  else log(`Storage guild not found ${storageGuild.id}`, 'yellow')
}

async function purgeUnwantedGuilds(resetStorageGuild = false) {
  client.guilds.tap(async guild => {
    if (guild.owner.id !== client.user.id) {
      // leave any guild not created by the bot itself
      log(`Leaving foreign guild ID ${guild.id}...`, 'yellow')
      await guild.leave()
      log(`Left foreign guild ID ${guild.id}`, 'green')
    } else if (resetStorageGuild) {
      // optionally delete any guild created by the bot itself (for debug purposes)
      log(`Deleting storage guild ID ${guild.id}... (resetStorageGuild set to true)`, 'red')
      await guild.delete()
      log(`Deleted storage guild ID ${guild.id}`, 'green')
    }
  })
}

async function deleteAllFiles() {
  if (storageGuild) {
    log(`Deleting all files in storage guild ID ${storageGuild.id}... (deleteAllFilesOnReady set to true)`, 'red')
    storageGuild.channels.tap(async channel => {
      if (channel.type === 'text') {
        const messages = await channel.fetchMessages()
        messages.tap(async message => message.delete())
      }
    })
  } else {
    log(`Storage guild not found, cannot delete files (deleteAllFilesOnReady set to true)`, 'yellow')
  }
}

async function ensureStorageGuildExistence(resetStorageGuild = false) {
  if (!storageGuild || resetStorageGuild) {
    // if no existing storage guild was found, create a new one, with one text channel
    log(`Creating storage guild...`, 'blue')
    storageGuild = await client.user.createGuild('Debris Storage')
    storageGuild.channels.tap(async channel => {
      if (channel.type === 'category') await channel.delete()
    })
    await storageGuild.channels.find(channel => channel.type === 'voice').delete()
    await storageGuild.channels.find(channel => channel.type === 'text').setName('storage-0')
    log(`Created and set up storage guild ID ${storageGuild.id}`, 'green')
  }
}

async function fetchAndApplyApplication() {
  // keep storage guild details in sync with the API application
  log(`Updating storage guild...`, 'blue')
  const application = await client.fetchApplication()
  Sentry.configureScope(scope => {
    scope.setUser({
      id: application.owner.id, username: `${application.owner.username}#${application.owner.discriminator}`
    })
  })
  storageGuild.setName(application.name)
  storageGuild.setIcon(application.iconURL)
  log(`Updated storage guild`, 'green')
}

async function printStorageGuildInviteURL() {
  log(`Fetching storage guild invite URL... (printStorageGuildInviteURLOnReady set to true)`, 'blue')
  const invite = await storageGuild.channels.first().createInvite({ 'maxAge': 0 })
  log(`Fetched storage guild invite URL ${invite.url}`, 'green')
}

client.on('ready', async () => {
  log(`Logged in as user ID ${client.user.id}`, 'green')
  findStorageGuild()
  if (deleteAllFilesOnReady) await deleteAllFiles()
  await purgeUnwantedGuilds(resetStorageGuild)
  await ensureStorageGuildExistence(resetStorageGuild)
  if (printStorageGuildInviteURLOnReady) await printStorageGuildInviteURL()
  await fetchAndApplyApplication()
  botReady = true
  log()
})

client.on('guildCreate', async guild => {
  // leave any guild not created by the bot itself on join
  if (guild.owner.id !== client.user.id) {
    log(`Was added to foreign guild ID ${guild.id}, leaving it...`, 'yellow')
    await guild.leave()
    log(`Left foreign guild ID ${guild.id}`, 'green')
  }
})

client.login(process.env.DEBRIS_BOT_TOKEN)

// PUBLIC

/**
 * a Discord-incomplete file
 * @typedef {Object} FileDiscordIncomplete
 * @property {string} attachmentId
 * @property {string} messageId
 * @property {string} channelId
 * @property {string} guildId
 * @property {string} ownerId
 * @property {string} name
 * @property {string} safeName
 * @property {number} size
 * @property {number} [height]
 * @property {number} [width]
 * @property {string} uploadTimestamp
 */

const discordApp = {
  /**
   * uploads the provided file to Discord
   * @param {string|number} ownerId the Discord ID of the user that uploaded the file
   * @param {string} name the file's name
   * @returns {FileDiscordIncomplete} the Discord-incomplete uploaded file object
   */
  async uploadFileToStorageServer(ownerId, name, buffer) {
    if (!botReady) throw new BotNotReadyError('uploadFileToStorageServer')
    const message = await storageGuild.channels.first().send(
      `<@${ownerId}>`, { files: [{ attachment: buffer, name: name }] }
    )
    const attachment = message.attachments.first()
    const file = {
      attachmentId: message.attachments.firstKey(),
      messageId: message.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
      ownerId: String(ownerId),
      name: name,
      safeName: attachment.filename,
      size: attachment.filesize,
      height: attachment.height,
      width: attachment.width,
      uploadTimestamp: message.createdTimestamp
    }
    return file
  },

  /**
   * deletes the specified file from Discord
   * @param {string} channelId the Discord ID of the channel the file was sent in
   * @param {string} messageId the Discord ID of the message the file was sent with
   */
  async deleteFileFromStorageServer(channelId, messageId) {
    if (!botReady) throw new BotNotReadyError('deleteFileFromStorageServer')
    const message = await storageGuild.channels.get(channelId).fetchMessage(messageId)
    await message.delete()
  }
}

module.exports = discordApp
