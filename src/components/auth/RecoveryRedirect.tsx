"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** リセットリンクが / 等に落ちた場合も /reset/update へ誘導する */
export function RecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();

    const hash = window.location.hash;
    if (hash.includes("type=recovery") && pathname !== "/reset/update") {
      router.replace(`/reset/update${hash}`);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && pathname !== "/reset/update") {
        router.replace("/reset/update");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
