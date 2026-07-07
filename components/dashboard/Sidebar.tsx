import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { LayoutDashboard, History, BarChart3, CreditCard, Settings2, ChevronDown, Menu, X } from "lucide-react"
import AvatarMenu from "./AvatarMenu"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/history", icon: History, label: "History" },
  { href: "/dashboard/usage", icon: BarChart3, label: "Usage" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
  { href: "/dashboard/settings", icon: Settings2, label: "Settings" },
]

interface SidebarProps {
  userName?: string
  userEmail?: string
}

export default function Sidebar({ userName = "John Doe", userEmail = "john@example.com" }: SidebarProps) {
  const router = useRouter()
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = () => {
    // Dummy logout - in real app would clear auth tokens
    router.push("/")
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">Autofillstock</h1>
        <p className="text-xs text-gray-500 mt-0.5">SaaS Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = router.pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => setIsMobileOpen(false)}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Avatar section */}
      <div className="relative border-t border-gray-200 p-3">
        <button
          onClick={() => setShowAvatarMenu(!showAvatarMenu)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAvatarMenu ? "rotate-180" : ""}`} />
        </button>

        {showAvatarMenu && (
          <AvatarMenu
            name={userName}
            email={userEmail}
            onClose={() => setShowAvatarMenu(false)}
            onLogout={handleLogout}
          />
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop flex-shrink-0, Mobile slide-in */}
      <aside
        className={`
          fixed lg:static top-0 left-0 bottom-0 z-40 w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col
          lg:translate-x-0 transition-transform duration-300
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
