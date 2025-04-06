'use client';

import { StudentValueButton } from '@/app/ui/students/buttons';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function StudentFile(st)
 {
 
  const student = st[0];
 

  return <div>
      {student?.map((stud) => {
        return(
        <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
          <p>Nombre: {stud.fName} {stud.lName}</p>
          <p>Número de Identificación: {stud.ced}</p>
          <p>Dirección: {stud.street}, {stud.ward}, {stud.district}, {stud.dep}, {stud.state}, {stud.country}.</p>
          <p>Encargado: {stud.tutor}, Tel: {stud.tutorPhone}, Correo: {stud.tutorEmail}</p>
          
          <Link
            href={`/dashboard/${stud._id}/student-file/update`}
            className="flex w-min h-10 gap-3 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="hidden md:block">Actualizar</span>{' '}
            <PencilIcon className="w-5" />
          </Link>
        </div>
      )})}
    </div>
}

export function StudentValue(st)
{
  const student = st[0];
  return <div>
    {student?.map((stud) => {
      
      if (!stud.valoracion) {
        return (
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
            <h1>{stud.fName} {stud.lName} {stud._id}</h1>
            <div className="pb-5"> No cuenta con una Valoracion Integral</div>
            < StudentValueButton {...stud._id}/>
          </div>
        )}
      else {  
        return(
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
            <h1>{stud.fName} {stud.lName}</h1>
            <div> Valoración</div>

          </div>
      )}})}
  </div>
};
 
