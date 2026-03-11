import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState({
    players: 1247,
    tournaments: 48,
    online: 126,
    verified: 856
  });

  useEffect(() => {
    setLoaded(true);
    fetchRealStats();
    
    const interval = setInterval(() => {
      setStats(prev => ({
        players: prev.players + Math.floor(Math.random() * 5),
        tournaments: prev.tournaments + (Math.random() > 0.9 ? 1 : 0),
        online: prev.online + Math.floor(Math.random() * 3) - 1,
        verified: prev.verified + Math.floor(Math.random() * 4)
      }));
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchRealStats = async () => {
    try {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      if (count) {
        setStats(prev => ({ ...prev, players: count, verified: Math.floor(count * 0.7) }));
      }
    } catch (error) {
      console.log("Using mock stats");
    }
  };

  return (
    <div className={`min-h-screen bg-black text-white transition-opacity duration-1000 ${loaded ? "opacity-100" : "opacity-0"}`}>
      
      <nav className="flex justify-between items-center px-6 md:px-12 py-5 border-b border-purple-500/20 backdrop-blur-md sticky top-0 z-50 bg-black/60">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-black">
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Cipher
            </span>
            <span className="text-white">Pool</span>
          </h1>
          <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
            Beta
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Link to="/tournaments" className="text-gray-300 hover:text-purple-400 transition">Tournaments</Link>
          <Link to="/leaderboard" className="text-gray-300 hover:text-purple-400 transition">Ranking</Link>
          <Link to="/about" className="text-gray-300 hover:text-purple-400 transition">About</Link>
          <Link to="/support" className="text-gray-300 hover:text-purple-400 transition">Support</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to="/login" 
            className="px-5 py-2 text-gray-300 hover:text-white border border-purple-500/30 rounded-lg hover:border-purple-500 transition"
          >
            Login
          </Link>
          <Link 
            to="/register" 
            className="px-5 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-medium hover:opacity-90 transition shadow-lg shadow-purple-500/25"
          >
            Register
          </Link>
        </div>
      </nav>

      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/10 to-cyan-600/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-400 text-sm font-medium">
              🎮 Morocco's #1 Free Fire Platform
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              CipherPool
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            منصة البطولات الأولى في المغرب للعبة <span className="text-purple-400 font-bold border-b-2 border-purple-400/30">Free Fire</span>.
            <br />
            <span className="text-gray-400">سجل، تحقق، تنافس، واكسب الجوائز.</span>
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4">
              <div className="text-3xl font-bold text-purple-400 mb-1">{stats.players.toLocaleString()}</div>
              <div className="text-sm text-gray-400">لاعب مسجل</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-4">
              <div className="text-3xl font-bold text-cyan-400 mb-1">{stats.tournaments}</div>
              <div className="text-sm text-gray-400">بطولة</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-4">
              <div className="text-3xl font-bold text-green-400 mb-1">{stats.online}</div>
              <div className="text-sm text-gray-400">متصل الآن</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-yellow-500/20 rounded-2xl p-4">
              <div className="text-3xl font-bold text-yellow-400 mb-1">{stats.verified}</div>
              <div className="text-sm text-gray-400">موثق</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="group relative px-10 py-5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-lg overflow-hidden transition transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/40"
            >
              <span className="relative z-10">ابدأ الآن مجاناً</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition"></div>
            </Link>

            <Link
              to="/tournaments"
              className="px-10 py-5 border-2 border-purple-500/50 rounded-xl font-bold text-lg hover:bg-purple-600/10 transition transform hover:scale-105 backdrop-blur-sm"
            >
              استعرض البطولات
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gradient-to-b from-black to-purple-950/20">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              كيف تعمل المنصة؟
            </h2>
            <p className="text-gray-400 text-lg">
              ثلاث خطوات بسيطة لبدء المنافسة
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition"></div>
              <div className="relative bg-slate-900/90 border border-purple-500/20 p-8 rounded-2xl text-center">
                <div className="text-6xl mb-4 text-purple-400 group-hover:scale-110 transition">📝</div>
                <div className="text-2xl font-bold mb-2">01</div>
                <h3 className="text-xl font-bold mb-3 text-purple-400">إنشاء حساب</h3>
                <p className="text-gray-400">
                  سجل ببريدك الإلكتروني ووثق هويتك ببطاقة التعريف الوطنية.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition"></div>
              <div className="relative bg-slate-900/90 border border-cyan-500/20 p-8 rounded-2xl text-center">
                <div className="text-6xl mb-4 text-cyan-400 group-hover:scale-110 transition">✅</div>
                <div className="text-2xl font-bold mb-2">02</div>
                <h3 className="text-xl font-bold mb-3 text-cyan-400">التحقق</h3>
                <p className="text-gray-400">
                  انتظر موافقة الإدارة (24-48 ساعة) للتحقق من هويتك.
                </p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition"></div>
              <div className="relative bg-slate-900/90 border border-purple-500/20 p-8 rounded-2xl text-center">
                <div className="text-6xl mb-4 text-purple-400 group-hover:scale-110 transition">🏆</div>
                <div className="text-2xl font-bold mb-2">03</div>
                <h3 className="text-xl font-bold mb-3 text-purple-400">انضم للبطولات</h3>
                <p className="text-gray-400">
                  ابدأ بالمشاركة في البطولات واربح الجوائز والعملات.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              لماذا CipherPool؟
            </h2>
            <p className="text-gray-400 text-lg">
              منصة مصممة خصيصاً للاعبين المحترفين
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {[
              { icon: "🛡️", title: "تحقق آمن", desc: "نظام تحقق صارم لضمان اللعب النظيف", color: "purple" },
              { icon: "💰", title: "نظام العملات", desc: "اكسب عملات يومياً واربح من البطولات", color: "cyan" },
              { icon: "💬", title: "شات متطور", desc: "نظام محادثة خاص باللاعبين والبطولات", color: "purple" },
              { icon: "📊", title: "ترتيب شهري", desc: "تنافس على الصدارة كل شهر", color: "cyan" },
              { icon: "🎮", title: "نظام بطولات", desc: "بطولات Battle Royale و Clash Squad", color: "purple" },
              { icon: "👑", title: "لوحة إدارة", desc: "نظام متكامل لإدارة المستخدمين والبطولات", color: "cyan" },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-6 rounded-xl hover:border-purple-500/40 transition group">
                <div className={`text-4xl mb-4 text-${feature.color}-400 group-hover:scale-110 transition`}>
                  {feature.icon}
                </div>
                <h3 className={`text-lg font-semibold text-${feature.color}-400 mb-2`}>
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-gradient-to-t from-purple-950/20 to-black">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              الأسئلة الشائعة
            </h2>
          </div>

          <div className="space-y-4">
            
            {[
              { q: "كيف يمكنني التسجيل؟", 
                a: "قم بإنشاء حساب، ثم ارفع صورة بطاقة التعريف الوطنية وصورة سيلفي مع البطاقة. سيقوم فريق الإدارة بمراجعة طلبك خلال 24-48 ساعة." },
              { q: "ما هي البطولات المتاحة؟", 
                a: "نقدم بطولات Battle Royale (50 لاعب) و Clash Squad (8 فرق) مع أنظمة لعب متعددة." },
              { q: "كيف أحصل على العملات؟", 
                a: "تحصل على 1 عملة كل 24 ساعة، بالإضافة إلى جوائز البطولات والمكافآت الخاصة." },
              { q: "هل المنصة مجانية؟", 
                a: "نعم، التسجيل والمشاركة في البطولات الأساسية مجاني. بعض البطولات الخاصة قد تتطلب عملات." },
            ].map((item, i) => (
              <details key={i} className="group">
                <summary className="glass-card p-6 rounded-xl cursor-pointer list-none">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-purple-400">{item.q}</span>
                    <span className="text-cyan-400 group-open:rotate-180 transition">▼</span>
                  </div>
                  <div className="mt-4 text-gray-400">
                    {item.a}
                  </div>
                </summary>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 text-center bg-gradient-to-r from-purple-900/30 to-cyan-900/30">
        <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
          مستعد للانضمام؟
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          انضم لأكثر من {stats.players.toLocaleString()} لاعب وابدأ رحلتك نحو الاحتراف
        </p>

        <Link
          to="/register"
          className="inline-block px-12 py-5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl font-bold text-xl hover:opacity-90 transition transform hover:scale-105 shadow-2xl shadow-purple-500/40"
        >
          أنشئ حسابك الآن
        </Link>
      </section>

      <footer className="border-t border-purple-500/20 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                CipherPool
              </h3>
              <p className="text-gray-500 text-sm">
                Morocco's premier Free Fire esports platform
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-300 mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Link to="/tournaments" className="hover:text-purple-400 transition">Tournaments</Link></li>
                <li><Link to="/leaderboard" className="hover:text-purple-400 transition">Leaderboard</Link></li>
                <li><Link to="/about" className="hover:text-purple-400 transition">About</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-300 mb-4">Support</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Link to="/support" className="hover:text-purple-400 transition">Help Center</Link></li>
                <li><Link to="/privacy" className="hover:text-purple-400 transition">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-purple-400 transition">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-300 mb-4">Contact</h4>
              <p className="text-gray-500 text-sm">contact@cipherpool.gg</p>
            </div>
          </div>
          <div className="border-t border-purple-500/20 mt-8 pt-8 text-center text-gray-600 text-sm">
            © 2026 CipherPool. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
}