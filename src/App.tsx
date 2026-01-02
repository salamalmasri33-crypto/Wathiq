import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import { MyDocuments } from "./pages/MyDocuments";
import { Documents } from "./pages/Documents";
import { AddDocument } from "./pages/AddDocument";
import { DocumentView } from "./pages/DocumentView";
import { Search } from "./pages/Search";
import { Reports } from "./pages/Reports";
import  Settings  from "./pages/Settings";
import { Users } from "./pages/Users";
import { DocumentEdit } from "./pages/DocumentEdit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-documents"
                element={
                  <ProtectedRoute allowedRoles={['User']}>
                    <MainLayout>
                      <MyDocuments />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/documents"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                    <MainLayout>
                      <Documents />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/add-document"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <AddDocument />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/documents/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DocumentView />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/documents/:id/edit"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DocumentEdit />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Search />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                    <MainLayout>
                      <Reports />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <MainLayout>
                      <Users />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
