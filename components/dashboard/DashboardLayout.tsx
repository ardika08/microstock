import React from "react"
import Head from "next/head"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/router"
import Sidebar from "./Sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
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

  return (
    <>
      <Head>
        <title>{title} | Autofillstock</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar userName={userName} userEmail={userEmail} />

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
