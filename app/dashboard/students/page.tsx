import Pagination from '@/app/ui/students/pagination';
import Search from '@/app/ui/search';
import Table from '@/app/ui/students/table';
import { CreateStudent } from '@/app/ui/students/buttons';
import { StudentsTableSkeleton } from '@/app/ui/skeletons';
import { Suspense } from 'react';
import { fetchStudentsPages } from '@/lib/data';

export default async function Page(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const totalPages = await fetchStudentsPages(query);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1>Estudiantes</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Buscar Estudiante..." />
        <CreateStudent />
      </div>
      {<Suspense key={query + currentPage} fallback={<StudentsTableSkeleton />}>
        <Table query={query} currentPage={currentPage} />
      </Suspense>}
      <div className="mt-5 flex w-full justify-center">
        {<Pagination totalPages={totalPages} /> }
      </div>
    </div>
  );
}