import React, { useState } from 'react'
import * as THREE from 'three'
import LocalForage from 'localforage'
import Comp from './Comp'
import { css, keyframes, injectGlobal, cx } from '@emotion/css'
import htm from 'htm'
import { updateAppStore, Reload, store, runScripts } from './AppUtils'
import AppSelect from './AppSelect'

global.React = React
global.THREE = THREE
global.html = htm.bind(React.createElement)
global.css = css
global.keyframes = keyframes
global.cx = cx
global.injectGlobal = injectGlobal



let wsRef = null
let loadedShortcut = false

const App = () => {
  const [loaded, setLoaded] = useState(false)
  const [app, setApp] = useState([])
  const [minimal, setMinimal] = useState(true)
  const [reload, setReload] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [buttonPosition, setButtonPosition] = useState('right')
  const [showChange, setShowChange] = useState(false)
  const [showApp, setShowApp] = useState(false)

  let mutApp = [...app]

  React.useEffect(() => {
    window.__GUYI__ = '1.0.0'
    const sendDone = () => {
      try {
        switch (global.process.platform) {
          case 'phone':
            window.Phone.appLoadDone()
            break
          case 'desk':
            window.Desk.appLoadDone()
            break
          case 'neu':
            window.guyi.dispatch('apploaddone')
            break
          case 'web':
            console.info('web does not support load done')
            break
          default:
            console.info('platform not supported')
            break
        }
      } catch (e) {
        console.info(e.message)
      }
    }
    window.addEventListener('message', (e) => {
      let data = e.data
      if (typeof data === 'string') {
        if (data.startsWith('minimal=')) {
          let val = data.split('minimal=')[1]
          setMinimal(val === 'true')
          console.log('minimal status changed', val === 'true')
          return
        }
        if (data.startsWith('reload=')) {
          let val = data.split('reload=')[1]
          setReload(val === 'true')
          console.log('reload status changed', val === 'true')
          return
        }
        if (data.startsWith('buttonposition=')) {
          let val = data.split('buttonposition=')[1]
          setButtonPosition(val === 'left' ? 'left' : 'right')
          console.log('Button position changed', val === 'left' ? 'left' : 'right')
          return
        }
        if (data.startsWith('startapp,')) {
          const start = async () => {
            let val = data.split('startapp,')[1]
            let got = await restoreApp(val)
            if (got) {
              setMinimal(true)
              store.set('showapp', false, setShowApp)
              loadedShortcut = true
            }
          }
          start()
        }
        try {
          data = JSON.parse(data)
          if (Array.isArray(data.modules)) {
            console.log('Got app loading it ...')
            startApp(data)
          }
        } catch (e) {
          console.log('Message not json')
        }
      }
    })
    loadApp()
    sendDone()
    let splashImg = document.getElementById('--guyisplashscreen--')
    if (splashImg) {
      splashImg.parentElement.removeChild(splashImg)
    }
    //eslint-disable-next-line
  }, [])

  const open = async (e) => {
    try {
      let f = e.target.files
      f = f[0]
      let data = await f.text()
      data = JSON.parse(data)
      startApp(data)
    } catch (e) {
      console.log(e.message)
    }

  }
  const loadApp = async () => {
    try {
      setPlatform()
      let body = {}
      if (global.Phone) {
        /**@type {String}  */
        let res = global.Phone.openApp()
        body = JSON.parse(res)
      } else if (global.Neutralino) {
        try {
          let res = await global.Neutralino.filesystem.readFile('./app.guyi')
          body = JSON.parse(res)
        } catch (e) {
          console.log('GuyiDesktop in runner mode')
        }
      } else {
        let res = await fetch('app.guyi')
        body = await res.json()
      }
      if (!Array.isArray(body.modules)) {
        throw new Error('App corrupted')
      }
      startApp(body)
      //setReload(true)
    } catch (e) {
      console.log('Network/parse error', e.message)
      setLoadFailed(true)
      setMinimal(false)
    }
  }
  const startApp = (data) => {
    updateAppStore(data)
    global.appData = {}
    global.modules = data.modules
    global.remodules = data.remodules || []
    global.files = data.files || []
    runScripts(global.files)
    setApp(global.modules[0])
    setLoaded(true)
  }
  const restoreApp = async (appName = null) => {
    let data = ''
    let success = false
    if (loadedShortcut && !appName) return false
    try {
      let name = appName ? appName : await LocalForage.getItem('guyilastapp')
      data = await LocalForage.getItem(name)
    } catch (e) {
      console.log('Load error', e.message)
      data = null
    }
    if (loadedShortcut) return false
    if (data && Array.isArray(data.modules)) {
      startApp(data)
      success = true
    }
    setLoadFailed(false)
    return success
  }
  if (loadFailed) {
    restoreApp()
  }
  const setPlatform = () => {
    global.process = {}
    global.process.os = global.guyi_os
    if (global.Phone) {
      global.process.platform = "phone"
    } else if (global.Neutralino) {
      global.process.platform = 'desk'
    } else {
      global.process.platform = "web"
      global.process.os = "web"
    }
  }
  setPlatform()

  let appComp = <div>Load Error</div>
  try {
    appComp = <Comp key={app[0].name} tree={mutApp} id={app[1].id} />
  } catch (e) { console.log('App eror', e.message) }
  const LoadArea = () => {
    const [url, _setUrl] = useState(localStorage.getItem('lastsaveaddr') || 'ws://localhost:8080')
    const [info, setInfo] = useState('')
    const setUrl = (url) => {
      try {
        _setUrl(url)
        localStorage.setItem('lastsaveaddr', url)
      } catch (e) {

      }
    }
    const disMes = (mes) => {
      setInfo(mes)
      setTimeout(() => setInfo(''), 2000)
    }
    const connect = () => {
      try {
        if (wsRef) {
          wsRef.close()
          disMes('Disconnected')
          return
        }
        let ws = new WebSocket(url)
        ws.onopen = (e) => {
          wsRef = ws
          disMes('Connected')
        }
        ws.onerror = (e) => {
          console.log('error', e)
          disMes('Error ' + e)
        }
        ws.onclose = (e) => {
          try {
            wsRef.close()
            wsRef = null
            disMes('Connection Lost')
          } catch (e) {
            console.log('close error', e.message)
          }
        }
        ws.onmessage = (e) => {
          try {
            let data = JSON.parse(e.data)
            if (data.type === 'getresult') {
              startApp(data.app)
            }
            if (data.type === 'reload') {
              startApp(data.app)
            }
          } catch (e) {
            console.log('message error', e)
          }
        }
      } catch (e) {
        console.log(e.message)
      }
    }
    const fetchApp = () => {
      try {
        if (wsRef) {
          wsRef.send(JSON.stringify({
            type: 'get',
          }))

        } else {
          throw new Error('No ws')
        }
      } catch (e) {
        console.log(e.message)
        disMes('No connection')
      }
    }
    if (!showChange) {
      let pos = {}; pos[buttonPosition] = 0;
      return (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', position: 'absolute', bottom: 5,
          right: 5, zIndex: '1000000000', ...pos
        }} >
          <button onClick={() => setReload(true)}
            style={{ fontSize: 16, opacity: 0.4, fontWeight: 'bolder', border: '2px solid red' }} >Reload</button>
          <button onClick={() => {
            if (store.get('showapp')) {
              setShowApp(true)
            } else {
              setShowChange(!showChange)
            }
          }}
            style={{ fontSize: 16, opacity: 0.4, fontWeight: 'bolder', border: '2px solid red' }} >Open</button>
        </div>
      )
    }

    return (
      <div style={{
        display: 'flex', borderTop: '1px solid grey', justifyContent: 'center', transition: 'height 2s',
        position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,250,0.4)', zIndex: '1000000000'
      }} >
        <div style={{ padding: 4 }} >
          <div >New App: <input type='file' onChange={open} /></div>
          <div>Server: <input value={url} onChange={e => setUrl(e.target.value)} /></div>
          <button onClick={connect} style={{ backgroundColor: wsRef ? 'green' : 'aqua', color: 'white' }} >
            {wsRef ? 'Disconnect' : 'Connect'}
          </button>
          <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', justifyContent: 'space-around' }}>
            <button onClick={() => { store.set('showapp', true, setShowApp) }} >Apps</button>
            <button onClick={fetchApp}>Fetch app</button>
            <button onClick={() => setReload(true)}>Reload</button>
            <button onClick={() => setShowChange(false)}>Close</button>
          </div>
          <div>{info}</div>
        </div>
      </div>
    )
  }
  if (reload) {
    return <Reload setReload={setReload} />
  }
  if (showApp) {
    return <AppSelect startApp={startApp} setShowApp={setShowApp} setShowChange={setShowChange} openLoad={() => {
      setShowApp(false)
      setShowChange(true)
      setMinimal(false)
    }} />
  }
  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <div style={{ height: '100%', overflow: 'hidden' }}>
        {loaded && appComp}
      </div>
      <div style={{ height: 0, position: 'relative' }} >
        {!minimal && <LoadArea />}
      </div>
    </div>
  )

}

export default App;

