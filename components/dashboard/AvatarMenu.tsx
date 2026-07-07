import React, { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { LogOut, User, Mail } from "lucide-react"

interface AvatarMenuProps {
  name: string
  email: string
  onClose: () => void
  onLogout: () => void
}

export default function AvatarMenu({ name, email, onClose, onLogout }: AvatarMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 5 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute bottom-20 left-4 right-4 z-50 bg-slate-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden"
    >
      {/* User info */}
      <div className="px-4 py-3 bg-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100 truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
              <Mail className="w-3 h-3 flex-shrink-0" />
              {email}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Actions */}
      <div className="p-1">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </div>
    </motion.div>
  )
}
