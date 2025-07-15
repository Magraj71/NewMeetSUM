"use client";

import { useEffect, useState } from "react";

export const useGetUserInfo = () => {
  const [userInfo, setUserInfo] = useState({
    name: "",
    userId: "",
    userEmail: "",
    isAuth: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("auth");

      if (storedData) {
        setUserInfo(JSON.parse(storedData));
      }
    }
  }, []);

  return userInfo;
};
