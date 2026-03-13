import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useAppStore } from "@/store/use-store";
import { useTranslation } from "@/lib/i18n";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useScanAttendance, useListDevices } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Scanner() {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  const { data: devices } = useListDevices();
  const [deviceId, setDeviceId] = useState<number | null>(null);
  
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState("");

  const scanMutation = useScanAttendance({
    mutation: {
      onSuccess: (data) => {
        setScanStatus('success');
        setScanMessage(`${data.employee.fullName} - ${data.action.replace('_', ' ').toUpperCase()}`);
        setTimeout(() => setScanStatus('idle'), 3000);
      },
      onError: (err: any) => {
        setScanStatus('error');
        setScanMessage(err.message || "Invalid QR Code");
        setTimeout(() => setScanStatus('idle'), 3000);
      }
    }
  });

  useEffect(() => {
    if (!deviceId) return;

    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          if (scanMutation.isPending || scanStatus !== 'idle') return; // Debounce
          scanMutation.mutate({ data: { qrData: decodedText, deviceId: deviceId! } });
        },
        (error) => {
          // Ignore general scan errors (like no QR found in frame)
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [deviceId, scanStatus, scanMutation.isPending]);

  // Auto-select first device
  useEffect(() => {
    if (devices?.data.length && !deviceId) {
      setDeviceId(devices.data[0].id);
    }
  }, [devices]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold">{t('qr_scanner')}</h1>
          <p className="text-muted-foreground mt-2">{t('scan_prompt')}</p>
        </div>

        <div className="w-full max-w-xs mx-auto">
          <Select value={deviceId?.toString() || ""} onValueChange={(v) => setDeviceId(Number(v))}>
            <SelectTrigger className="rounded-xl h-12">
              <SelectValue placeholder="Select Device / Entry Point" />
            </SelectTrigger>
            <SelectContent>
              {devices?.data.map(d => (
                <SelectItem key={d.id} value={d.id.toString()}>{d.deviceName} ({d.location})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden bg-card relative min-h-[400px]">
          {!deviceId ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10">
              <p className="font-medium text-muted-foreground">Please select a device first</p>
            </div>
          ) : null}
          
          <div id="qr-reader" className="w-full border-none !bg-black"></div>
          
          {/* Status Overlay */}
          {scanStatus !== 'idle' && (
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300 backdrop-blur-md
              ${scanStatus === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}
            `}>
              {scanStatus === 'success' ? <CheckCircle2 className="w-24 h-24 mb-4 drop-shadow-md" /> : <XCircle className="w-24 h-24 mb-4 drop-shadow-md" />}
              <h2 className="text-3xl font-bold text-center tracking-tight drop-shadow-md">{scanStatus === 'success' ? 'Success!' : 'Error'}</h2>
              <p className="text-xl text-center mt-2 font-medium drop-shadow-sm">{scanMessage}</p>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
