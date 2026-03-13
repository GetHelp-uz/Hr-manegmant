import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, Mail, User, Phone, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { language } = useAppStore();
  const t = useTranslation(language);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    companyName: "",
    adminName: "",
    phone: "",
    email: "",
    password: ""
  });
  
  const registerMutation = useRegister({
    mutation: {
      onSuccess: () => {
        toast({ title: "Muvaffaqiyatli", description: "Hisob muvaffaqiyatli yaratildi" });
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: t('error'),
          description: err.message || "Registration failed",
        });
      }
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ data: formData });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{t('register_title')}</h1>
            <p className="mt-2 text-muted-foreground">Set up your workspace in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-semibold">{t('company_name')}</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="companyName" value={formData.companyName} onChange={handleChange} required className="pl-10 h-11 rounded-xl" placeholder="Acme Corp" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminName" className="text-sm font-semibold">Admin Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="adminName" value={formData.adminName} onChange={handleChange} required className="pl-10 h-11 rounded-xl" placeholder="John Doe" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">{t('phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="phone" value={formData.phone} onChange={handleChange} required className="pl-10 h-11 rounded-xl" placeholder="+1 234 567 8900" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t('email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="email" type="email" value={formData.email} onChange={handleChange} required className="pl-10 h-11 rounded-xl" placeholder="admin@acme.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input id="password" type="password" value={formData.password} onChange={handleChange} required className="pl-10 h-11 rounded-xl" placeholder="••••••••" />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 mt-4 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Creating..." : "Create Account"}
              {!registerMutation.isPending && <ArrowRight className="w-5 h-5 ml-2" />}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      
      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-sidebar overflow-hidden">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Dashboard Abstract" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar to-transparent opacity-90"></div>
      </div>
    </div>
  );
}
