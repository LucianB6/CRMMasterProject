import { cn } from '../lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import selfCRMLogo from '../assets/selfCRMLogo.svg';

type LogoProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
};

export function Logo({ className, href = '/', ...props }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center',
        className
      )}
      {...props}
    >
      <Image src={selfCRMLogo} alt="selfCRM" className="h-32 w-auto" priority />
    </Link>
  );
}
