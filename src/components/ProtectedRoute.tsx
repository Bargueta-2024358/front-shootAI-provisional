import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireBodyPhoto?: boolean
}

export default function ProtectedRoute({
  children,
  requireBodyPhoto = false,
}: ProtectedRouteProps) {
  const { user, loading, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="flex items-center gap-[6px]" aria-label="Cargando…">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-1.5 w-1.5 animate-pulse rounded-full bg-caramel"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />
  }

  if (requireBodyPhoto && !profile?.bodyPhotoUrl) {
    return <Navigate to="/profile" state={{ requireBodyPhoto: true }} replace />
  }

  return <>{children}</>
}
