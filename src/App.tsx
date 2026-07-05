import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './views/Landing'

const PreShoot = lazy(() => import('./views/PreShoot'))
const LiveShoot = lazy(() => import('./views/LiveShoot'))
const Waiting = lazy(() => import('./views/Waiting'))
const ModelSimulator = lazy(() => import('./views/ModelSimulator'))
const OutfitStyling = lazy(() => import('./views/OutfitStyling'))
const Auth = lazy(() => import('./views/Auth'))
const Profile = lazy(() => import('./views/Profile'))
const Favorites = lazy(() => import('./views/Favorites'))

function RouteLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="flex items-center gap-[6px]" aria-label="Cargando…">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[#A67B5B]"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function Protected({
  children,
  requireBodyPhoto = false,
}: {
  children: React.ReactNode
  requireBodyPhoto?: boolean
}) {
  return (
    <ProtectedRoute requireBodyPhoto={requireBodyPhoto}>{children}</ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/profile"
              element={
                <Protected>
                  <Profile />
                </Protected>
              }
            />
            <Route
              path="/favoritos"
              element={
                <Protected>
                  <Favorites />
                </Protected>
              }
            />
            <Route
              path="/pre-shoot"
              element={
                <Protected requireBodyPhoto>
                  <PreShoot />
                </Protected>
              }
            />
            <Route
              path="/outfit-styling"
              element={
                <Protected requireBodyPhoto>
                  <OutfitStyling />
                </Protected>
              }
            />
            <Route
              path="/live-shoot"
              element={
                <Protected requireBodyPhoto>
                  <LiveShoot />
                </Protected>
              }
            />
            <Route
              path="/model-simulator"
              element={
                <Protected requireBodyPhoto>
                  <ModelSimulator />
                </Protected>
              }
            />
            <Route path="/espera" element={<Waiting />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
