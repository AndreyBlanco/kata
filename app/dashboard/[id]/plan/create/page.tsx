import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { createStudentPlan } from '@/app/lib/actions';
import { ObjectId } from 'mongodb';
import { fetchStudentById } from '@/app/lib/data';
import { notFound } from 'next/navigation';

export default async function Page(props: { params: Promise<{ id: ObjectId }> }) {
 
  const params = await props.params;
      const id = params.id;
      const sId = id.toString();
      var student = await Promise.all([
          fetchStudentById(sId),
                  
        ]);
  
      if (!student) {
          notFound();
      }

      const stud = student[0];

      return (
        <form action={createStudentPlan}>
            <div className="rounded-md bg-gray-50 p-4 md:p-6">
                {stud?.map((st) => {
                    return(
                        <div>
                            <h1>{st.datos.fName} {st.datos.lName}</h1>
                            <input id="studentId" name="studentId" type="hidden" value={st._id}/>
                        </div>
                    )})
                }
                <div className="block border-t-2 py-2">
                    <legend className="flex self-center text-sm font-medium">
                        Procesos implicados en el aprendizaje:
                    </legend>
                    <div className="px-[14px] py-1">
                        <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="percepcion" name="percepcion" type="checkbox" value="percepcion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="percepcion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Percepción</label>
                            </div>
                            <div className="flex items-center">
                                <input id="atencion" name="atencion" type="checkbox" value="atencion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="atencion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Atención</label>
                            </div>
                            <div className="flex items-center">
                                <input id="emocion" name="emoción" type="checkbox" value="emocion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="emocion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Emoción</label>
                            </div>
                            <div className="flex items-center">
                                <input id="motivacion" name="motivacion" type="checkbox" value="motivacion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="motivacion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Motivación</label>
                            </div>
                            <div className="flex items-center">
                                <input id="memorias" name="memorias" type="checkbox" value="memorias" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="memorias" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Memorias</label>
                            </div>
                            <div className="flex items-center">
                                <input id="funciones" name="funciones" type="checkbox" value="funciones" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="funciones" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Funciones Ejecutivas</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="block border-t-2 py-2">
                    <legend className="flex self-center text-sm font-medium">
                        Dificultades específicas del aprendizaje:
                    </legend>
                    <div className="px-[14px] py-1">
                        <div className="flex gap-4">
                            <div className="flex items-center">
                                <input id="dislexia" name="dislexia" type="checkbox" value="dislexia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="dislexia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Dislexia</label>
                            </div>
                            <div className="flex items-center">
                                <input id="discalculia" name="discalculia" type="checkbox" value="discalculia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="discalculia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Discalculia</label>
                            </div>
                            <div className="flex items-center">
                                <input id="disortografia" name="disortografia" type="checkbox" value="disortografia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="disortografia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Disortografía</label>
                            </div>
                            <div className="flex items-center">
                                <input id="disgrafia" name="disgrafia" type="checkbox" value="disgrafia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="disgrafia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Disgrafía</label>
                            </div>
                            <div className="flex items-center">
                                <input id="dispraxia" name="dispraxias" type="checkbox" value="dispraxia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="dispraxia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Dispraxia</label>
                            </div>
                            <div className="flex items-center">
                                <input id="verbal" name="verbal" type="checkbox" value="verbal" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="verbal" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Transtorno del aprendizaje no verbal</label>
                            </div>
                            <div className="flex items-center">
                                <input id="lento" name="lento" type="checkbox" value="lento" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="lento" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Perfiles de aprendizaje lento</label>
                            </div>
                            <div className="flex items-center">
                                <input id="tda" name="tda" type="checkbox" value="tda" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>
                                <label htmlFor="tda" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Transtorno por déficit de atención</label>
                            </div>
                        </div>
                    </div>
                </div> 
                <div className="mb-4">
                    <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                        Puntos fuertes o fortalezas:
                    </label>
                    <textarea name="fortalezas" className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                    placeholder="Son las habilidades de la persona estudiante, que servirán como base para adquirir nuevas habilidades. "></textarea>                    
                </div>
                <div className="mb-4">
                    <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                        Estrategias para la mediación:
                    </label>
                    <textarea name="mediacion" className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                    placeholder="Son las que deben utilizarse en el salón de clase y en los procesos de mediación pedagógica para apoyar a la persona estudiante, buscando que participe y aprenda. "></textarea>                    
                </div>
                <div className="mb-4">
                    <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                        Estrategias de apoyo para la casa:
                    </label>
                    <textarea name="casa" className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                    placeholder="Son las que se deben utilizar en la casa para que la persona estudiante generalice habilidades. "></textarea>                    
                </div> 
                <div className="mb-4">
                    <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                        Estrategias específicas:
                    </label>
                    <textarea name="especificas" className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                    placeholder="Son las que se trabajarán en otros contextos desde el acompañamiento personalizado."></textarea>                    
                </div>                 
                                
                <div className="mt-6 flex justify-end gap-4">
                    <Link
                        href="./"
                        className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                    >
                    Cancelar
                    </Link>
                    <Button type="submit">Guardar Plan</Button>
                </div>
            </div>
        </form>
      );
}