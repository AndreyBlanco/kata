import Link from 'next/link';
import NavLinks from '@/app/ui/student-file/nav-links';

export default function StudentSideNav() {

  return (
    <div className="flex gap-1 flex-row pb-2">
        <NavLinks />
    </div>
  );
}