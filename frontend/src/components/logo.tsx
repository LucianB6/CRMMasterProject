import Link from "next/link";

import { cn } from "../lib/utils";

type LogoProps = Omit<React.ComponentPropsWithoutRef<"a">, "href">;

export function Logo({ className, ...props }: LogoProps) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 8L12 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 11L12 7L16 11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-headline text-xl font-bold">SalesWay</span>
    </Link>
  );
}
