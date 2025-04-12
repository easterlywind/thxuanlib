import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Wrapper component that redirects students to the search page
 * while allowing librarians to see the Index page
 */
interface RedirectWrapperProps {
  children: React.ReactNode;
}

const RedirectWrapper: React.FC<RedirectWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Only redirect if user is a student
    if (user?.role === 'student') {
      navigate('/search', { replace: true });
    }
  }, [user, navigate]);
  
  // Show the children (Index) for librarians
  if (user?.role === 'librarian') {
    return <>{children}</>;
  }
  
  // Return null for students as they will be redirected
  return null;
};

export default RedirectWrapper;
