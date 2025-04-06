'use client'

import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

import { deleteStudent } from '@/lib/actions';
import { ObjectId } from 'mongodb';

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

export function StudentFile( { id }: { id: String } ) {
  
  
  return (
    <Link
      href={`./${id}/student-file`}
      className="rounded-md border p-2 hover:bg-gray-100"
      onClick={() => window.localStorage.setItem("studentId", `${id}`)} 
    >
      <PencilIcon className="w-5" />
    </Link>
  );
}


export function StudentValueButton( { id }: { id: String } ) {

  console.log(id);
  
  return (
    <Link
      href={`./value/create`}
      className="flex w-min h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" 
    >
      <span className="hidden md:block">Valorar Ahora</span>{' '}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function UpdateValueButton( { id }: { id: String } ) {

  console.log(id);
  
  return (
    <Link
      href={`./value/update`}
      className="flex w-min h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" 
    >
      <span className="hidden md:block">Actualizar</span>{' '}
      <PlusIcon className="h-5 md:ml-4" />
    </Link>
  );
}

export function DeleteStudent({ id }: { id: ObjectId }) {
 /* const deleteStudentWithId = deleteStudent.bind(null, id);

  return (
    <form action={deleteStudentWithId}>
      <button type="submit" className="rounded-md border p-2 hover:bg-gray-100">
        <span className="sr-only">Eliminar</span>
        <TrashIcon className="w-5" />
      </button>
    </form>
  );*/
}
