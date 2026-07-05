import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './views/Landing'

// Non-landing views are lazy-loaded: each chunk is only downloaded when
// the user navigates to that route for the first time.
const PreShoot       = lazy(() => import('./views/PreShoot'))
const LiveShoot      = lazy(() => import('./views/LiveShoot'))
const Waiting        = lazy(() => import('./views/Waiting'))
const ModelSimulator = lazy(() => import('./views/ModelSimulator'))
const OutfitStyling  = lazy(() => import('./views/OutfitStyling'))

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


export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/"                element={<Landing />} />
          <Route path="/pre-shoot"       element={<PreShoot />} />
          <Route path="/live-shoot"      element={<LiveShoot />} />
          <Route path="/espera"          element={<Waiting />} />
          <Route path="/model-simulator" element={<ModelSimulator />} />
          <Route path="/outfit-styling"  element={<OutfitStyling />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
