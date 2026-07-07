import React from "react"
import Head from "next/head"
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
  return (
    <>
      <Head>
        <title>{title} | Autofillstock</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar userName={userName} userEmail={userEmail} />
        
        {/* Main content - flex-1 with proper overflow */}
        <main className="flex-1 overflow-auto lg:ml-0">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  )
}
