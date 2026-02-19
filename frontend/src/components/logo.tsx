
import { cn } from '../lib/utils';
import Link from 'next/link';

type LogoProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
};

export function Logo({ className, href = '/', ...props }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-center gap-2 text-sidebar-foreground',
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
