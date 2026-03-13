import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

interface EmployeeQR {
  id: number;
  fullName: string;
  position: string;
  qrCode: string | null;
}

export default function PrintQR() {
  const departmentId = new URLSearchParams(window.location.search).get("departmentId");
  const [employees, setEmployees] = useState<EmployeeQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = departmentId
      ? `/api/employees/all-qr?departmentId=${departmentId}`
      : "/api/employees/all-qr";
    apiClient.get(url)
      .then((r) => setEmployees(r.data))
      .catch(() => setError("Ma'lumotlarni yuklashda xato yuz berdi"))
      .finally(() => setLoading(false));
  }, [departmentId]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">QR kodlar tayyorlanmoqda...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>
  );

  return (
    <>
      {/* Print controls - hidden on print */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Orqaga
          </Button>
          <span className="text-sm text-muted-foreground">
            {employees.length} ta xodim QR kodi chop etiladi
          </span>
        </div>
        <Button onClick={handlePrint} className="gap-2 rounded-xl">
          <Printer className="w-4 h-4" />
          Chop etish
        </Button>
      </div>

      {/* Print content */}
      <div className="print-page pt-16">
        <style>{`
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          @media print {
            .no-print { display: none !important; }
            .print-page { padding-top: 0 !important; }
            body { margin: 0; padding: 0; }
          }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8mm;
            padding: 5mm;
          }
          .qr-card {
            width: 100%;
            height: 60mm;
            display: flex;
            flex-direction: row;
            align-items: center;
            border: 1.5px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
            background: white;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .qr-image-box {
            width: 56mm;
            min-width: 56mm;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            border-right: 1.5px solid #e2e8f0;
            padding: 4mm;
          }
          .qr-image-box img {
            width: 48mm;
            height: 48mm;
            object-fit: contain;
          }
          .qr-info {
            flex: 1;
            padding: 5mm 4mm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2mm;
            overflow: hidden;
          }
          .qr-logo {
            font-size: 7pt;
            font-weight: 700;
            color: #4f46e5;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 1mm;
          }
          .qr-name {
            font-size: 11pt;
            font-weight: 700;
            color: #1a202c;
            line-height: 1.2;
            word-break: break-word;
          }
          .qr-position {
            font-size: 8pt;
            color: #718096;
            margin-top: 1mm;
          }
          .qr-divider {
            width: 20mm;
            height: 1px;
            background: #e2e8f0;
            margin: 2mm 0;
          }
          .qr-hint {
            font-size: 7pt;
            color: #a0aec0;
          }
          .qr-no-code {
            width: 48mm;
            height: 48mm;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7pt;
            color: #999;
            border-radius: 4px;
          }
        `}</style>

        {employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
            <p className="text-lg">Xodimlar topilmadi</p>
          </div>
        ) : (
          <div className="qr-grid">
            {employees.map((emp) => (
              <div key={emp.id} className="qr-card">
                <div className="qr-image-box">
                  {emp.qrCode ? (
                    <img src={emp.qrCode} alt={`QR - ${emp.fullName}`} />
                  ) : (
                    <div className="qr-no-code">QR yo'q</div>
                  )}
                </div>
                <div className="qr-info">
                  <div className="qr-logo">HR Platform</div>
                  <div className="qr-name">{emp.fullName}</div>
                  <div className="qr-divider" />
                  <div className="qr-position">{emp.position || "Xodim"}</div>
                  <div className="qr-hint">Davomat uchun skanerlang</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
