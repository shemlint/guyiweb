import React from 'react'
import LocalForage from 'localforage'

export const Reload = ({ setReload }) => {
    React.useEffect(() => {
        setTimeout(() => setReload(false), 200)

    })
    return (
        <div style={{
            width: '100vw', height: '100vh', backgroundColor: 'black', color: 'blue',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }} >
            <h1 style={{ fontWeight: 'bolder' }}>Reloading ...</h1>
        </div>
    )

}

global.loadedScripts = []
export const runScripts = (files = global.files) => {
  files.forEach(f => {
    if (global.loadedScripts.includes('js-' + f.name) || global.loadedScripts.includes('css-' + f.name)) {
      console.log('skipped Script/Css ' + f.name + ' already loaded')
      return
    }
    if (f.type.startsWith('text/javascript') && f.url.length && f.run) {
      try {
        //eslint-disable-next-line
        let func = Function(f.url)
        func()
        global.loadedScripts.push('js-' + f.name)
        console.log(`JS ${f.name} Loaded`)
      } catch (e) {
        console.log(`scritp ${f.name} run error ${e.message}`, e)
      }
    }
    if (f.type.startsWith('text/css') && f.url.length && f.run) {
      try {
        let css = f.url, head = document.head, style = document.createElement('style')
        head.appendChild(style)
        style.type = 'text/css'
        style.id = 'css-' + f.name
        if (style.styleSheet) {//IE 8&<
          style.stylesheet.cssText = css
        } else {
          style.appendChild(document.createTextNode(css))
        }
        global.loadedScripts.push('css-' + f.name)
        console.log(`CSS ${f.name} Loaded`)
      } catch (e) {
        console.log(`Css ${f.name} inject error ${e.message}`, e)
      }
    }
  })
}

export const store = {
    set(key, val, cb) {
        try {
            localStorage.setItem(key, val)
        } catch {
            console.warn('store set error ' + key)
        }
        if (cb) {
            cb(val)
        }
    },
    get(key) {
        let res = localStorage.getItem(key)
        if (key === 'showapp') {
            try {
                res = JSON.parse(res)
            } catch { }
            if (typeof res !== 'boolean') {
                return false
            } else {
                return res
            }

        }
        return res
    }

}

export const updateAppStore = async (app) => {
    try {
        let name = app.modules[0][0].name
        let splash = app.files.filter(f => f.name === 'splash')
        await LocalForage.setItem(name, JSON.parse(JSON.stringify(app)))
        await LocalForage.setItem('guyilastapp', name)
        try {
            if (splash[0]) {
                let icon = splash[0].url
                let id = Math.random().toString()
                let pinnedCuts = []
                try {
                    pinnedCuts = JSON.parse(await LocalForage.getItem('shortcutspinned'))
                    if (!Array.isArray(pinnedCuts)) pinnedCuts = []
                } catch (e) {
                    console.info('No shortcut data')
                }
                let cutExists = pinnedCuts.includes(name)
                if (!cutExists) {
                    LocalForage.setItem('shortcutspinned', JSON.stringify([...pinnedCuts, name]))
                }
                switch (global.process.platform) {
                    case 'phone':
                        if (!cutExists) window.Phone.pinShortcut(id, name, icon)
                        break
                    case 'desk':
                        if (!cutExists) window.Desk.pinShortcut(id, name, icon)
                        break
                    case 'neu':
                        if (!cutExists) window.guyi.dispatch('pinshortcut', id, name, icon)
                        break
                    case 'web':
                        let link = window.document.querySelector("link[rel~='icon']")
                        if (!link) {
                            link = window.document.createElement('link')
                            link.rel = 'icon'
                            window.document.getElementsByTagName('head')[0].appendChild(link)
                        }
                        link.href = icon
                        break
                    default:
                        break
                }
                localStorage.setItem('guyisplashscreen', icon)
            }
        } catch (e) {
            console.info('Pinnind shortcut fail,or storage full for splash screen')
        }
    } catch (e) {
        console.info('updateAppStore error', e.message)
    }
}
