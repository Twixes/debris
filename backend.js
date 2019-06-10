/* eslint-disable space-before-function-paren */

const mysql = require('mysql')
const fetch = require('node-fetch')
const fileType = require('file-type')
const MetroHash64 = require('metrohash').MetroHash64
const errors = require('./errors')
const discordApp = require('./discord-app')

// SQL SETUP

const SQLConnection = mysql.createConnection({
  host: process.env.DEBRIS_MYSQL_HOST || 'localhost',
  port: process.env.DEBRIS_MYSQL_PORT || 3306,
  user: process.env.DEBRIS_MYSQL_USER,
  password: process.env.DEBRIS_MYSQL_PASSWORD,
  database: process.env.DEBRIS_MYSQL_DATABASE || 'debris',
  charset: 'utf8mb4'
})

SQLConnection.connect((err) => { if (err) throw err })
SQLConnection.query(
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(24) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    lightTheme BOOL NOT NULL DEFAULT FALSE,
    filesListView BOOL NOT NULL DEFAULT FALSE,
    firstLoginTimestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  )`,
  err => { if (err) throw err }
)
SQLConnection.query(
  `CREATE TABLE IF NOT EXISTS accesses (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    hash CHAR(16) CHARACTER SET ascii NOT NULL,
    ip VARCHAR(39) CHARACTER SET ascii NOT NULL,
    userAgent VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    userId VARCHAR(22) CHARACTER SET ascii,
    username VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    discriminator CHAR(4) CHARACTER SET ascii,
    timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (userId) REFERENCES users(id)
  )`,
  err => { if (err) throw err }
)
SQLConnection.query(
  `CREATE TABLE IF NOT EXISTS files (
    attachmentId VARCHAR(22) CHARACTER SET ascii NOT NULL PRIMARY KEY,
    messageId VARCHAR(22) CHARACTER SET ascii NOT NULL UNIQUE KEY,
    channelId VARCHAR(22) CHARACTER SET ascii NOT NULL,
    guildId VARCHAR(22) CHARACTER SET ascii NOT NULL,
    ownerId VARCHAR(22) CHARACTER SET ascii NOT NULL,
    safeName VARCHAR(255) CHARACTER SET ascii NOT NULL,
    name VARCHAR(63) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    extension VARCHAR(63) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    mime VARCHAR(63) CHARACTER SET ascii,
    size MEDIUMINT UNSIGNED NOT NULL,
    height SMALLINT UNSIGNED,
    width SMALLINT UNSIGNED,
    uploadTimestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (ownerId) REFERENCES users(id)
  )`,
  err => { if (err) throw err }
)

// PUBLIC

/**
 * @typedef {Object} User a user
 * @property {string} id the user's Discord ID
 * @property {string} username the user's current Discord username
 * @property {string} discriminator the user's current Discord discriminator
 * @property {string} [avatar] the user's current Discord avatar ID
 * @property {boolean} lightTheme whether the user has switched the theme to light instead of dark
 * @property {boolean} filesListView whether the user has switched the files view to list instead of grid
 * @property {string} firstLoginTimestamp the user's first Debris login timestamp in ISO format
 */

/**
 * @typedef {Object} UserDiscordIncomplete a Discord-incomplete user
 * @property {string} id the user's Discord ID
 * @property {string} username the user's current Discord username
 * @property {string} discriminator the user's current Discord discriminator
 * @property {string} [avatar] the user's current Discord avatar ID
 */

/**
 * @typedef {Object} UserDebrisIncomplete a Debris-incomplete user
 * @property {boolean} lightTheme whether the user has switched the theme to light instead of dark
 * @property {boolean} filesListView whether the user has switched the files view to list instead of grid
 * @property {string} firstLoginTimestamp the user's first Debris login timestamp in ISO format
 */

/**
 * @typedef {Object} File a file
 * @property {string} attachmentId the Discord ID of the attachment the file was sent as
 * @property {string} messageId the Discord ID of the message the file was sent with
 * @property {string} channelId the Discord ID of the channel the file was sent in
 * @property {string} guildId the Discord ID of the guild the file was sent in
 * @property {string} ownerId the Discord ID of the user that uploaded the file
 * @property {string} name the file's name (no longer than 63 characters)
 * @property {string} safeName the file's original name as converted by Discord for safety
 * @property {string} [extension] the file's extension
 * @property {string} [mime] the file's MIME type
 * @property {number} size the file's size in bytes (no larger than 8 000 000)
 * @property {number} [height] the image's width (if the file is an image)
 * @property {number} [width] the image's height (if the file is an image)
 * @property {string} url the file's URL
 * @property {string} uploadTimestamp the file's upload timestamp in ISO format
 */

const backend = {
  /**
   * authorizes a user with the access token included in the request
   * @param {string} req Express `req`
   * @returns {?User} a user
   */
  async authorize(req) {
    const accessToken = this.extractAccessToken(req)
    let user = null
    if (accessToken) {
      user = await this.fetchDiscordUser(accessToken)
      if (user) {
        const localUser = await this.getDebrisUser(user.id)
        user.lightTheme = localUser.lightTheme
        user.filesListView = localUser.filesListView
        user.firstLoginTimestamp = localUser.firstLoginTimestamp
      }
    }
    await this.registerAccess(req.ip, req.get('user-agent'), user)
    return user
  },

  /**
   * extracts the access token from an Express `req` object
   *
   * at first tries the Authorization header, then the request body, then cookies
   * @param {Object} req an Express `req`
   * @returns {?string} an access token
   */
  extractAccessToken(req) {
    const authorizationHeader = req.get('authorization')
    if (authorizationHeader && authorizationHeader.trim().startsWith('Bearer ')) {
      const accessTokenCandidate = authorizationHeader.split('Bearer ')[1].trim()
      if (accessTokenCandidate !== '') return accessTokenCandidate
    }
    if (req.method === 'GET' && req.query && req.query.accessToken) {
      return req.query.accessToken
    }
    if (req.body && req.body.accessToken) {
      return req.body.accessToken
    }
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken
    }
    return null
  },

  /**
   * fetches the user associated with the provided access token from Discord
   * @param {string} accessToken an access token
   * @returns {?UserDiscordIncomplete} a Discord-incomplete user
   */
  async fetchDiscordUser(accessToken) {
    let user = null
    const response = await fetch('https://discordapp.com/api/users/@me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const responseJSON = await response.json()
    if (responseJSON.id) {
      user = {
        id: responseJSON.id,
        username: responseJSON.username,
        discriminator: responseJSON.discriminator,
        avatar: responseJSON.avatar
      }
    }
    return user
  },

  /**
   * gets the user with the provided Discord ID from the Debris database
   * @param {string} userId a Discord user ID
   * @returns {UserDebrisIncomplete} a Debris-incomplete user
   */
  async getDebrisUser(userId) {
    // ensure user registration
    await SQLConnection.query(
      'INSERT IGNORE INTO users (id) VALUES (?)',
      userId
    )
    const localUserRows = await new Promise((resolve, reject) => {
      SQLConnection.query(
        'SELECT * FROM users WHERE id = ?',
        userId,
        (err, result) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
    })
    return !localUserRows.length ? null : {
      lightTheme: Boolean(localUserRows[0].lightTheme),
      filesListView: Boolean(localUserRows[0].filesListView),
      firstLoginTimestamp: localUserRows[0].firstLoginTimestamp
    }
  },

  /**
   * registers access if recently unique
   * @param {string} ip access IP
   * @param {string} [userAgent] access user agent
   * @param {User} [user] accessing user
   */
  async registerAccess(ip, userAgent, user) {
    // only log access if circumstances have changed since the last time (or if there was no last time)
    const hashObject = new MetroHash64()
    hashObject.update(ip)
    if (userAgent) hashObject.update(userAgent)
    if (user) hashObject.update(user.id).update(user.username).update(user.discriminator)
    const hash = hashObject.digest()
    if (await backend.isAccessRecentlyUnique(hash)) {
      await SQLConnection.query(
        'INSERT INTO accesses (hash, ip, userAgent, userId, username, discriminator) VALUES (?, ?, ?, ?, ?, ?)',
        [hash, ip, userAgent, ...(user ? [user.id, user.username, user.discriminator] : [null, null, null])]
      )
    }
  },

  /**
   * modifies the provided user
   * @param {User} user the user to modify
   * @param {Object} patch a user patch
   * @param {boolean} [patch.lightTheme] new `lightTheme` value
   * @param {boolean} [patch.filesListView] new `filesListView` value
   * @returns {User} the provided user after modification
   */
  async modifyUser(user, patch) {
    if (patch.lightTheme !== undefined || patch.filesListView !== undefined) {
      const values = []
      const queryParts = []
      if (patch.lightTheme !== undefined) {
        values.push(Boolean(patch.lightTheme))
        queryParts.push('lightTheme = ?')
        user.lightTheme = patch.lightTheme
      }
      if (patch.filesListView !== undefined) {
        values.push(Boolean(patch.filesListView))
        queryParts.push('filesListView = ?')
        user.filesListView = patch.filesListView
      }
      await SQLConnection.query(
        `UPDATE users SET ${queryParts.join(' ')} WHERE id = ?`,
        [...values, user.id],
        (err, result) => { if (err) throw err }
      )
    }
    return user
  },

  /**
   * checks whether an identical access has been logged within the last 5 minutes
   * @param {string} hash an access hash
   * @returns {boolean} whether the access is recently unique
   */
  async isAccessRecentlyUnique(hash) {
    const accessRows = await new Promise((resolve, reject) => {
      SQLConnection.query(
        'SELECT * FROM accesses WHERE hash = ? AND timestamp >= NOW() - INTERVAL 5 MINUTE',
        hash,
        (err, result) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
    })
    return !accessRows.length
  },

  /**
   * gets a file by its attachment ID
   * @param {string} attachmentId the Discord ID of the attachment the file was sent as
   * @param {string} name the file's name
   * @param {string} requestingUserId the requesting user's Discord ID
   * @returns {?(File|Error)} the file with the provided attachment ID or an error
   */
  async getFile(attachmentId, name, requestingUserId) {
    const fileRows = await new Promise((resolve, reject) => {
      SQLConnection.query(
        'SELECT * FROM files WHERE attachmentId = ?',
        attachmentId,
        (err, result) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
    })
    if (fileRows.length) {
      const file = {
        attachmentId: fileRows[0].attachmentId,
        messageId: fileRows[0].messageId,
        channelId: fileRows[0].channelId,
        guildId: fileRows[0].guildId,
        ownerId: fileRows[0].ownerId,
        name: fileRows[0].name,
        safeName: fileRows[0].safeName,
        extension: fileRows[0].extension,
        mime: fileRows[0].mime,
        size: fileRows[0].size,
        width: fileRows[0].width,
        height: fileRows[0].height,
        url: this.generateFileURL(fileRows[0]),
        uploadTimestamp: fileRows[0].uploadTimestamp
      }
      if (!name || file.name === name) {
        if (!requestingUserId || requestingUserId === file.ownerId) return file
        else return new errors.Error40300()
      } else {
        return new errors.Error40401('file')
      }
    } else {
      return null
    }
  },

  /**
   * gets files uploaded by the specified user and fulfilling provided conditions
   * @param {string} userId a Discord user ID
   * @param {string} [limit] inclusive maximum number of files to retrieve
   * @param {string} [before] exclusive maximum file upload timestamp in ISO format
   * @param {string} [after] exclusive minimum file upload timestamp in ISO format
   * @returns {File[]} an array of matching files
   */
  async getUserFiles(userId, limit, before, after) {
    const queryValues = [userId]
    if (before) queryValues.push(before)
    if (after) queryValues.push(after)
    if (limit >= 0) queryValues.push(limit)
    const fileRows = await new Promise((resolve, reject) => {
      SQLConnection.query(
        `SELECT * FROM files WHERE ownerId = ?${before ? ' AND uploadTimestamp < ?' : ''}
        ${after ? ' AND uploadTimestamp > ?' : ''} ORDER BY uploadTimestamp${limit >= 0 ? ' DESC LIMIT ?' : ''}`,
        queryValues,
        (err, result) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
    })
    const files = []
    for (let i = 0; i < fileRows.length; i++) {
      files.push({
        attachmentId: fileRows[i].attachmentId,
        messageId: fileRows[i].messageId,
        channelId: fileRows[i].channelId,
        guildId: fileRows[i].guildId,
        ownerId: fileRows[i].ownerId,
        name: fileRows[i].name,
        safeName: fileRows[i].safeName,
        extension: fileRows[i].extension,
        mime: fileRows[i].mime,
        size: fileRows[i].size,
        width: fileRows[i].width,
        height: fileRows[i].height,
        url: this.generateFileURL(fileRows[i]),
        uploadTimestamp: fileRows[i].uploadTimestamp
      })
    }
    return files
  },

  /**
   * gets the number of files uploaded by the specified user and fulfilling provided conditions
   * @param {string} userId a Discord user ID
   * @param {string} [before] exclusive maximum file upload timestamp in ISO format
   * @param {string} [after] exclusive minimum file upload timestamp in ISO format
   * @returns {number} the number of matching files
   */
  async getUserFileCount(userId, before, after) {
    const queryValues = [userId]
    if (before) queryValues.push(before)
    if (after) queryValues.push(after)
    const fileCountRows = await new Promise((resolve, reject) => {
      SQLConnection.query(
        `SELECT COUNT(*) AS fileCount FROM files WHERE ownerId = ?
        ${before ? ' AND uploadTimestamp < ?' : ''}${after ? ' AND uploadTimestamp > ?' : ''}`,
        queryValues,
        (err, result) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
    })
    return fileCountRows[0].fileCount
  },

  /**
   * generates a file URL
   * @param {File} file a file
   * @param {boolean} [includeBase=false] whether to include the protocol and domain in the URL
   * @returns {string} the generated URL
   */
  generateFileURL(file, includeBase = false) {
    const path = `/files/${file.attachmentId}/${encodeURIComponent(file.name)}`
    if (includeBase) {
      if (!process.env.DEBRIS_FQDN) throw new Error('env variable DEBRIS_FQDN has not been set')
      return (
        `${process.env.DEBRIS_PROTOCOL ? process.env.DEBRIS_PROTOCOL.toLowerCase() : 'http'}://` +
        `${process.env.DEBRIS_FQDN}${path}`
      )
    } else {
      return path
    }
  },

  /**
   * extracts the extension from a filename
   * @param {string} filename a filename
   * @returns {?string} the extracted extension
   */
  extractFileExtension(filename) {
    const filenameParts = filename.split('.')
    const fileExtension = filenameParts.length > 1 ? filenameParts[filenameParts.length - 1].toUpperCase() : null
    return fileExtension
  },

  /**
   * saves a file with Discord
   * @param {string} ownerId the Discord ID of the user that uploaded the file
   * @param {string} name the file's name (no longer than 63 characters)
   * @param {Buffer} buffer the file's data
   * @returns {File} the saved file
   */
  async saveFile(ownerId, name, buffer) {
    const type = fileType(buffer)
    const file = await discordApp.uploadFileToStorageServer(ownerId, name, buffer)
    file.extension = this.extractFileExtension(name)
    file.mime = type ? type.mime : null
    file.url = this.generateFileURL(file)
    await SQLConnection.query(
      `INSERT INTO files (
        attachmentId, messageId, channelId, guildId, ownerId, safeName, name, extension, mime, size, height, width, uploadTimestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(? / 1000))`, [
        file.attachmentId, file.messageId, file.channelId, file.guildId, ownerId, file.safeName, name,
        file.extension, file.mime, file.size, file.height, file.width, file.uploadTimestamp
      ]
    )
    return file
  },

  /**
   * modifies the provided file
   * @param {string} attachmentId the Discord ID of the attachment the file was sent as
   * @param {string} name the file's name
   * @param {string} requestingUserId the requesting user's Discord ID
   * @param {boolean} [patch.name] new `name` value (no longer than 63 characters)
   * @returns {File|Error} the provided user after modification or an error
   */
  async modifyFile(attachmentId, name, requestingUserId, patch) {
    const file = await this.getFile(attachmentId)
    if (file && file.name === name) {
      if (requestingUserId === file.ownerId) {
        if (patch.name !== undefined) {
          file.lightTheme = patch.lightTheme
          await SQLConnection.query(
            `UPDATE files SET name = ? WHERE attachmentId = ?`,
            [file.name, file.attachmentId],
            (err, result) => { if (err) throw err }
          )
        }
        return file
      } else {
        return new errors.Error40300()
      }
    } else {
      return new errors.Error40401('file')
    }
  },

  /**
   * deletes a file with Discord
   * @param {string} attachmentId the Discord ID of the attachment the file was sent as
   * @param {string} name the file's name
   * @param {string} requestingUserId the requesting user's Discord ID
   * @returns {?Error} an error
   */
  async deleteFile(attachmentId, name, requestingUserId) {
    const file = await this.getFile(attachmentId)
    if (file && file.name === name) {
      if (requestingUserId === file.ownerId) {
        await discordApp.deleteFileFromStorageServer(file.channelId, file.messageId)
        await SQLConnection.query(
          'DELETE FROM files WHERE attachmentId = ?',
          file.attachmentId
        )
        return null
      } else {
        return new errors.Error40300()
      }
    } else {
      return new errors.Error40401('file')
    }
  }
}

module.exports = backend
