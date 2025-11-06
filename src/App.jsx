import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { setupIframeMessaging } from './lib/iframe-messaging';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

setupIframeMessaging();

const LayoutWrapper = ({ children, currentPageName }) => {
  const { isAuthenticated } = useAuth();
  const isLoginPage = currentPageName === 'Login';
  
  // Don't wrap Login page with Layout
  if (isLoginPage || !isAuthenticated) {
    return <>{children}</>;
  }
  
  return Layout ? 
    <Layout currentPageName={currentPageName}>{children}</Layout>
    : <>{children}</>;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();
  const location = window.location.pathname;
  const isLoginPage = location === '/Login' || location === '/';
  
  // Extract current page name from path
  const currentPageName = location.substring(1) || mainPageKey;

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, redirect to login
  if (!isAuthenticated && !isLoginPage) {
    window.location.href = '/Login';
    return null;
  }

  // If authenticated and on login page, redirect to dashboard
  if (isAuthenticated && isLoginPage) {
    window.location.href = '/Dashboard';
    return null;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Render the main app
  return (
    <LayoutWrapper currentPageName={currentPageName}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
