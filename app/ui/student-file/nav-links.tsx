'use client';

import {
  IdentificationIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.

export default function NavLinks() {
  const pathname = usePathname();
  const sId = window.localStorage.getItem("studentId");
  const links = [
    { name: 'Perfil', href: "/dashboard/" + sId + "/student-file", icon: IdentificationIcon},
    { name: 'Valoración', href: "/dashboard/" + sId + "/value", icon: ClipboardDocumentListIcon },
    { name: 'Plan', href:  "/dashboard/" + sId + "/plan", icon: DocumentCheckIcon},
    { name: 'Informe', href:  "/dashboard/" + sId + "/report", icon: ChartBarIcon },
  ];

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-blue-200 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-sky-100 text-blue-600': pathname === link.href,
              },
            )}
          >
            <LinkIcon className="w-6" />
            <p>{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}
