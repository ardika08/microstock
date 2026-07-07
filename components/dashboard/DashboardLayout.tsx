import React, { useEffect } from "react"
import Head from "next/head"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/router"
import { useSession } from "next-auth/react"
import Sidebar from "./Sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  // kept for backward compat but session values take precedence
  userName?: string
  userEmail?: string
}

export default function DashboardLayout({
  children,
  title = "Dashboard",
  userName,
  userEmail,
}: DashboardLayoutProps) {
  const router = useRouter()
  const { data: session, status } = useSession()

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login")
    }
  }, [status, router])

  // Show nothing while loading or redirecting
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  const resolvedName = (session?.user as any)?.name ?? userName
  const resolvedEmail = (session?.user as any)?.email ?? userEmail
  const resolvedImage = (session?.user as any)?.image

  return (
    <>
      <Head>
        <title>{title} | Autofillstock</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar userName={resolvedName} userEmail={resolvedEmail} userImage={resolvedImage} />

        {/* Main content with page transition */}
        <main className="flex-1 overflow-auto lg:ml-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={router.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="px-4 sm:px-6 lg:px-8 py-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  )
}
