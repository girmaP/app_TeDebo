import "./globals.css"
import type { Metadata } from "next"
import PWARegister from "@/components/PWARegister"

export const metadata: Metadata = {
  title: "TeDebo 💸",
  description: "La app para compartir gastos, balances y deudas entre amigos",
  manifest: "/manifest",
  themeColor: "#111111",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-black antialiased">
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
