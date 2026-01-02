import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ProjectProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/projects" element={
                  <ProtectedRoute>
                    <Projects />
                  </ProtectedRoute>
                } />
                <Route path="/project/:id" element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                } />
                <Route path="/team" element={
                  <ProtectedRoute>
                    <Team />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ProjectProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
