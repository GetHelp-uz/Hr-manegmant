import { useLocation } from "wouter";
import { useAppStore } from "@/store/use-store";
import { useTranslation, Language } from "@/lib/i18n";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { LogOut, Globe, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  accountant: "Buxgalter",
  observer: "Nazoratchi",
  hr: "HR Xodim",
  viewer: "Ko'ruvchi",
};

export function Header() {
  const [, setLocation] = useLocation();
  const { language, setLanguage, sidebarOpen } = useAppStore();
  const t = useTranslation(language);
  const { data: me } = useGetMe({ query: { retry: false } });
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {}
    setLocation("/login");
  };

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "English" },
    { code: "ru", label: "Русский" },
    { code: "uz", label: "O'zbekcha" },
  ];

  return (
    <header className={`
      fixed top-0 right-0 z-40 h-[60px] bg-white border-b border-border
      flex items-center justify-between px-6 transition-all duration-300 ease-in-out
      ${sidebarOpen ? "left-60" : "left-[68px]"}
    `}>
      {/* Left — breadcrumb placeholder */}
      <div />

      {/* Right */}
      <div className="flex items-center gap-3">

        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-3 text-sm text-muted-foreground gap-1.5 hover:text-foreground">
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase font-medium">{language}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px] rounded-xl shadow-lg border-border">
            {languages.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`cursor-pointer text-sm ${language === l.code ? "font-semibold text-primary" : ""}`}
              >
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border" />

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 h-9 px-3 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {(me?.user?.name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[13px] font-semibold leading-none text-foreground">{me?.user?.name || "Admin"}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ROLE_LABELS[(me?.user as any)?.role || ""] || "Foydalanuvchi"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border-border">
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
