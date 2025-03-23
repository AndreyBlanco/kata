import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

import { deleteStudent } from '@/lib/actions';

export function CreateStudent() {
  return (
    <Link
      href="/dashboard/students/create"
      className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="hidden md:block">Nuevo Estudiante</span>{' '}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function UpdateStudent({ id }: { id: string }) {
  return (
    <Link
      href={`/dashboard/students/${id}/edit`}
      className="rounded-md border p-2 hover:bg-gray-100"
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}

export function DeleteStudent({ id }: { id: string }) {
  const deleteStudentWithId = deleteStudent.bind(null, id);

  return (
    <form action={deleteStudentWithId}>
      <button type="submit" className="rounded-md border p-2 hover:bg-gray-100">
        <span className="sr-only">Eliminar</span>
        <TrashIcon className="w-5" />
      </button>
    </form>
  );
}
