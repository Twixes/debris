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

const userMenuController = {
  button: document.getElementById('user-button'),
  menu: document.getElementById('user-menu'),
  initialize() {
    if (this.menu) {
      this.positionMenu()
      addEventListener('resize', this.positionMenu)
      addEventListener('keydown', this.hideMenuOnEscDown)
      this.button.addEventListener('click', this.showMenu)
      document.getElementById('switch-theme-button').addEventListener('click', switchTheme)
    }
  },
  positionMenu() {
    userMenuController.menu.style.width = `${userMenuController.button.offsetWidth}px`
    userMenuController.menu.style.left = `${
      userMenuController.button.offsetLeft + userMenuController.button.offsetWidth - userMenuController.menu.offsetWidth
    }px`
  },
  showMenu() {
    const menuHeight = '6rem'
    if (userMenuController.menu.style.height === menuHeight) return // don't do anything if the menu already is open
    clearTimeout(userMenuController.hidingTimeout)
    userMenuController.menu.style.visibility = 'visible'
    userMenuController.menu.style.height = menuHeight
    setTimeout(() => {
      document.body.addEventListener('click', userMenuController.hideMenu)
      document.body.addEventListener('touchend', userMenuController.hideMenu) // iOS Safari doesn't fire click on body
    }, 10)
  },
  hideMenu(e) {
    if (e && e.composedPath().includes(userMenuController.menu)) return // hide only on non-menu click
    userMenuController.menu.style.height = '0'
    document.body.removeEventListener('click', userMenuController.hideMenu)
    document.body.removeEventListener('touchend', userMenuController.hideMenu)
    userMenuController.hidingTimeout = setTimeout(() => {
      userMenuController.menu.style.visibility = 'hidden'
    }, 200)
  },
  hideMenuOnEscDown(e) {
    if (e.keyCode === 27) userMenuController.hideMenu()
  }
}

userMenuController.initialize()
