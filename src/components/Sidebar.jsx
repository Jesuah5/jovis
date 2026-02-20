import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    Home, Mic, LogOut, Settings,
} from 'lucide-react'
import './Sidebar.css'

export default function Sidebar() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    async function handleSignOut() {
        await signOut()
        navigate('/login')
    }

    const navItems = [
        { to: '/', icon: Home, label: 'Home' },
        { to: '/meetings', icon: Mic, label: 'Meetings' },
        { to: '/profile', icon: Settings, label: 'Settings' },
    ]

    return (
        <>
            {/* ---- Desktop Sidebar ---- */}
            <aside className="sidebar-desktop">
                <div className="sidebar-brand">
                    <img src="/app-icon.png" alt="Jovis" className="sidebar-app-icon" />
                    <span className="brand-name">Jovis</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="sidebar-avatar" />
                        ) : (
                            <div className="sidebar-avatar-placeholder">
                                {(profile?.display_name || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <span className="sidebar-username">{profile?.display_name || 'User'}</span>
                    </div>
                    <button className="sidebar-link logout" onClick={handleSignOut}>
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ---- Mobile Tab Bar ---- */}
            <nav className="tabbar-mobile">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={22} strokeWidth={location.pathname === to ? 2.2 : 1.5} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    )
}
