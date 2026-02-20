import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function useTheme() {
    return useContext(ThemeContext)
}

const STORAGE_KEY = 'jots_theme'

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode) {
    const root = document.documentElement
    if (mode === 'system') {
        root.setAttribute('data-theme', getSystemTheme())
    } else {
        root.setAttribute('data-theme', mode)
    }
}

export function ThemeProvider({ children }) {
    const [mode, setMode] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || 'system'
    })

    useEffect(() => {
        applyTheme(mode)
        localStorage.setItem(STORAGE_KEY, mode)
    }, [mode])

    // Listen for system theme changes when in "system" mode
    useEffect(() => {
        if (mode !== 'system') return
        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => applyTheme('system')
        mql.addEventListener('change', handler)
        return () => mql.removeEventListener('change', handler)
    }, [mode])

    return (
        <ThemeContext.Provider value={{ mode, setMode }}>
            {children}
        </ThemeContext.Provider>
    )
}
