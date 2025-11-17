import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ChatPage } from '../features/chat/ChatPage';
import { TopicsPage } from '../features/topics/TopicsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { LoginPage } from '../features/auth/LoginPage';

export const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/',
        element: <DashboardPage />,
      },
      {
        path: '/assistant/chat',
        element: <ChatPage />,
      },
      {
        path: '/topics',
        element: <TopicsPage />,
      },
      {
        path: '/settings/profile',
        element: <ProfilePage />,
      },
    ],
  },
]);
