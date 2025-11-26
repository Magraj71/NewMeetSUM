"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "@/config/firebaseConfig";
import { toast } from "sonner";
import { useGetUserInfo } from "@/hooks/useGetUserInfo";
import { useState, useEffect } from "react";

const Navbar = () => {
  const { isAuth, name, userEmail } = useGetUserInfo();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const signInWithGoogle = async () => {
    const results = await signInWithPopup(auth, provider);

    const authInfo = {
      userId: results.user.uid,
      userEmail: results.user.email,
      name: results.user.displayName,
      isAuth: true,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("auth", JSON.stringify(authInfo));
    }

    window.location.reload();
    toast.success("Signed in successfully");
  };

  const signUserOut = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
      window.location.reload();
      toast.success("Logged out successfully.");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <nav className={`bg-gradient-to-r from-[#5D4037] via-[#6D4C41] to-[#5D4037] border-b border-[#4E342E] shadow-2xl sticky top-0 z-50 transition-all duration-300 ${
      scrolled ? "py-2" : "py-0"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-[#8B6B61] to-[#6D4C41] rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl border border-[#A1887F]">
                <span className="text-white font-bold text-lg">MS</span>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] rounded-2xl opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></div>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl font-black bg-gradient-to-r from-white to-[#D7CCC8] bg-clip-text text-transparent">
                MeetSum
              </span>
              <div className="h-1 w-0 group-hover:w-full bg-gradient-to-r from-[#8B6B61] to-[#D7CCC8] transition-all duration-300 rounded-full mt-1"></div>
            </div>
          </Link>

          {/* Authenticated */}
          {isAuth ? (
            <div className="flex items-center space-x-6">

              {/* Nav Links */}
              <div className="flex items-center space-x-1 bg-[#4E342E]/50 backdrop-blur-sm rounded-2xl p-1.5 border border-[#8B6B61] shadow-lg">
                <Link
                  href="/Home/summarize"
                  className="relative px-5 py-2.5 text-[#EFEBE9] hover:text-white font-semibold rounded-xl transition-all duration-300 group"
                >
                  <span>Summarize</span>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#D7CCC8] to-[#8B6B61] group-hover:w-4/5 transition-all duration-300 rounded-full"></div>
                </Link>

                <Link
                  href="/Home/history"
                  className="relative px-5 py-2.5 text-[#EFEBE9] hover:text-white font-semibold rounded-xl transition-all duration-300 group"
                >
                  <span>History</span>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-[#D7CCC8] to-[#8B6B61] group-hover:w-4/5 transition-all duration-300 rounded-full"></div>
                </Link>
              </div>

              {/* User */}
              <div className="flex items-center space-x-4">
                <div className="hidden lg:flex flex-col items-end text-right">
                  <span className="text-sm font-semibold text-white">
                    {name || "Welcome Back!"}
                  </span>
                  <span className="text-xs text-[#D7CCC8] truncate max-w-[120px]">
                    {userEmail}
                  </span>
                </div>

                <div className="w-10 h-10 bg-gradient-to-br from-[#8B6B61] to-[#6D4C41] rounded-xl flex items-center justify-center text-white font-semibold shadow-lg border border-[#A1887F]">
                  {name ? name.charAt(0).toUpperCase() : "U"}
                </div>

                <Button
                  onClick={signUserOut}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-semibold rounded-xl border border-[#A1887F] shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={signInWithGoogle}
              className="px-6 py-3 bg-gradient-to-r from-[#8B6B61] to-[#6D4C41] hover:from-[#6D4C41] hover:to-[#5D4037] text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-[#A1887F] hover:scale-105"
            >
              Sign In with Google
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;