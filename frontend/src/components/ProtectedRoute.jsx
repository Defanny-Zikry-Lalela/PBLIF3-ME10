import { Navigate, useLocation } from 'react-router-dom'

function ProtectedRoute({ user, requiredRole, children }) {
  const location = useLocation()

  if (!user || (requiredRole && user.role !== requiredRole)) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
