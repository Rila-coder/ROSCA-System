import { 
  Lock, 
  Bell, 
  Users, 
  BarChart3, 
  Smartphone, 
  Zap, 
  Share2, 
  Calendar,
  Shield,
  TrendingUp,
  Globe,
  Cloud,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Award,
  Wallet,
  Clock,
  ShieldCheck,
  Target,
  Users as UsersIcon
} from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <Shield className="text-white" size={28} />,
    title: "Bank-Grade Security",
    description: "Enterprise-grade encryption & compliance. Your funds are as secure as in a bank.",
    gradient: "from-blue-600 to-indigo-700",
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    delay: "0"
  },
  {
    icon: <TrendingUp className="text-white" size={28} />,
    title: "Real-Time Analytics",
    description: "Live dashboards with payment tracking, progress charts, and financial insights.",
    gradient: "from-emerald-600 to-teal-700",
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    delay: "100"
  },
  {
    icon: <Users className="text-white" size={28} />,
    title: "Smart Role Management",
    description: "Assign leaders with granular permissions. Seamless member onboarding.",
    gradient: "from-violet-600 to-purple-700",
    bg: "bg-gradient-to-br from-violet-50 to-purple-50",
    delay: "200"
  },
  {
    icon: <Zap className="text-white" size={28} />,
    title: "Automated Workflows",
    description: "Automatic reminders, payment tracking, and distribution calculations.",
    gradient: "from-amber-600 to-orange-700",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    delay: "0"
  },
  {
    icon: <Globe className="text-white" size={28} />,
    title: "Multi-Platform Access",
    description: "Fully responsive design that works flawlessly on all devices.",
    gradient: "from-cyan-600 to-sky-700",
    bg: "bg-gradient-to-br from-cyan-50 to-sky-50",
    delay: "100"
  },
  {
    icon: <Cloud className="text-white" size={28} />,
    title: "Cloud Reliability",
    description: "99.9% uptime guarantee with automatic backups and data redundancy.",
    gradient: "from-slate-700 to-slate-900",
    bg: "bg-gradient-to-br from-slate-50 to-gray-50",
    delay: "200"
  },
  {
    icon: <RefreshCw className="text-white" size={28} />,
    title: "Flexible Scheduling",
    description: "Daily, weekly, or monthly contributions. Custom cycles to fit any group.",
    gradient: "from-rose-600 to-pink-700",
    bg: "bg-gradient-to-br from-rose-50 to-pink-50",
    delay: "0"
  },
  {
    icon: <CheckCircle className="text-white" size={28} />,
    title: "Complete Transparency",
    description: "Every transaction visible to authorized members. Build trust effortlessly.",
    gradient: "from-green-600 to-emerald-700",
    bg: "bg-gradient-to-br from-green-50 to-emerald-50",
    delay: "100"
  }
];

// Trusted companies logos (you can replace with actual logos)
const trustedCompanies = [
  { name: "TechCorp", logo: "TC" },
  { name: "GlobalBank", logo: "GB" },
  { name: "SecureFin", logo: "SF" },
  { name: "TrustGroup", logo: "TG" },
  { name: "CapitalPlus", logo: "CP" },
  { name: "WealthBuild", logo: "WB" }
];

const comingSoonPath = "/public-invite/relocat";

export default function FeaturesSection() {
  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-blue-50/30 to-transparent"></div>
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-20">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 md:px-6 md:py-3 rounded-full mb-4 md:mb-6 shadow-lg shadow-blue-500/25">
            <Sparkles size={16} className="md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-semibold tracking-wide">WHY CHOOSE ROSCA</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">
            Designed for
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Modern Savings Groups
            </span>
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto px-2">
            Combining traditional trust with cutting-edge technology to create 
            the most secure, transparent, and efficient savings experience.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 md:mb-20">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              {/* --- FIX 1: CORRECTED HOVER BACKGROUND --- */}
              {/* Removed the complex 'style' tag. Using Tailwind classes directly works perfectly. */}
              <div 
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${feature.gradient}`}
              ></div>
              
              {/* Content */}
              {/* Added 'relative z-10' to ensure text sits ON TOP of the gradient */}
              <div className="relative z-10 p-6 md:p-8 h-full">
                
                {/* Icon Container */}
                <div className={`relative mb-6 p-4 rounded-xl w-fit shadow-lg bg-gradient-to-br ${feature.gradient} group-hover:scale-110 transition-transform duration-300`}>
                   {/* Fix from previous step: Ensure Icon is visible */}
                   <div className="relative z-10">
                    {feature.icon}
                   </div>
                   <div className="absolute inset-0 bg-white/10 rounded-xl backdrop-blur-sm"></div>
                </div>
                
                {/* Feature Content */}
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-white transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed group-hover:text-white/90 transition-colors duration-300">
                    {feature.description}
                  </p>
                  
                  {/* Decorative Line */}
                  <div className="pt-3 md:pt-4">
                    <div className={`h-1 w-10 md:w-12 rounded-full bg-gradient-to-r ${feature.gradient} transition-all duration-500 group-hover:w-16 md:group-hover:w-20 group-hover:bg-white/70`}></div>
                  </div>
                </div>
                
                {/* Corner Accent */}
                {/* Added group-hover:opacity-0 to hide the corner accent when the full gradient appears */}
                <div className={`absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 overflow-hidden rounded-tr-xl md:rounded-tr-2xl pointer-events-none group-hover:opacity-0 transition-opacity duration-300`}>
                  <div className={`absolute -top-6 -right-6 w-12 h-12 md:-top-8 md:-right-8 md:w-16 md:h-16 rotate-45 bg-gradient-to-br ${feature.gradient} opacity-10`}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Stats Banner */}
        <div className="bg-[#1e3a8a] rounded-2xl md:rounded-3xl p-6 md:p-10 mb-12 md:mb-16 relative overflow-hidden">
          {/* Preserved Background Design */}
          <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full -translate-y-16 md:-translate-y-32 translate-x-8 md:translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 md:w-64 md:h-64 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 rounded-full translate-y-8 md:-translate-y-16 -translate-x-8 md:-translate-x-16"></div>
          
          <div className="relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 text-center">
              {[
                { value: "10K+", label: "Active Groups", icon: <UsersIcon className="text-blue-300" size={32} /> },
                { value: "₹500Cr+", label: "Managed Assets", icon: <Wallet className="text-emerald-300" size={32} /> },
                { value: "99.9%", label: "Uptime", icon: <Clock className="text-amber-300" size={32} /> },
                { value: "4.9★", label: "User Rating", icon: <Award className="text-rose-300" size={32} /> }
              ].map((stat, index) => (
                <div key={index} className="flex flex-col items-center justify-center p-2">
                  {/* Icon Container - Increased Padding & Size */}
                  <div className="mb-3 md:mb-4">
                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm ring-1 ring-white/10 shadow-inner">
                      {/* Responsive Icon Size: Manual adjustment via cloning or CSS classes can be done, but keeping it simple here */}
                      <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                         {stat.icon}
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats Number - Reduced from 5xl to 4xl for balance */}
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">
                    {stat.value}
                  </div>
                  
                  {/* Label - Improved Contrast */}
                  <div className="text-blue-200/90 text-xs sm:text-sm font-medium uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl blur-xl opacity-30"></div>
          <div className="relative bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12 shadow-xl md:shadow-2xl border border-gray-100">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 text-gray-800 px-4 py-2 rounded-full mb-4 md:mb-6">
                <Sparkles size={16} className="text-blue-600" />
                <span className="text-xs md:text-sm font-semibold">READY TO BEGIN</span>
              </div>
              
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
                Start Your Journey to
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  {" "}Financial Freedom
                </span>
              </h3>
              
              <p className="text-gray-600 text-sm sm:text-base md:text-lg mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
                Join thousands who've transformed their savings habits with our 
                secure, transparent, and efficient platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center mb-8 md:mb-10">
                <button className="group relative px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg md:rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Link href="/login" className="z-10">
                    <span className="text-sm md:text-base">Create Free Account</span>
                  </Link>
                  <ArrowRight size={18} className="md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-lg md:rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                </button>
                
                <button className="group px-6 py-3 md:px-8 md:py-4 bg-white border-2 border-gray-200 text-gray-800 font-semibold rounded-lg md:rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 w-full sm:w-auto">
                  <Link href={`${comingSoonPath}?title=View Live Demo`} className="z-10">
                    <span className="text-sm md:text-base">View Live Demo</span>
                  </Link>
                  <div className="w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
              
              {/* Trust Badges */}
              <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-gray-100">
                <p className="text-gray-500 text-xs md:text-sm mb-3 md:mb-4">Trusted by organizations worldwide</p>
                <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 lg:gap-8">
                  {trustedCompanies.map((company, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-center w-16 h-10 md:w-20 md:h-12 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-300 group"
                    >
                      <span className="text-gray-700 font-bold text-sm md:text-base group-hover:text-blue-600 transition-colors">
                        {company.logo}
                      </span>
                      <div className="absolute -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                        {company.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Elements */}
      <div className="hidden md:block absolute top-1/4 left-4 w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
      <div className="hidden md:block absolute top-1/3 right-8 w-3 h-3 bg-purple-400 rounded-full animate-pulse delay-300"></div>
      <div className="hidden md:block absolute bottom-1/4 left-10 w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-700"></div>
    </section>
  );
}