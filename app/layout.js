import './globals.css'
import { AuthProvider } from '../context/AuthContext'

export const metadata = {
  title: 'Campus Cafe — Admin',
  description: 'Restaurant admin panel',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}