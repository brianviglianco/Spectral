import './globals.css'

export const metadata = {
  title: 'Spectral - GDPR Compliance Dashboard',
  description: 'Automated privacy compliance verification platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
