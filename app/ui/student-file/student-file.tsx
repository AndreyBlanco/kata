'use client';

import { StudentValueButton, UpdateValueButton } from '@/app/ui/students/buttons';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function StudentFile(st)
 {
 
  const student = st[0];
 

  return <div>
      {student?.map((stud) => {
        return(
        <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
          <p>Nombre: {stud.datos.fName} {stud.datos.lName}</p>
          <p>Número de Identificación: {stud.datos.ced}</p>
          <p>Dirección: {stud.datos.street}, {stud.datos.ward}, {stud.datos.district}, {stud.datos.dep}, {stud.datos.state}, {stud.datos.country}.</p>
          <p>Encargado: {stud.datos.tutor}, Tel: {stud.datos.tutorPhone}, Correo: {stud.datos.tutorEmail}</p>
          
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
            <h1>{stud.datos.fName} {stud.datos.lName} {stud._id}</h1>
            <div className="pb-5"> No cuenta con una Valoracion Integral</div>
            < StudentValueButton {...stud._id}/>
          </div>
        )}
      else {  
        return(
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
            <h1>{stud.datos.fName} {stud.datos.lName}</h1>
            <div>
              <h1>Valoración</h1>
              <ul className="list-disc list-inside">
                {stud.valoracion.invierte=="si" && <li>Invierte las palabras</li>}
              </ul>
            </div>
            < UpdateValueButton {...stud._id}/>
          </div>
      )}})}
  </div>
};
 
