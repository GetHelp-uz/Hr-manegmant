import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAppStore } from "@/store/use-store";
import { useGetMe } from "@workspace/api-client-react";
import { Redirect } from "wouter";

export function AppLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen } = useAppStore();
  const { data: me, isLoading, error } = useGetMe({ 
    query: { 
      retry: false,
      refetchOnWindowFocus: false
    } 
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !me) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Sidebar />
      <Header />
      <main 
        className={`
          flex-1 mt-16 p-4 md:p-8 transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'ml-64' : 'ml-20'}
        `}
      >
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {children}
        </div>
      </main>
    </div>
  );
}
