/* eslint-env browser */
/* eslint-disable space-before-function-paren */
/* globals Vue, animateCSSGrid */

const gridAnimationDuration = 200

function incrementIntegerString(integerString) {
  const digits = integerString.split('').map(digitString => parseInt(digitString))
  for (var i = digits.length - 1; i >= 0; i--) {
    if (digits[i] === 9) {
      digits[i] = 0
      continue
    }
    digits[i]++
    break
  }
  if (i < 0) digits.unshift(1)
  return digits.join('')
}

Vue.component('counter', {
  props: {
    count: { type: Number, required: false }
  },
  template: `<div class="page__counter" v-cloak>{{count !== null ? count : '?'}}</div>`
})

Vue.component('file-card', {
  props: {
    file: { type: Object, required: true },
    listView: { type: Boolean, required: true }
  },
  methods: {
    async deleteFile() {
      if (this.file.deletingInProgressOrError) return
      Vue.set(this.file, 'deletingInProgressOrError', true)
      const url = new URL(`/api/v1/files/${this.file.attachmentId}/${this.file.name}`, location)
      try {
        const response = await fetch(url, {
          method: 'DELETE',
          body: JSON.stringify({ attachmentId: this.file.attachmentId }),
          headers: new Headers({ 'Content-Type': 'application/json' })
        })
        if ([204, 404].includes(response.status)) {
          this.$root.totalFileCount--
          const indexOfFile = filesApp.files.findIndex(file => file.attachmentId === this.file.attachmentId)
          if (indexOfFile >= 0) Vue.delete(filesApp.files, indexOfFile)
          setTimeout(this.$root.loadMoreFiles, gridAnimationDuration)
        } else {
          Vue.set(this.file, 'name', `ERROR – ${this.file.name}`)
        }
      } catch (e) {
        Vue.set(this.file, 'name', `ERROR – ${this.file.name}`)
      }
    }
  },
  template: `
    <div
      class="card file"
      v-bind:class="{
        'card--positive-state': file.uploadProgress !== undefined && file.uploadProgress !== 1,
        'card--negative-state': file.deletingInProgressOrError
      }"
    ><div>
      <a v-if="!listView" v-bind:href="file.url" target="_blank"><div class="file__preview-box">
        <template v-if="['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(file.mime)">
        <picture>
            <source
              v-bind:srcset="\`\${file.url}?height=256&format=webp 1x, \${file.url}?height=512&format=webp 2x, \${file.url}?height=768&format=webp 3x\`" type="image/webp"
            ><source
              v-bind:srcset="\`\${file.url}?height=256 1x, \${file.url}?height=512 2x, \${file.url}?height=768 3x\`"
            ><img
              class="file__preview file__image-blur"
              v-bind:src="\`\${file.url}?height=256\`"
              v-bind:alt="file.name"
              v-bind:title="file.name"
            >
          </picture>
          <picture>
            <source
              v-bind:srcset="\`\${file.url}?height=256&format=webp 1x, \${file.url}?height=512&format=webp 2x, \${file.url}?height=768&format=webp 3x\`"
              type="image/webp"
            ><source
              v-bind:srcset="\`\${file.url}?height=256 1x, \${file.url}?height=512 2x, \${file.url}?height=768 3x\`"
            ><img
              class="file__preview file__image"
              v-bind:src="\`\${file.url}?height=256\`"
              v-bind:alt="file.name"
              v-bind:title="file.name"
            >
          </picture>
        </template>
        <template v-else-if="file.mime && file.mime.startsWith('audio')">
          <audio class="file__preview file__audio" preload="metadata" controls v-bind:title="file.name">
            <source v-bind:src="file.url">
          </audio>
        </template>
        <template v-else-if="file.mime && file.mime.startsWith('video')">
          <video class="file__preview file__video" preload="metadata" controls v-bind:title="file.name">
            <source v-bind:src="file.url">
          </video>
        </template>
        <template v-else>
          <div class="file__extension" v-bind:title="file.name">{{file.extension || '?'}}</div>
        </template>
      </div></a>
      <div class="file__details">
        <div class="file__details-content">
          <div class="file__name" v-bind:title="file.name">{{file.name}}</div>
          <div class="file__actions" v-if="file.uploadTimestamp">
            <a v-bind:href="file.url" target=”_blank”>
              <svg
                class="file__action-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              ><title>Link</title><path d="M0 0h24v24H0z" fill="none"/>
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
              </svg>
            </a>
            <a href="javascript:void(0)" v-on:click="deleteFile(file)">
              <svg
                class="file__action-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              ><title>Delete</title><path fill="none" d="M0 0h24v24H0V0z"/>
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/>
                <path fill="none" d="M0 0h24v24H0z"/>
              </svg>
            </a>
          </div>
        </div>
        <div
          class="progress-bar" ref="progressBar"
          v-bind:style="{ width: file.uploadProgress !== undefined ? \`\${file.uploadProgress * 100}%\` : '100%' }"
        ></div>
      </div>
    </div></div>
  `
})

Vue.component('upload-card', {
  props: {
    uploadErrorMessage: { type: String, required: false }
  },
  methods: {
    beginUpload() {
      // prepare
      const formData = new FormData(this.$el)
      const request = new XMLHttpRequest()
      const provisionalMessageId = (
        this.$root.files.length ? incrementIntegerString(this.$root.files[0].messageId) : '0'
      )
      let newFile = {
        attachmentId: null,
        messageId: provisionalMessageId,
        channelId: null,
        guildId: null,
        ownerId: null,
        name: this.$refs.uploadInput.files[0].name,
        safeName: null,
        extension: this.extractFileExtension(this.$refs.uploadInput.files[0].name),
        mime: null,
        size: this.$refs.uploadInput.files[0].size,
        width: null,
        height: null,
        url: null,
        uploadTimestamp: null
      }
      this.$refs.uploadInput.value = ''
      // check constraints
      clearTimeout(this.$root.uploadErrorMessageTimeout)
      if (newFile.size > 8000000) {
        this.$root.uploadErrorMessage = 'File size exceeds 8 megabytes'
        this.$root.uploadErrorMessageTimeout = setTimeout(() => {
          this.$root.uploadErrorMessage = null
        }, this.$root.messageDuration)
        return
      } else if (newFile.name.length > 63) {
        this.$root.uploadErrorMessage = 'File name exceeds 63 characters'
        this.$root.uploadErrorMessageTimeout = setTimeout(() => {
          this.$root.uploadErrorMessage = null
        }, this.$root.messageDuration)
        return
      } else {
        this.$root.uploadErrorMessage = null
      }
      // send file
      this.$root.files.unshift(newFile)
      request.open('POST', '/api/v1/users/@me/files')
      request.onloadstart = e => {
        Vue.set(newFile, 'uploadProgress', 0)
      }
      request.onprogress = e => {
        if (e.lengthComputable) Vue.set(newFile, 'uploadProgress', e.loaded / e.total)
      }
      request.onloadend = e => {
        Vue.set(newFile, 'uploadProgress', 1)
      }
      request.onreadystatechange = e => {
        if (request.readyState === 4) {
          switch (request.status) {
            case 201:
              const responseJSON = JSON.parse(request.responseText)
              for (const key in responseJSON) {
                // set actual values except messageId
                // as messageId is also component key and changing that causes complete element rerender
                if (key !== 'messageId') {
                  Vue.set(this.$root.$refs[`fileMessageId${provisionalMessageId}`][0].file, key, responseJSON[key])
                }
              }
              this.$root.totalFileCount++
              break
            case 400:
            case 401:
            case 413:
            case 500:
            default:
              newFile.name = `ERROR – ${newFile.name}`
              Vue.set(
                this.$root.$refs[`fileMessageId${provisionalMessageId}`][0].file, 'deletingInProgressOrError', true
              )
          }
          Vue.set(newFile, 'uploadProgress', 1)
        }
      }
      request.send(formData)
    },
    extractFileExtension(filename) {
      const filenameParts = filename.split('.')
      const fileExtension = filenameParts.length > 1 ? filenameParts[filenameParts.length - 1].toUpperCase() : null
      return fileExtension
    }
  },
  template: `
    <form
      class="card card--full-width upload"
      action="/api/upload-file" method="post" enctype="multipart/form-data"
      v-bind:class="{
        'card--positive-state': !uploadErrorMessage,
        'card--negative-state': uploadErrorMessage
      }"
    ><div>
      <input
        id="upload-file" class="upload__input" type="file" name="file" ref="uploadInput" v-on:change="beginUpload()"
      >
      <label for="upload-file" class="upload__label">{{uploadErrorMessage || 'Upload'}}</label>
    </div></form>
  `
})

Vue.component('status-card', {
  props: {
    totalFileCount: { type: Number, required: false },
    filesToLoadCurrently: { type: Number, required: false },
    loadingInProgress: { type: Boolean, required: true },
    loadingError: { type: Boolean, required: true }
  },
  methods: {
    handleClick() {
      this.$root.loadMoreFiles()
    }
  },
  template: `
    <div
      class="card card--full-width status"
      v-bind:class="{
        'card--positive-state': !loadingError,
        'card--negative-state': loadingError
      }"
      v-bind:style="{ 'cursor': !loadingError && filesToLoadCurrently && !loadingInProgress ? 'pointer' : 'default '}"
      v-on:click="handleClick()"
    ><div class="card--full-width">
      <div class="card__content">
        <template v-if="loadingError">Could not load files</template>
        <template v-else-if="loadingInProgress">Loading {{filesToLoadCurrently === 1 ? 'file' : 'files'}}...</template>
        <template v-else-if="filesToLoadCurrently">
          Load {{filesToLoadCurrently}} more {{filesToLoadCurrently === 1 ? 'file' : 'files'}}
        </template>
        <template v-else-if="totalFileCount">All files loaded</template>
        <template v-else>No files yet</template>
      </div>
      <div class="progress-bar" ref="progressBar"></div>
    </div></div>
  `
})

const filesApp = new Vue({
  el: '#files-app',
  data: {
    filesPortionSize: 12,
    messageDuration: 5000,
    listView: false,
    files: [],
    totalFileCount: null,
    earlierFilesLeft: null,
    oldestFileLoadedTimestamp: null,
    loadingInProgress: false,
    loadingError: false,
    uploadErrorMessage: null,
    uploadErrorMessageTimeout: null
  },
  computed: {
    sortedFiles() {
      return this.files.sort((a, b) => a.messageId < b.messageId)
    },
    filesToLoadCurrently() {
      return (
        this.earlierFilesLeft === null
          ? this.filesPortionSize
          : Math.min(this.filesPortionSize - this.files.length % this.filesPortionSize, this.earlierFilesLeft)
      )
    }
  },
  methods: {
    async loadMoreFiles() {
      if (
        this.loadingError || this.loadingInProgress || (this.earlierFilesLeft !== null && this.earlierFilesLeft <= 0)
      ) return
      this.loadingInProgress = true
      const url = new URL('/api/v1/users/@me/files', location)
      url.searchParams.append('limit', this.filesToLoadCurrently)
      if (this.files.length) url.searchParams.append('before', this.oldestFileLoadedTimestamp)
      try {
        const response = await fetch(url)
        if (response.ok) {
          const responseObject = await response.json()
          this.totalFileCount = responseObject.totalFileCount
          this.earlierFilesLeft = responseObject.earlierFilesLeft
          this.files = this.files.concat(responseObject.files)
          if (this.earlierFilesLeft === 0) {
            this.$refs.statusCard.$refs.progressBar.style.width = '100%'
          } else {
            this.$refs.statusCard.$refs.progressBar.style.width = `
              ${this.files.length / (this.files.length + this.earlierFilesLeft) * 100}%
            `
          }
          if (this.files.length) {
            this.oldestFileLoadedTimestamp = this.files[this.files.length - 1].uploadTimestamp
          }
        } else {
          this.loadingError = true
        }
      } catch (e) {
        this.loadingError = true
        setTimeout(() => {
          this.loadingError = false
        }, this.$root.messageDuration)
      }
      this.loadingInProgress = false
    }
  },
  mounted() {
    animateCSSGrid.wrapGrid(document.querySelector('.cards-grid'), { duration: gridAnimationDuration })
    this.loadMoreFiles()
  }
})
