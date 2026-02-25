import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    Home, Mic, LogOut, Settings, PenTool, Menu
} from 'lucide-react'
import './Sidebar.css'

export default function Sidebar({ isCollapsed, toggleSidebar }) {
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
        { to: '/whiteboard', icon: PenTool, label: 'Whiteboard' },
        { to: '/profile', icon: Settings, label: 'Settings' },
    ]

    return (
        <>
            {/* ---- Desktop Sidebar ---- */}
            <aside className={`sidebar-desktop ${isCollapsed ? 'collapsed-mode' : ''}`}>
                <div className="sidebar-brand" style={{ paddingLeft: isCollapsed ? 'var(--space-md)' : 'var(--space-lg)' }}>
                    <button className="icon-btn" onClick={toggleSidebar} style={{ color: 'var(--label)', padding: '4px' }}>
                        <Menu size={24} />
                    </button>
                    {!isCollapsed && (
                        <>
                            <img src="/app-icon.png" alt="Jovis" className="sidebar-app-icon" style={{ marginLeft: '8px' }} />
                            <span className="brand-name">Jovis</span>
                        </>
                    )}
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
                            {!isCollapsed && <span>{label}</span>}
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
                        {!isCollapsed && <span className="sidebar-username">{profile?.display_name || 'User'}</span>}
                    </div>
                    <button className="sidebar-link logout" onClick={handleSignOut} title="Sign Out">
                        <LogOut size={20} />
                        {!isCollapsed && <span>Sign Out</span>}
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
