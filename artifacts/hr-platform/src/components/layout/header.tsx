import { useLocation } from "wouter";
import { useAppStore } from "@/store/use-store";
import { useTranslation, Language } from "@/lib/i18n";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { LogOut, Globe, User } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Header() {
  const [, setLocation] = useLocation();
  const { language, setLanguage, sidebarOpen } = useAppStore();
  const t = useTranslation(language);
  const { data: me } = useGetMe({ query: { retry: false } });
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setLocation("/login");
    } catch (e) {
      console.error(e);
      setLocation("/login"); // Fallback
    }
  };

  const languages: { code: Language, label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'uz', label: 'O\'zbekcha' },
  ];

  return (
    <header 
      className={`
        fixed top-0 right-0 z-40 h-16 bg-card/80 backdrop-blur-md border-b border-border transition-all duration-300 ease-in-out flex items-center justify-end px-6 shadow-sm
        ${sidebarOpen ? 'left-64' : 'left-20'}
      `}
    >
      <div className="flex items-center gap-4">
        
        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 rounded-full bg-background/50 hover:bg-accent border-border/60">
              <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="font-medium uppercase">{language}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-xl min-w-[120px]">
            {languages.map((l) => (
              <DropdownMenuItem 
                key={l.code} 
                onClick={() => setLanguage(l.code)}
                className={`cursor-pointer ${language === l.code ? 'bg-primary/10 text-primary font-semibold' : ''}`}
              >
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border mx-2"></div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 px-3 rounded-full hover:bg-accent flex items-center gap-3 border border-transparent hover:border-border transition-all">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start hidden sm:flex">
                <span className="text-sm font-semibold leading-none">{me?.user.name || 'Admin'}</span>
                <span className="text-xs text-muted-foreground mt-1">{me?.user.role || 'Administrator'}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-xl mt-1">
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer p-3">
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
      </div>
    </header>
  );
}
