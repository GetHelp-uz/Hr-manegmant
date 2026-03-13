import { Link } from "wouter";
import { useState } from "react";
import {
  Users, Clock, QrCode, BarChart3, Shield, Globe2, Smartphone, CheckCircle2,
  ArrowRight, Star, Building2, Zap, MessageCircle, ChevronDown, ChevronUp,
  Play, TrendingUp, Camera, MapPin, BrainCircuit, FileSpreadsheet, Bell,
  CalendarRange, CreditCard, UserCheck, Lock, Rocket
} from "lucide-react";

const features = [
  { icon: QrCode, color: "bg-blue-500", title: "QR Davomat Tizimi", desc: "Xodimlar QR kod orqali bir zumda kirish-chiqishni qayd etishadi. Planshet kamera orqali avtomatik skan." },
  { icon: Users, color: "bg-indigo-500", title: "Xodimlar Boshqaruvi", desc: "Barcha xodimlarni bir joyda boshqaring. Profil, lavozim, maosh va hujjatlarni oson tahrirlang." },
  { icon: BarChart3, color: "bg-violet-500", title: "Real-time Statistika", desc: "Bugungi davomat, kechikishlar, umumiy ko'rsatkichlar — hammasi real vaqtda." },
  { icon: MessageCircle, color: "bg-green-500", title: "Telegram Bot", desc: "Xodimlar Telegram orqali o'z davomati, maoshi va tarixini ko'rishlari mumkin." },
  { icon: TrendingUp, color: "bg-orange-500", title: "Maosh Hisoblash", desc: "Soatlik va oylik maoshni avtomatik hisoblang. Buxgalter tasdiqlash jarayoni bilan." },
  { icon: Shield, color: "bg-rose-500", title: "Multi-Tenant Xavfsizlik", desc: "Har bir kompaniya izolyatsiyalangan. Ma'lumotlaringiz 100% himoyalangan." },
  { icon: Camera, color: "bg-pink-500", title: "Selfie Tasdiqlash", desc: "Davomat vaqtida xodim selfie oladi — kimligini tasdiqlash uchun foto saqlanadi." },
  { icon: Smartphone, color: "bg-teal-500", title: "Planshet Skaner", desc: "Ofis kirishiga planshet o'rnating — xodimlar QR kodni ko'rsatadilar, tizim avtomatik qayd etadi." },
  { icon: CalendarRange, color: "bg-cyan-500", title: "Ta'til Boshqaruvi", desc: "Xodimlar ta'til so'rovini yuboradilar, admin tasdiqlaydi. Qolgan kunlar avtomatik hisoblanadi." },
  { icon: CreditCard, color: "bg-emerald-500", title: "Avans Tizimi", desc: "Xodimlar avans so'rovini yuboradilar. Admin tasdiqlaydi va avans hisobga olinadi." },
  { icon: UserCheck, color: "bg-amber-500", title: "Ko'p Rollar", desc: "Admin, HR xodim, buxgalter, nazoratchi, ko'ruvchi — har biri o'z huquqiga ega." },
  { icon: Globe2, color: "bg-blue-600", title: "Ko'p Tillar", desc: "O'zbek, Rus va Ingliz tillarida to'liq ishlaydi. Interfeys tilni avtomatik saqlaydi." },
];

const upcomingFeatures = [
  { icon: MapPin, color: "text-blue-400", title: "GPS Joylashuv", desc: "Xodim skanerlashda GPS koordinatalar saqlanadi. Ofisdan tashqarida skanerlash aniqlanadi." },
  { icon: BrainCircuit, color: "text-violet-400", title: "AI Tahlil", desc: "Sun'iy intellekt yordamida davomat naqshlari tahlili, kechikish bashorati va tavsiyalar." },
  { icon: Bell, color: "text-orange-400", title: "Push Bildirishnomalar", desc: "Kechikuvchi xodimlar haqida SMS va Telegram xabarlar. Real vaqt ogohlantirishlari." },
  { icon: FileSpreadsheet, color: "text-green-400", title: "Excel/PDF Eksport", desc: "Davomat va maosh hisobotlarini Excel yoki PDF ko'rinishida yuklab oling." },
  { icon: Lock, color: "text-rose-400", title: "Yuz Tanish", desc: "QR kod o'rniga yuz tanish texnologiyasi bilan davomat. (Beta versiyada)" },
  { icon: Rocket, color: "text-cyan-400", title: "API Integratsiya", desc: "1C, boshqa tizimlar bilan integratsiya uchun to'liq REST API va webhook qo'llab-quvvatlash." },
];

const steps = [
  { num: "01", title: "Ro'yxatdan o'ting", desc: "Kompaniyangizni tizimga kiriting. Bepul boshlang." },
  { num: "02", title: "Xodimlar qo'shing", desc: "Xodimlar ma'lumotlarini kiriting, QR kodlar avtomatik yaratiladi." },
  { num: "03", title: "Skaner o'rnating", desc: "Ofis kirishiga planshet o'rnating va QR skaner ishga tushadi." },
  { num: "04", title: "Boshqaring", desc: "Dashboard'dan real vaqt davomatini kuzating, hisobotlar oling." },
];

const plans = [
  { name: "Bepul", price: "0", highlight: false, color: "border-white/20", features: ["10 tagacha xodim", "QR davomat", "Asosiy dashboard", "Telegram bot", "1 qurilma"] },
  { name: "Biznes", price: "299,000", highlight: true, color: "border-blue-500", features: ["100 tagacha xodim", "QR davomat + rasm", "Batafsil hisobotlar", "Telegram bot", "10 qurilma", "Maosh hisoblash", "CSV eksport"] },
  { name: "Korporativ", price: "899,000", highlight: false, color: "border-violet-500/50", features: ["Cheksiz xodimlar", "Barcha funksiyalar", "AI tahlil", "Maxsus hisobotlar", "Cheksiz qurilmalar", "API kirish", "24/7 qo'llab-quvvatlash"] },
];

const testimonials = [
  { name: "Jasur Toshmatov", company: "TechUz LLC", text: "HR platformasi bizning 50+ xodim davomatini butunlay avtomatlashtirdi. Har oyda 40 soat tejayapmiz.", stars: 5 },
  { name: "Nilufar Karimova", company: "Silk Road Group", text: "Telegram bot juda qulay — xodimlar o'z maoshini o'zlari ko'ra olishadi. Savollar 70% kamaydi.", stars: 5 },
  { name: "Bobur Yusupov", company: "Delta Service", text: "QR skaner o'rnatish 10 daqiqa oldi. Endi davomat to'liq avtomatik. Mukammal tizim!", stars: 5 },
];

const faqs = [
  { q: "Tizimni o'rnatish qanchalik qiyin?", a: "Juda oson! Ro'yxatdan o'tish, xodimlar qo'shish va planshetga skaner sahifasini ochish — bu hammasi. 30 daqiqada tayyor." },
  { q: "Telegram bot qanday ishlaydi?", a: "Xodim Telegram botdan /start buyrug'ini yuboradi, chat ID'sini oladi. Admin shu ID ni xodim profiliga kiritadi. Keyin xodim /bugun, /oylik, /tarix buyruqlari bilan ma'lumotini ko'radi." },
  { q: "Bir vaqtda nechta kompaniya ishlata oladi?", a: "Tizim 1000+ kompaniya uchun mo'ljallangan. Har bir kompaniya izolyatsiyalangan muhitda ishlaydi." },
  { q: "Ma'lumotlar xavfsizligi qanday ta'minlangan?", a: "Har bir kompaniya ma'lumotlari to'liq ajratilgan. Shifrlangan ulanish, xavfsiz session boshqaruvi." },
];

function DashboardPreview() {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-gray-400 text-xs ml-2">HR Platform — Boshqaruv paneli</span>
      </div>
      <div className="flex">
        <div className="w-44 bg-gray-900 border-r border-gray-700 p-3 space-y-1">
          {["📊 Dashboard", "👥 Xodimlar", "📅 Davomat", "📷 QR Skaner", "💰 Maosh", "📈 Hisobotlar"].map((item, i) => (
            <div key={i} className={`text-xs px-3 py-2 rounded-lg ${i === 0 ? "bg-blue-600 text-white" : "text-gray-400"}`}>{item}</div>
          ))}
        </div>
        <div className="flex-1 p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {[{ label: "Jami Xodimlar", val: "47", color: "text-blue-400", bg: "bg-blue-500/10" }, { label: "Bugun Kelgan", val: "38", color: "text-green-400", bg: "bg-green-500/10" }, { label: "Kelmaganlar", val: "9", color: "text-red-400", bg: "bg-red-500/10" }, { label: "Kechikkan", val: "3", color: "text-amber-400", bg: "bg-amber-500/10" }].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-xl p-3`}>
                <p className="text-gray-400 text-xs">{s.label}</p>
                <p className={`${s.color} text-2xl font-bold mt-1`}>{s.val}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="bg-gray-700/50 px-3 py-2 grid grid-cols-4 text-gray-400 text-xs font-semibold uppercase">
              <span>Ism</span><span>Lavozim</span><span>Kelish</span><span>Holat</span>
            </div>
            {[{ name: "Alisher R.", pos: "Dasturchi", time: "08:47", ok: true }, { name: "Malika T.", pos: "Dizayner", time: "09:02", ok: true }, { name: "Jasur K.", pos: "Menejer", time: "09:31", ok: false }].map((row, i) => (
              <div key={i} className="px-3 py-2 grid grid-cols-4 text-xs border-t border-gray-700/50">
                <span className="text-white font-medium">{row.name}</span>
                <span className="text-gray-400">{row.pos}</span>
                <span className="text-gray-300">{row.time}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${row.ok ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {row.ok ? "Kelgan" : "Kechikkan"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScannerPreview() {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl max-w-sm mx-auto">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="text-gray-400 text-xs ml-2">HR Platform — QR Skaner</span>
      </div>
      <div className="p-8 flex flex-col items-center gap-6">
        <h3 className="text-white font-semibold">QR Kodni Skanerlash</h3>
        <div className="relative w-44 h-44 bg-gray-800 rounded-xl border-2 border-blue-500 flex items-center justify-center">
          <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-blue-400" />
          <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-blue-400" />
          <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-blue-400" />
          <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-blue-400" />
          <QrCode className="w-12 h-12 text-blue-400 opacity-50" />
        </div>
        <div className="w-full bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
          <CheckCircle2 className="w-7 h-7 text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-bold">✅ Muvaffaqiyatli!</p>
          <p className="text-white text-sm mt-1">Alisher Rahimov</p>
          <p className="text-gray-400 text-xs">Ishga keldi — 08:47</p>
        </div>
      </div>
    </div>
  );
}

function TelegramPreview() {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl max-w-xs mx-auto">
      <div className="bg-blue-600 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">HR Bot</p>
          <p className="text-blue-200 text-xs">online</p>
        </div>
      </div>
      <div className="p-3 space-y-2 bg-gray-800 min-h-48">
        {[
          { from: "user", text: "/bugun" },
          { from: "bot", text: "📅 Bugungi davomat\n\n👤 Alisher Rahimov\n🕐 Kelish: 08:47\n🕐 Ketish: 18:02\n⏱ Ishlagan: 9.2 soat" },
          { from: "user", text: "/oylik" },
          { from: "bot", text: "💰 Aprel 2025\n\n📅 Ish kunlari: 21 kun\n💵 Hisoblangan:\n4,500,000 so'm" },
        ].map((msg, i) => (
          <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-line ${msg.from === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-700 text-gray-100 rounded-bl-sm"}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: "Dashboard", component: <DashboardPreview /> },
    { label: "QR Skaner", component: <ScannerPreview /> },
    { label: "Telegram Bot", component: <TelegramPreview /> },
  ];

  return (
    <div className="min-h-screen bg-[#080d1a] text-white overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#080d1a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">HR Platform</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Imkoniyatlar</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
            <a href="#pricing" className="hover:text-white transition-colors">Narxlar</a>
            <a href="#faq" className="hover:text-white transition-colors">Savolar</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2">
              Kirish
            </Link>
            <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25">
              Bepul Boshlash
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-[300px] h-[300px] bg-cyan-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-blue-300 text-sm mb-8">
            <Zap className="w-3.5 h-3.5" />
            <span>1000+ kompaniya ishlatib kelmoqda</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
            HR Boshqaruvini
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Avtomatlashtiring
            </span>
          </h1>
          <p className="text-gray-400 text-xl md:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed">
            QR davomat, Telegram bot, real-time statistika — hammasini bitta platformada boshqaring.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105">
              Bepul Boshlash
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#demo" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-all duration-200">
              <Play className="w-5 h-5" />
              Demo Ko'rish
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-10 text-center">
            {[{ val: "1000+", label: "Kompaniya" }, { val: "50,000+", label: "Xodim" }, { val: "99.9%", label: "Uptime" }, { val: "3 til", label: "UZ/RU/EN" }].map((s, i) => (
              <div key={i} className="px-4">
                <p className="text-3xl font-black text-white">{s.val}</p>
                <p className="text-gray-500 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEMO SCREENS */}
      <section id="demo" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">Tizim <span className="text-blue-400">Ko'rinishi</span></h2>
            <p className="text-gray-400 text-lg">Haqiqiy interfeyslar — demo ma'lumotlar bilan</p>
          </div>
          <div className="flex justify-center gap-2 mb-8">
            {tabs.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === i ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="transition-all duration-300">
            {tabs[activeTab].component}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">To'liq <span className="text-blue-400">Imkoniyatlar</span></h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Bitta platformada HR boshqaruvining barcha yechimlari</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPCOMING FEATURES */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-2 text-violet-300 text-sm mb-4">
              <Rocket className="w-3.5 h-3.5" />
              <span>Tez orada</span>
            </div>
            <h2 className="text-4xl font-black mb-4">Kelgusi <span className="text-violet-400">Yangiliklar</span></h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">Platformamizni yanada kuchliroq qilish uchun ishlamoqdamiz</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingFeatures.map((f, i) => (
              <div key={i} className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-violet-500/30 rounded-2xl p-6 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl -translate-y-8 translate-x-8 group-hover:bg-violet-500/10 transition-all" />
                <div className="relative">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <f.icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    {f.title}
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Beta</span>
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Qanday <span className="text-blue-400">Ishlaydi?</span></h2>
            <p className="text-gray-400 text-lg">4 qadamda ishga tushuring</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-5xl font-black text-blue-500/20 mb-3">{s.num}</div>
                <h3 className="font-bold text-white mb-2">{s.title}</h3>
                <p className="text-gray-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Mijozlar <span className="text-blue-400">Fikri</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Qulay <span className="text-blue-400">Narxlar</span></h2>
            <p className="text-gray-400 text-lg">Kompaniyangiz hajmiga mos tarif tanlang</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p, i) => (
              <div key={i} className={`relative bg-white/5 border-2 ${p.color} rounded-2xl p-8 ${p.highlight ? "scale-105 shadow-2xl shadow-blue-500/20" : ""}`}>
                {p.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                    MASHHUR
                  </div>
                )}
                <h3 className="font-black text-xl text-white mb-2">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-white">{p.price}</span>
                  <span className="text-gray-400 text-sm"> so'm/oyiga</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-gray-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`block text-center py-3 rounded-xl font-bold text-sm transition-all ${p.highlight ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                  {p.price === "0" ? "Bepul Boshlash" : "Xarid Qilish"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Ko'p So'raladigan <span className="text-blue-400">Savollar</span></h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-white/5 transition-colors">
                  <span className="font-semibold text-white">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-blue-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-cyan-600/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-black mb-6">Bugun <span className="text-blue-400">Boshlang!</span></h2>
          <p className="text-gray-400 text-xl mb-10">Ro'yxatdan o'ting — kredit karta kerak emas. Bepul plan bilan ishlang.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-5 rounded-2xl text-xl transition-all duration-200 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105">
            Bepul Ro'yxatdan O'tish
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">HR Platform</span>
          </div>
          <p className="text-gray-500 text-sm">© 2025 HR Platform. Barcha huquqlar himoyalangan.</p>
          <div className="flex items-center gap-6 text-gray-500 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">Kirish</Link>
            <Link href="/register" className="hover:text-white transition-colors">Ro'yxatdan o'tish</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
