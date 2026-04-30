import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { AuthProvider } from '@/hooks/useAuth'
import { app } from './firebase/config'

console.log('Firebase initialized:', app.name)

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

const rootElement = document.getElementById('app')

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
