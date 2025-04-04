'use client';

import { StudentValueButton } from '@/app/ui/students/buttons';

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
 
