'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface NavLinkProps {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
}

/** A menu link. It is the current page when the path is its href or sits under it. */
export function NavLink({ href, icon, children }: NavLinkProps) {
  const pathname = usePathname();
  const current = pathname === href || pathname?.startsWith(`${href}/`);
  return (
    <Link href={href} className="bb-nav__item" aria-current={current ? 'page' : undefined}>
      {icon ? (
        <span className="bb-nav__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </Link>
  );
}
