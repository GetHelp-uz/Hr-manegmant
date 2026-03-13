import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { useGetMyCompany, useUpdateMyCompany } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save } from "lucide-react";

export default function Settings() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: company, isLoading } = useGetMyCompany();
  
  const [formData, setFormData] = useState({ name: "", phone: "", logo: "" });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        phone: company.phone,
        logo: company.logo || ""
      });
    }
  }, [company]);

  const updateMutation = useUpdateMyCompany({
    mutation: {
      onSuccess: () => {
        toast({ title: "Success", description: "Company profile updated" });
        queryClient.invalidateQueries({ queryKey: ["/api/companies/me"] });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ data: formData });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('settings')}</h1>
          <p className="text-muted-foreground mt-1">Manage your company profile and preferences.</p>
        </div>

        <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-card">
          <CardHeader className="bg-muted/20 border-b border-border/50 px-8 py-6">
            <CardTitle className="flex items-center gap-3 text-xl">
              <Building2 className="w-5 h-5 text-primary" />
              {t('company_profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-muted-foreground text-xs">No Logo</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Logo URL</Label>
                    <Input 
                      value={formData.logo} 
                      onChange={e => setFormData({...formData, logo: e.target.value})} 
                      className="rounded-xl" 
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>{t('company_name')}</Label>
                    <Input 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="rounded-xl" 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('phone')}</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      className="rounded-xl" 
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('email')}</Label>
                    <Input 
                      value={company?.email} 
                      disabled
                      className="rounded-xl bg-muted/50 cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('subscription')}</Label>
                    <div className="h-10 px-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold flex items-center uppercase text-sm">
                      {company?.subscriptionPlan || 'Free Tier'}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/50 flex justify-end">
                  <Button type="submit" disabled={updateMutation.isPending} className="rounded-xl h-11 px-8 shadow-md">
                    <Save className="w-4 h-4 mr-2" />
                    {t('save')}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
