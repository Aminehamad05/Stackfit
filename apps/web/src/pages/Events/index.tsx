import { Navigate } from 'react-router-dom';

// Legacy route: event browsing moved to /networking (spec Step 3).
export default function Events(): JSX.Element {
  return <Navigate to="/networking" replace />;
}
