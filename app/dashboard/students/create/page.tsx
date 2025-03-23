import Form from '@/app/ui/students/create-form';
import Breadcrumbs from '@/app/ui/students/breadcrumbs';
import { Metadata } from 'next';
 
export const metadata: Metadata = {
  title: 'Nuevo Estudiante',
};
 
export default function Page() {
 
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Estudiantes', href: '/dashboard/students' },
          {
            label: 'Nuevo Estudiante',
            href: '/dashboard/students/create',
            active: true,
          },
        ]}
      />
      <Form />
    </main>
  );
}