import './globals.css'

export const metadata = {
  title: 'SPECTRAL - Privacy Compliance Verification',
  description: 'Continuous verification that your privacy policies are actually enforced in production',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
