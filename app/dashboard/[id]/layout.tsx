'use client'
import StudentSideNav from '@/app/ui/student-file/sidenav';

export default function Layout({children}: {children: React.ReactNode}) {
 
  return (
    <div id="barra" className="flex h-screen flex-col md:overflow-hidden">
      < StudentSideNav />
      <div className="flex-grow md:overflow-y-auto">{children}</div>
    </div>
  );
}