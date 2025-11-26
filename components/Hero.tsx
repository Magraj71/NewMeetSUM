import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF8F5] via-[#FDF2EC] to-[#FAE8DC] overflow-hidden">
      
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(93,64,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(93,64,55,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        
        {/* Gradient Overlays */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#5D4037]/5 to-transparent"></div>

        {/* Animated Floating Shapes */}
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-r from-[#8B6B61]/20 to-[#D7CCC8]/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-[#6D4C41]/15 to-[#A1887F]/15 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-gradient-to-r from-[#EFEBE9]/20 to-[#D7CCC8]/20 rounded-full blur-3xl animate-float-reverse"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-40 right-40 w-6 h-6 bg-[#8B6B61]/30 rounded-full animate-bounce"></div>
        <div className="absolute bottom-40 left-40 w-4 h-4 bg-[#6D4C41]/40 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-[#5D4037]/30 rounded-full animate-bounce delay-700"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-4 md:px-8 flex flex-col justify-center items-center text-center max-w-6xl mx-auto">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#D7CCC8] rounded-full px-6 py-3 mb-8 shadow-lg">
          <div className="w-2 h-2 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-[#5D4037]">
            ✨ AI-Powered Summaries in Seconds
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-[#3A2A1F] mb-8 leading-tight">
          Summarize{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B6B61] via-[#6D4C41] to-[#5D4037] relative">
            Smarter
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-[#8B6B61] to-[#5D4037] rounded-full"></div>
          </span>
          ,<br />
          <span className="relative">
            Not Harder
            <div className="absolute -bottom-4 right-0 text-4xl">⚡</div>
          </span>
        </h1>
        
        {/* Subheading */}
        <p className="text-xl md:text-2xl text-[#6B4B35] mb-12 max-w-3xl leading-relaxed font-medium">
          Transform lengthy texts into clear, concise summaries instantly with our 
          <span className="font-semibold text-[#5D4037]"> advanced AI technology</span>. 
          Save time, stay informed, and focus on what truly matters.
        </p>

        {/* CTA Section */}
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-16">
          <Link href="/Home">
            <Button className="px-12 py-6 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-3xl border border-[#A1887F] group relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                🚀 Get Started Free
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#6D4C41] to-[#5D4037] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Button>
          </Link>
          
          <Link href="/features">
            <Button variant="outline" className="px-10 py-6 border-2 border-[#D7CCC8] text-[#5D4037] hover:bg-[#8B6B61]/10 hover:border-[#8B6B61] font-semibold text-lg rounded-2xl transition-all duration-300 hover:scale-105">
              📚 See Features
            </Button>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-2xl">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-[#5D4037]">99%</div>
            <div className="text-sm text-[#6B4B35]">Accuracy Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-[#5D4037]">10s</div>
            <div className="text-sm text-[#6B4B35]">Average Processing</div>
          </div>
          <div className="text-center col-span-2 md:col-span-1">
            <div className="text-2xl md:text-3xl font-bold text-[#5D4037]">50K+</div>
            <div className="text-sm text-[#6B4B35]">Summaries Generated</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-[#8B6B61]/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-[#8B6B61] rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default Hero;