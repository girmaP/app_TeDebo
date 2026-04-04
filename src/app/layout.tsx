
import "./globals.css"

export const metadata = {
  title: "TeDebo 💸",
  description: "La app para compartir gastos, balances y deudas entre amigos",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-black antialiased">{children}</body>
    </html>
  )
}