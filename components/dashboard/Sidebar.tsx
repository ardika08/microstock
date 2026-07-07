import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import { LayoutDashboard, History, BarChart3, CreditCard, Settings2, ChevronDown, Menu, X, Sparkles } from "lucide-react"
import AvatarMenu from "./AvatarMenu"

const navItems = [
  { href: "/dashboard/generate", icon: Sparkles, label: "Generate" },
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
    router.push("/")
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Autofillstock
        </h1>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                isActive
                  ? "bg-blue-500/10 border-l-2 border-blue-500 text-blue-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-2 border-transparent"
              }`}
              onClick={() => setIsMobileOpen(false)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-blue-500/10 rounded-lg -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Avatar section */}
      <div className="relative border-t border-white/10 p-3">
        <button
          onClick={() => setShowAvatarMenu(!showAvatarMenu)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all duration-200"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ring-2 ring-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-gray-100 truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showAvatarMenu ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showAvatarMenu && (
            <AvatarMenu
              name={userName}
              email={userEmail}
              onClose={() => setShowAvatarMenu(false)}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg shadow-lg border border-white/10 text-gray-300 hover:text-white transition-colors"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static top-0 left-0 bottom-0 z-40 w-60 flex-shrink-0 
          bg-slate-900 border-r border-white/10 flex flex-col
          lg:translate-x-0 transition-transform duration-300 ease-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
