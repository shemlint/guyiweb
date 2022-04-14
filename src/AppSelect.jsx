import React, { useState, useEffect } from 'react'
import LocalForage from 'localforage'
import { store } from './AppUtils'

let lastOpened = ''

const AppSelect = ({ setShowApp, startApp, openLoad, setShowChange }) => {
    const [loaded, setLoaded] = useState(false)
    const [apps, setApps] = useState([])

    const getApps = () => {
        (async () => {
            setLoaded(false)
            setApps([])
            let appNames = (await LocalForage.keys()) || []
            lastOpened = await LocalForage.getItem('guyilastapp')
            let loadedApps = []
            let got = []
            for (let i = 0; i < appNames.length; i++) {
                let an = appNames[i]
                let app = await LocalForage.getItem(an)
                if (typeof app === "object" && Array.isArray(app.modules)) {
                    loadedApps.push(app)
                    got.push(an)
                }
            }
            setLoaded(true)
            setApps([...loadedApps])
            setLoaded(true)
        })()
    }

    useEffect(getApps, [])

    const deleteApp = async (name) => {
        try {
            let res = window.confirm('Delete ' + name + " ?")
            if (!res) return
            await LocalForage.removeItem(name)
            getApps()
        } catch (e) {
            console.log('delete app error', e.message)
        }
    }
    const saveApp = (app) => {
        try {
            let name = app.modules[0][0].name
            const a = window.document.createElement('a')
            a.href = URL.createObjectURL(new Blob([JSON.stringify(app)], { type: 'text/plain' }))
            a.download = `Guyi-app,${name}`
            a.click()
            if (global.process.platform === 'phone') {
                const res = window.navigator.clipboard.writeText(JSON.stringify(app))
                if (res) {
                    alert('Guyi app saved to clipboard')
                } else {
                    alert('could not copy app to clipboard')
                }
            }
        } catch (e) {
            console.log('save app error', e.message)
        }
    }
    const App = ({ app, index }) => {
        try {
            let pics = app.files.filter(n => n.name === 'splash')
            const pinApp = (name) => {
                let icon = pics[0] ? pics[0].url : ""
                let id = Math.random().toString()
                switch (global.process.platform) {
                    case 'phone':
                        window.Phone.pinShortcut(id, name, icon)
                        break
                    case 'desk':
                        window.Desk.pinShortcut(id, name, icon)
                        break
                    case 'neu':
                        window.guyi.dispatch('pinshortcut', id, name, icon)
                        break
                    default:
                        console.info('Target does not support shortcuts')
                        break
                }
            }

            let name = app.modules[0][0].displayName || app.modules[0][0].name || "UnNamed"
            const color = () => `rgb(${Math.floor(Math.random() * 125)},${Math.floor(Math.random() * 125)}` +
                `,${Math.floor(Math.random() * 125)})`
            const randColor = () => `radial-gradient(${color() + ',' + color()})`
            return (
                <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                    <div onClick={() => {
                        setShowApp(false)
                        startApp(app)
                    }}
                        style={{
                            width: 100, height: 100, borderRadius: 10, boxShadow: (lastOpened === name) ? '0px 0px 8px 4px blue' : '0px 0px 3px 3px grey',
                            margin: 5,
                            backgroundImage: pics[0] ? `url(${pics[0].url})` : randColor(), backgroundSize: 'cover', overflow: 'auto',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                        }}  >
                        <div style={{ fontSize: 20, color: 'red', fontWeight: 'bolder', textShadow: '0 0 3px #ffff', textAlign: 'center' }} >{name}</div>
                    </div>
                    <div>
                        <button onClick={() => deleteApp(app.modules[0][0].name)} >Del</button>
                        <button onClick={() => saveApp(app)} >Save</button>
                        <button onClick={() => pinApp(app.modules[0][0].name)} >Pin</button>
                    </div>
                </div>
            )
        } catch (e) {
            return <div>App Error</div>
        }
    }

    const loading = (
        <div style={{ color: 'blue', textShadow: '0 0 5px green', fontSize: 30, fontWeight: "bold" }}>
            Loading Apps Please Wait
        </div>)
    return (
        <div style={{
            width: '100vw', height: '100vh', display: 'flex', flexWrap: 'wrap',
            justifyContent: 'space-evenly', alignItems: 'center', position: 'relative'
        }} >
            <div style={{ fontSize: 24, color: 'purple', fontWeight: 'bold', position: 'absolute', top: 0, width: '100%', textAlign: 'center' }} >
                Saved Guyi Apps
            </div>
            <div style={{ position: 'absolute', top: 5, right: 5 }}>
                <button onClick={() => store.set('showapp', false, openLoad)} >Dev.</button>
                <button onClick={() => { setShowApp(false); setShowChange(false) }} >Close</button>
            </div>
            {!loaded && loading}
            {loaded && apps.length === 0 && <h1 style={{ color: 'blue' }} >NO APPS YET</h1>}
            {apps.map((app, i) => <App app={app} index={i} />)}
        </div>
    )

}
export default AppSelect