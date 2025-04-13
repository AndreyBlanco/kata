'use client';

import { StudentValueButton, UpdateValueButton, StudentPlanButton, UpdatePlanButton } from '@/app/ui/students/buttons';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Situacion} from '@/app/ui/students/report';
import Link from 'next/link';

export default function StudentFile(st)
 {
 
  const student = st[0];

  return <div>
      {student?.map((stud) => {
        return(
        <div key={stud._id} className="rounded-md bg-gray-50 p-4">
          <p>Nombre: {stud.datos.fName} {stud.datos.lName}</p>
          <p>Número de Identificación: {stud.datos.ced}</p>
          <p>Dirección: {stud.datos.street}, {stud.datos.ward}, {stud.datos.district}, {stud.datos.dep}, {stud.datos.state}, {stud.datos.country}.</p>
          <p>Encargado: {stud.datos.tutor}, Tel: {stud.datos.tutorPhone}, Correo: {stud.datos.tutorEmail}</p>
          
          <Link
            href={`/dashboard/${stud._id}/student-file/update`}
            className="flex w-min h-10 gap-3 items-center rounded-lg bg-blue-600 px-4 mt-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="hidden md:block">Actualizar</span>{' '}
            <PencilIcon className="w-5" />
          </Link>
        </div>
      )})}
    </div>
}

function Complete(student) {
  var complete = true;
  
  student[0].valoracion?.map((stud) =>
  {
    
    if (stud.value == null) {
      complete = false;
    }
    
  });
  
  if (complete) {
    return (<h1>Valoración COMPLETA</h1>)
  }
  return (<h1 className="text-red-500">Valoración INCOMPLETA</h1>);
}

export function StudentValue(st)
{
  const student = st[0];
  return <div>
    {student?.map((stud) => {
      
      if (!stud.valoracion) {
        return (
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
            <h1>{stud.datos.fName} {stud.datos.lName}</h1>
            <div className="pb-5"> No cuenta con una Valoracion Integral</div>
            < StudentValueButton {...stud._id}/>
          </div>
        )}
      else {  
        return(
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
            <h1>{stud.datos.fName} {stud.datos.lName}</h1>
            <div>
              < Complete {...student}/>
              <div className="border-y-2 py-2 ">
                Contexto de Aula
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="contexto" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Grafía y Motricidad
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="grafia" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Motricidad Corporal-Global
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="motricidad" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Percepción Visual
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="visual" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Percepción Auditiva
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="auditiva" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Interiorización del Espacio
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="espacio" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Interiorización del Tiempo
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="tiempo" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Madurez Emocional
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="madurez" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Dificultades Epecíficas del Aprendizaje de la Lectura y Escritura
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="lectoescritura" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Dificultades Ortográficas
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="ortograficas" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
              <div className="border-y-2 py-2 ">
                Dificultades Específicas del Aprendizaje de las Matemáticas
                <ul className="list-disc list-inside">
                  {stud.valoracion?.map((valor) => {
                    return (
                      valor.value=="si" && valor.area=="matematicas" && <li>{valor.texto}</li>
                    )
                  })}
                </ul>
              </div>
            </div>
            < UpdateValueButton {...stud._id}/>
          </div>
      )}})}
  </div>
};
 
export function StudentPlan(st)
{
  const student = st[0];
  return <div>
    {student?.map((stud) => {
      
      if (!stud.plan) {
        return (
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
            <h1>{stud.datos.fName} {stud.datos.lName}</h1>
            <div className="pb-5"> No cuenta con un Plan de Apoyo</div>
            < StudentPlanButton {...stud._id}/>
          </div>
        )
      } else {  
        return ( 
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">
            <h1>{stud.datos.fName} {stud.datos.lName}</h1>
            <div>
              <h1>Plan de Apoyo</h1>
            </div>
            <div className="border-t-2 py-2 ">
              Procesos implicados en el aprendizaje
              <ul className="list-disc list-inside">
                {stud.plan.percepcion=="percepcion" && <li>Percepción</li>}
                {stud.plan.atencion=="atencion" && <li>Atencion</li>}
                {stud.plan.emocion=="emocion" && <li>Emoción</li>} 
                {stud.plan.motivacion=="motivacion" && <li>Motivación</li>} 
                {stud.plan.memorias=="memorias" && <li>Memorias</li>}
                {stud.plan.funciones=="funciones" && <li>Funciones Ejecutivas</li>}                  
              </ul>
            </div>
            <div className="border-t-2 py-2 ">
              Dificultades específicas del aprendizaje
              <ul className="list-disc list-inside">
                {stud.plan.dislexia=="dislexia" && <li>Dislexia</li>}
                {stud.plan.discalculia=="discalculia" && <li>Discalculia</li>}
                {stud.plan.disortografia=="disortografia" && <li>Disortogafía</li>} 
                {stud.plan.disgrafia=="disgrafia" && <li>Disgrafía</li>} 
                {stud.plan.dispraxia=="dispraxia" && <li>Dispraxia</li>} 
                {stud.plan.verbal=="verbal" && <li>Transtorno del aprendizaje no verbal</li>}
                {stud.plan.lento=="lento" && <li>Perfiles de aprendizaje lento</li>}
                {stud.plan.tda=="tda" && <li>Trastorno por déficit de atención</li>}                  
              </ul>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="relative border-2">
                <h1 className="text-center p-2 bg-gray-200">Puntos fuertes o fortalezas</h1>
                <textarea rows="10" className="block p-2.5 w-full p-2">{stud.plan.fortalezas}</textarea>                
              </div>
              <div className="relative border-2 ">
                <h1 className="text-center p-2 bg-gray-200">Estrategias para la mediación</h1>
                <textarea rows="10" className="block p-2.5 w-full p-2">{stud.plan.mediacion}</textarea>                 
              </div>
              <div className="relative border-2 ">
                <h1 className="text-center p-2 bg-gray-200">Estrategias de apoyo para la casa</h1>
                <textarea rows="10" className="block p-2.5 w-full p-2">{stud.plan.casa}</textarea>                 
              </div>
              <div className="relative border-2">
                <h1 className="text-center p-2 bg-gray-200">Estrategias específicas</h1>
                <textarea rows="10" className="block p-2.5 w-full p-2">{stud.plan.especificas}</textarea>                 
              </div>
            </div>
            < UpdatePlanButton {...stud._id}/>
          </div>
        )
      }})
  }  
  </div>
};

export async function StudentReport(st)
{
  const student = st[0];
  var situacion = "";
  
  const stud = student[0];

  stud.valoracion?.map((valor) => {
    if (valor.value!="no") {
      situacion = situacion + valor.texto + ". ";
    };    
  });

  const aspectos = stud.plan.fortalezas;
  const apoyos = stud.plan.mediacion + '\n' + stud.plan.especificas;
  console.log(stud.plan.mediacion);
  const sugerencias = stud.plan.casa;

  return <div>
    {student?.map((stud) => {
      
      return ( 
          <div key={stud._id} className="rounded-md bg-gray-50 p-4 ">      
            <div className="grid gap-3 mb-3">
              <div className="relative border-2">
                <h1 className="text-center p-2 bg-gray-200">Situación Actual del Estudiante</h1>
                <textarea rows="10" className="block p-2.5 w-full p-2" defaultValue={situacion}></textarea>
              </div>
              <div className="relative border-2">
                <h1 className="text-center p-2 bg-gray-200">Observaciones del Periodio Específico</h1>
                <div className="grid grid-cols-3 gap-2 p-2">
                  <div className="relative border-2 ">
                    <h1 className="text-center p-2 bg-gray-200">Aspectos desarrollados con el estudiante</h1>
                    <textarea rows="10" className="block p-2.5 w-full p-2" defaultValue={aspectos}></textarea>                 
                  </div>
                  <div className="relative border-2">
                    <h1 className="text-center p-2 bg-gray-200">Apoyos educativos con los que contó el estudiante</h1>
                    <textarea rows="10" className="block p-2.5 w-full p-2" defaultValue={apoyos}></textarea>                 
                  </div>
                  <div className="relative border-2">
                    <h1 className="text-center p-2 bg-gray-200">Sugerencias y recomendaciones</h1>
                    <textarea rows="10" className="block p-2.5 w-full p-2" defaultValue={sugerencias}></textarea>                 
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })
  }  
  </div>
};