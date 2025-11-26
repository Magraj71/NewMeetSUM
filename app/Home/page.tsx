"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      icon: "🎯",
      title: "Live Meetings",
      description: "Real-time video conferencing with AI-powered features",
      gradient: "from-[#8B6B61] to-[#6D4C41]",
      path: "/Home/metting"
    },
    {
      icon: "🎤",
      title: "Audio Analysis",
      description: "Upload audio files and get intelligent meeting summaries",
      gradient: "from-[#A1887F] to-[#8B6B61]",
      path: "/Home/audio-summarize"
    },
    {
      icon: "📝",
      title: "Text Summarization",
      description: "Paste transcripts for instant AI-powered insights",
      gradient: "from-[#6D4C41] to-[#5D4037]",
      path: "/Home/summarize"
    }
  ];

  const stats = [
    { number: "10K+", label: "Meetings Processed", icon: "📊" },
    { number: "95%", label: "Accuracy Rate", icon: "🎯" },
    { number: "5min", label: "Average Processing", icon: "⚡" },
    { number: "24/7", label: "Availability", icon: "🌐" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3EB] via-[#F5ECE3] to-[#EFE4D8] overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(93,64,55,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(93,64,55,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        
        {/* Animated Shapes */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#8B6B61]/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-40 left-20 w-96 h-96 bg-[#6D4C41]/10 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#D7CCC8]/20 rounded-full blur-3xl animate-pulse-slow"></div>
        
        {/* Decorative Dots */}
        <div className="absolute top-60 left-40 w-3 h-3 bg-[#8B6B61]/30 rounded-full animate-bounce"></div>
        <div className="absolute bottom-60 right-60 w-2 h-2 bg-[#6D4C41]/40 rounded-full animate-bounce delay-300"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-end">
            <button 
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-white/80 backdrop-blur-sm hover:bg-white text-[#5D4037] font-medium rounded-2xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className={`text-center transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#D7CCC8] shadow-lg mb-8">
              <div className="w-2 h-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-full animate-ping mr-2"></div>
              <span className="text-sm font-medium text-[#5D4037]">✨ AI-Powered Meeting Intelligence</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-[#3A2A1F] mb-8 leading-tight">
              Transform Your{" "}
              <span className="bg-gradient-to-r from-[#8B6B61] via-[#6D4C41] to-[#5D4037] bg-clip-text text-transparent">
                Meetings
              </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-[#6B4B35] mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              Experience the future of meetings with real-time AI assistance, automated summaries, 
              and intelligent insights that make every conversation more productive.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button
                onClick={() => router.push("/Home/metting")}
                className="group px-10 py-5 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 flex items-center space-x-4 border border-[#A1887F]"
              >
                <span className="text-lg">🚀 Start Smart Meeting</span>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              
              <div className="flex gap-4">
                <button
                  onClick={() => router.push("/Home/audio-summarize")}
                  className="px-8 py-5 bg-white/80 backdrop-blur-sm hover:bg-white text-[#5D4037] font-semibold rounded-2xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-500 hover:scale-105 flex items-center space-x-3 group shadow-lg hover:shadow-xl"
                >
                  <span className="text-2xl">🎤</span>
                  <span>Audio Analysis</span>
                </button>
                
                <button
                  onClick={() => router.push("/Home/summarize")}
                  className="px-8 py-5 bg-white/80 backdrop-blur-sm hover:bg-white text-[#5D4037] font-semibold rounded-2xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-500 hover:scale-105 flex items-center space-x-3 group shadow-lg hover:shadow-xl"
                >
                  <span className="text-2xl">📝</span>
                  <span>Text Summary</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-500 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold text-[#5D4037] mb-2">{stat.number}</div>
                  <div className="text-[#6B4B35] text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 bg-gradient-to-b from-white/50 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-[#3A2A1F] mb-6">
              Powerful{" "}
              <span className="bg-gradient-to-r from-[#8B6B61] to-[#5D4037] bg-clip-text text-transparent">
                Features
              </span>
            </h2>
            <p className="text-xl text-[#6B4B35] max-w-3xl mx-auto font-medium">
              Choose the perfect AI-powered solution for your meeting needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                onClick={() => router.push(feature.path)}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl border border-[#D7CCC8] hover:border-[#8B6B61] p-8 cursor-pointer transition-all duration-700 hover:scale-105 overflow-hidden shadow-xl hover:shadow-2xl"
              >
                {/* Gradient Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Animated Border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-[#8B6B61]/10 to-transparent transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`w-20 h-20 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg border border-[#A1887F]`}>
                    <span className="text-3xl text-white">{feature.icon}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-[#5D4037] mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-[#6B4B35] leading-relaxed mb-6 font-medium">
                    {feature.description}
                  </p>
                  
                  <button className="w-full py-3 bg-white hover:bg-[#8B6B61]/10 text-[#5D4037] font-semibold rounded-xl border border-[#D7CCC8] hover:border-[#8B6B61] transition-all duration-300 group-hover:scale-105 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md">
                    <span>Get Started</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live Demo CTA */}
          <div className="mt-20 text-center">
            <div className="bg-gradient-to-r from-[#8B6B61]/10 to-[#6D4C41]/10 backdrop-blur-sm rounded-3xl p-12 border border-[#D7CCC8] max-w-4xl mx-auto shadow-xl">
              <h3 className="text-3xl md:text-4xl font-black text-[#3A2A1F] mb-6">
                Ready to Experience AI-Powered Meetings?
              </h3>
              <p className="text-[#6B4B35] text-lg mb-8 max-w-2xl mx-auto font-medium">
                Join thousands of professionals who transformed their meeting culture with intelligent automation.
              </p>
              <button
                onClick={() => router.push("/Home/metting")}
                className="px-12 py-4 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-105 flex items-center space-x-3 mx-auto group border border-[#A1887F]"
              >
                <span className="text-lg">🎬 Start Live Demo</span>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white/80 backdrop-blur-sm border-t border-[#D7CCC8] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center shadow-lg border border-[#A1887F]">
              <span className="text-white font-bold text-lg">MS</span>
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-[#5D4037] to-[#3A2A1F] bg-clip-text text-transparent">
              MeetSum
            </span>
          </div>
          
          <p className="text-[#6B4B35] text-lg mb-8 max-w-2xl mx-auto font-medium">
            Revolutionizing meetings with artificial intelligence. Smarter conversations, better outcomes.
          </p>
          
          <div className="flex justify-center space-x-6 mb-8">
            {['Features', 'Pricing', 'Documentation', 'Support'].map((item, index) => (
              <a key={index} href="#" className="text-[#6B4B35] hover:text-[#5D4037] transition-colors duration-300 font-medium">
                {item}
              </a>
            ))}
          </div>
          
          <div className="text-[#8B6B61] text-sm">
            © 2024 MeetSum. Transforming conversations with intelligence.
          </div>
        </div>
      </footer>
    </div>
  );
}