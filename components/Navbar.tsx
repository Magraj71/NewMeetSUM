"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, provider } from "@/config/firebaseConfig";
import { toast } from "sonner";
import { useGetUserInfo } from "@/hooks/useGetUserInfo";

const Navbar = () => {
  const { isAuth } = useGetUserInfo();

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

    toast("Signed in successfully");
  };

  const signUserOut = async () => {
    try {
      await signOut(auth);

      if (typeof window !== "undefined") {
        localStorage.clear();
      }

      window.location.reload();

      toast("Logged out successfully.");
    } catch (error) {
      console.log(error)
    }
  };
  return (
    <div className="bg-black text-white flex justify-between items-center py-5 px-4 md:px-8">
      <div className="text-lg font-semibold">
        <Link href={"/"}>AISum</Link>
      </div>

      {isAuth ? (
        <div className="flex items-center space-x-4 md:space-x-6">
          <Link href="/summarize" className="hover:underline">
            Summarize
          </Link>

          <Link href="/history" className="hover:underline">
            History
          </Link>

          <Button onClick={signUserOut}>Log Out</Button>
        </div>
      ) : (
        <div>
          <Button onClick={signInWithGoogle}>Sign In</Button>
        </div>
      )}
    </div>
  );
};

export default Navbar;
