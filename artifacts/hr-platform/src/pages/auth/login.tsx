import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, Mail, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const { language } = useAppStore();
  const t = useTranslation(language);
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        setLocation("/");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: t('error'),
          description: err.message || "Invalid credentials",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left side - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{t('login_title')}</h1>
            <p className="mt-2 text-muted-foreground">Enter your credentials to access the workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="admin@company.com"
                  className="pl-10 h-12 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••"
                  className="pl-10 h-12 rounded-xl bg-background border-border focus:ring-2 focus:ring-primary/20 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
              {!loginMutation.isPending && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors">
              Register company
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-sidebar overflow-hidden">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Dashboard Abstract" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar to-transparent opacity-90"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-lg">
            <h2 className="text-4xl font-display font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
              Modernize your workforce
            </h2>
            <p className="text-lg text-blue-100/80 leading-relaxed font-light">
              Manage attendance, generate payrolls, and track your employees in real-time with our enterprise-grade platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
