import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plane, Calendar, Home, Menu, LogOut, User, FileText, HelpCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { firebaseClient } from "@/api/firebaseClient";
import TermsAgreementDialog from "@/components/TermsAgreementDialog";
import { loadDestinations } from "@/services/destinationCache";
import { AIServiceStatus } from "@/components/common/AIServiceStatus";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "My Trips",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  {
    title: "Plan New Trip",
    url: createPageUrl("CreateTrip"),
    icon: Calendar,
  },
  {
    title: "Profile",
    url: createPageUrl("Profile"),
    icon: User,
  },
  {
    title: "Help",
    url: createPageUrl("Help"),
    icon: HelpCircle,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  // Pre-load destinations cache on app start
  useEffect(() => {
    loadDestinations().catch(error => {
      console.error('Failed to load destinations cache:', error);
    });
  }, []);

  // Check if user needs to accept terms
  const { data: userProfile } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      return await firebaseClient.auth.me();
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (userProfile && !userProfile.terms_accepted) {
      setShowTermsDialog(true);
    }
  }, [userProfile]);

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      await firebaseClient.auth.updateMe({
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setShowTermsDialog(false);
    },
  });

  const handleAcceptTerms = async () => {
    await acceptTermsMutation.mutateAsync();
  };

  const handleViewTerms = () => {
    navigate(createPageUrl("Terms"));
  };

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --ocean-deep: #1e3a8a;
          --ocean-blue: #3b82f6;
          --ocean-light: #dbeafe;
          --gold: #d4af37;
          --gold-light: #f3e8c3;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <Sidebar className="border-r border-gray-200 bg-white/80 backdrop-blur-lg">
          <SidebarHeader className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-gray-900 tracking-tight">Voyager</h2>
                <p className="text-xs text-gray-500 font-light">Travel Planner</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-300 rounded-xl mb-1 ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800 hover:text-white' 
                            : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3">
                Legal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={handleViewTerms}
                      className="hover:bg-blue-50 hover:text-blue-700 transition-all duration-300 rounded-xl mb-1"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <FileText className="w-5 h-5" />
                        <span className="font-medium">Terms of Service</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            {user && (
              <div className="space-y-3">
                {/* AI Service Status above user info */}
                <AIServiceStatus />
                
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{user.full_name || 'Traveler'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 px-6 py-4 md:hidden sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-bold text-gray-900">Voyager</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      <TermsAgreementDialog 
        open={showTermsDialog} 
        onAccept={handleAcceptTerms}
      />
    </SidebarProvider>
  );
}