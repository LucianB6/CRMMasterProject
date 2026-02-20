"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

export default function LegacyCompanySignupRedirectPage() {
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search;
    router.replace(`/signup/google-onboarding-company${search}`);
  }, [router]);

  return null;
}
