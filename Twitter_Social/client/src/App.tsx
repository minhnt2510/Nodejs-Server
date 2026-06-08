import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthProvider } from './contexts/AuthContext'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { OAuthRedirectPage } from './pages/OAuthRedirectPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RegisterPage } from './pages/RegisterPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { GuestRoute, ProtectedRoute } from './routes/Guards'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/oauth2-redirect.html" element={<OAuthRedirectPage />} />
          <Route path="/oauth/callback" element={<OAuthRedirectPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route
                path="search"
                element={
                  <PlaceholderPage
                    title="Search"
                    description="Search tweets will use the backend /search endpoint with content, media_type, people_follow, limit, and page."
                  />
                }
              />
              <Route
                path="chat"
                element={
                  <PlaceholderPage
                    title="Messages"
                    description="Private messaging will use socket.io and /conversations/receivers/:receiver_id."
                  />
                }
              />
              <Route
                path="tweet/:tweetId"
                element={
                  <PlaceholderPage
                    title="Tweet detail"
                    description="Tweet detail will call /tweets/:tweet_id and /tweets/:tweet_id/children."
                  />
                }
              />
              <Route
                path=":username"
                element={
                  <PlaceholderPage
                    title="Profile"
                    description="Profile will call /users/:username and expose follow/unfollow when the viewer is verified."
                  />
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
