/* eslint-env browser */
/* eslint-disable space-before-function-paren */

function switchTheme() {
  const lightThemeNew = document.documentElement.className === 'dark-theme'
  document.documentElement.className = lightThemeNew ? 'light-theme' : 'dark-theme'
  fetch('/api/v1/users/@me', {
    method: 'PATCH',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ lightTheme: lightThemeNew })
  })
}

const userMenu = {
  isShown: false,
  height: '6rem',
  element: document.getElementById('user-menu'),
  buttonElement: document.getElementById('user-button'),
  initialize() {
    if (this.element) {
      this.position()
      addEventListener('resize', this.position)
      addEventListener('keydown', this.hide)
      userMenu.buttonElement.addEventListener('click', userMenu.show)
      userMenu.buttonElement.addEventListener('touchend', userMenu.show)
      document.getElementById('switch-theme-button').addEventListener('click', switchTheme)
    }
  },
  position() {
    userMenu.element.style.width = `${userMenu.buttonElement.offsetWidth}px`
    userMenu.element.style.left = `${
      userMenu.buttonElement.offsetLeft + userMenu.buttonElement.offsetWidth - userMenu.element.offsetWidth
    }px`
  },
  toggle() {
    if (userMenu.isShown) userMenu.isShown = false
    else userMenu.isShown = true
  },
  show(e) {
    if (userMenu.isShown) return // if menu already is shown, do nothing
    userMenu.isShown = true
    clearTimeout(userMenu.hidingTimeout)
    userMenu.element.style.visibility = 'visible'
    userMenu.element.style.height = userMenu.height
    setTimeout(() => {
      document.body.addEventListener('click', userMenu.hide)
      document.body.addEventListener('touchend', userMenu.hide)
    }, 10)
  },
  hide(e) {
    if (!userMenu.isShown) return // if menu already is hidden, do nothing
    if (e && e.composedPath().includes(userMenu.element)) return // if event is mouse-based, do nothing on menu click
    if (e && e.keyCode && e.keyCode !== 27) return // if event is keyboard-based, do nothing on non-Esc click
    userMenu.isShown = false
    userMenu.element.style.height = '0'
    document.body.removeEventListener('click', userMenu.hide)
    document.body.removeEventListener('touchend', userMenu.hide)
    userMenu.hidingTimeout = setTimeout(() => {
      userMenu.element.style.visibility = 'hidden'
    }, 200)
  }
}

userMenu.initialize()
