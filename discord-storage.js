/* eslint-disable space-before-function-paren */

const discord = require('discord.js')
const chalk = require('chalk')
const Sentry = require('@sentry/node')

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

class DiscordStorage {
  /**
   * @param {string} botToken a Discord bot token
   * @param {Object} [debugOptions={}] debug options
   * @param {boolean} [debugOptions.resetStorageGuild] whether the existing storage guild shall be deleted
   * @param {boolean} [debugOptions.deleteAllFilesOn] whether the existing storage guild shall be deleted
   * @param {boolean} [debugOptions.printStorageGuildInviteURL] whether a storage guild invite URL shall be printed
   */
  constructor(botToken, debugOptions = {}) {
    this.guild = null
    this.botReady = false
    this.client = new discord.Client()
    this.resetStorageGuild = debugOptions.resetStorageGuild
    this.deleteAllFilesOnReady = debugOptions.deleteAllFilesOnReady
    this.printStorageGuildInviteURLOnReady = debugOptions.printStorageGuildInviteURLOnReady
    this.client.on('ready', async () => {
      this.log(`Logged in as user ID ${this.client.user.id}`, 'green')
      this.findStorageGuild()
      if (this.deleteAllFilesOnReady) await this.deleteAllFiles()
      await this.purgeUnwantedGuilds()
      await this.ensureStorageGuildExistence()
      if (this.printStorageGuildInviteURLOnReady) await this.printStorageGuildInviteURL()
      await this.fetchAndApplyApplication()
      this.botReady = true
      this.log()
    })
    // leave any guild not created by the bot itself on join
    this.client.on('guildCreate', async guildCreated => {
      if (guildCreated.owner.id !== this.client.user.id) {
        this.log(`Was added to foreign guild ID ${guildCreated.id}, leaving it...`, 'yellow')
        await guildCreated.leave()
        this.log(`Left foreign guild ID ${guildCreated.id}`, 'green')
      }
    })
    this.log('Launching Discord storage', 'blue')
    this.client.login(botToken)
  }

  /**
   * uploads the provided file to Discord
   * @param {string} ownerId the Discord ID of the user that uploaded the file
   * @param {string} name the file's name
   * @param {Buffer} buffer the file's data
   * @returns {FileDiscordIncomplete} the Discord-incomplete uploaded file object
   */
  async uploadFileToStorageServer(ownerId, name, buffer) {
    if (!this.botReady) {
      this.log(`Tried to use uploadFileToStorageServer() before bot ready`, 'red')
      throw new Error('bot not ready yet')
    }
    const message = await this.guild.channels.first().send(
      `<@${ownerId}>`, { files: [{ attachment: buffer, name: name }] }
    )
    const attachment = message.attachments.first()
    const file = {
      attachmentId: message.attachments.firstKey(),
      messageId: message.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
      ownerId: ownerId,
      name: name,
      safeName: attachment.filename,
      size: attachment.filesize,
      height: attachment.height,
      width: attachment.width,
      uploadTimestamp: message.createdTimestamp
    }
    return file
  }

  /**
   * deletes the specified file from Discord
   * @param {string} channelId the Discord ID of the channel the file was sent in
   * @param {string} messageId the Discord ID of the message the file was sent with
   */
  async deleteFileFromStorageServer(channelId, messageId) {
    if (!this.botReady) {
      this.log(`Tried to use uploadFileToStorageServer() before bot ready`, 'red')
      throw new Error('bot not ready yet')
    }
    const message = await this.guild.channels.get(channelId).fetchMessage(messageId)
    await message.delete()
  }

  log(message, color) {
    console.log(
      `${chalk.bgBlack.white('discord-storage')} ` +
      `${this.botReady ? chalk.bgGreen.black('READY') : chalk.bgBlack.red('NOT READY')}${message ? ' ' : ''}` +
      `${color ? chalk[color](message) : message || ''}`
    )
  }

  findStorageGuild() {
    this.log(`Looking for storage guild...`, 'blue')
    this.guild = this.client.guilds.find(guild => guild.owner.id === this.client.user.id)
    if (this.guild) this.log(`Found storage guild ID ${this.guild.id}`, 'green')
    else this.log(`Storage guild not found ${this.guild.id}`, 'yellow')
  }

  async purgeUnwantedGuilds() {
    this.client.guilds.tap(async guild => {
      if (guild.owner.id !== this.client.user.id) {
        // leave any guild not created by the bot itself
        this.log(`Leaving foreign guild ID ${guild.id}...`, 'yellow')
        await guild.leave()
        this.log(`Left foreign guild ID ${guild.id}`, 'green')
      } else if (this.resetStorageGuild) {
        // optionally delete any guild created by the bot itself (for debug purposes)
        this.log(`Deleting storage guild ID ${guild.id}... (resetStorageGuild set to true)`, 'red')
        await guild.delete()
        this.log(`Deleted storage guild ID ${guild.id}`, 'green')
      }
    })
  }

  async deleteAllFiles() {
    if (this.guild) {
      this.log(`Deleting all files in storage guild ID ${this.guild.id}... (deleteAllFilesOnReady set to true)`, 'red')
      this.guild.channels.tap(async channel => {
        if (channel.type === 'text') {
          const messages = await channel.fetchMessages()
          messages.tap(async message => message.delete())
        }
      })
    } else {
      this.log(`Storage guild not found, cannot delete files (deleteAllFilesOnReady set to true)`, 'yellow')
    }
  }

  async ensureStorageGuildExistence() {
    if (!this.guild || this.resetStorageGuild) {
      // if no existing storage guild was found, create a new one, with one text channel
      this.log(`Creating storage guild...`, 'blue')
      this.guild = await this.client.user.createGuild('Debris Storage')
      this.guild.channels.tap(async channel => {
        if (channel.type === 'category') await channel.delete()
      })
      await this.guild.channels.find(channel => channel.type === 'voice').delete()
      await this.guild.channels.find(channel => channel.type === 'text').setName('storage-0')
      this.log(`Created and set up storage guild ID ${this.guild.id}`, 'green')
    }
  }

  async fetchAndApplyApplication() {
    // keep storage guild details in sync with the API application
    this.log(`Updating storage guild...`, 'blue')
    const application = await this.client.fetchApplication()
    Sentry.configureScope(scope => {
      scope.setUser({
        id: application.owner.id, username: `${application.owner.username}#${application.owner.discriminator}`
      })
    })
    await this.guild.setName(application.name)
    await this.guild.setIcon(application.iconURL)
    this.log(`Updated storage guild`, 'green')
  }

  async printStorageGuildInviteURL() {
    this.log(`Fetching storage guild invite URL... (printStorageGuildInviteURLOnReady set to true)`, 'blue')
    const invite = await this.guild.channels.first().createInvite({ 'maxAge': 0 })
    this.log(`Fetched storage guild invite URL ${invite.url}`, 'green')
  }
}

module.exports = DiscordStorage
