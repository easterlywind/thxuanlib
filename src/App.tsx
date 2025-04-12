
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import RequireAuth from "@/components/auth/RequireAuth";

// Pages
import Index from "@/pages/Index";
import RedirectWrapper from "@/components/RedirectWrapper";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import Books from "@/pages/Books";
import Search from "@/pages/Search";
import BorrowReturn from "@/pages/BorrowReturn";
import Users from "@/pages/Users";
import Reports from "@/pages/Reports";
import Account from "@/pages/Account";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <RequireAuth>
                <MainLayout>
                  <RedirectWrapper>
                    <Index />
                  </RedirectWrapper>
                </MainLayout>
              </RequireAuth>
            } />
            <Route path="/books" element={
              <RequireAuth>
                <MainLayout>
                  <Books />
                </MainLayout>
              </RequireAuth>
            } />
            <Route path="/search" element={
              <RequireAuth>
                <MainLayout>
                  <Search />
                </MainLayout>
              </RequireAuth>
            } />
            <Route path="/borrow" element={
              <RequireAuth>
                <MainLayout>
                  <BorrowReturn />
                </MainLayout>
              </RequireAuth>
            } />
            <Route path="/users" element={
              <RequireAuth>
                <MainLayout>
                  <Users />
                </MainLayout>
              </RequireAuth>
            } />
            <Route path="/reports" element={
              <RequireAuth>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </RequireAuth>
            } />
            <Route path="/account" element={
              <RequireAuth>
                <MainLayout>
                  <Account />
                </MainLayout>
              </RequireAuth>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
