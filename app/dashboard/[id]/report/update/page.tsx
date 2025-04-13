import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { createStudentPlan } from '@/app/lib/actions';
import { ObjectId } from 'mongodb';
import { fetchStudentById } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { Student } from '@/app/lib/definitions';

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
            {stud?.map((st:Student) => {
                return(
                <div className="rounded-md bg-gray-50 p-4 md:p-6">
                    <div>
                        <h1>{st.datos.fName} {st.datos.lName}</h1>
                        <input id="studentId" name="studentId" type="hidden" value={st._id.toString()}/>
                    </div>            
                    <div className="block border-t-2 py-2">
                        <legend className="flex self-center text-sm font-medium">
                            Procesos implicados en el aprendizaje:
                        </legend>
                        <div className="px-[14px] py-1">
                            <div className="flex gap-4">
                                <div className="flex items-center">
                                    {st.plan.percepcion=="percepcion" && <input defaultChecked id="percepcion" name="percepcion" type="checkbox" value="percepcion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.percepcion==null && <input id="percepcion" name="percepcion" type="checkbox" value="percepcion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="percepcion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Percepción</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.atencion=="atencion" && <input defaultChecked id="atencion" name="atencion" type="checkbox" value="atencion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.atencion==null && <input id="atencion" name="atencion" type="checkbox" value="atencion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="atencion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Atención</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.emocion=="emocion" && <input defaultChecked id="emocion" name="emocion" type="checkbox" value="emocion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.emocion==null && <input id="emocion" name="emocion" type="checkbox" value="emocion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="emocion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Emoción</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.motivacion=="motivacion" && <input defaultChecked id="motivacion" name="motivacion" type="checkbox" value="motivacion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.motivacion==null && <input id="motivacion" name="motivacion" type="checkbox" value="motivacion" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="motivacion" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Motivación</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.memorias=="memorias" && <input defaultChecked id="memorias" name="memorias" type="checkbox" value="memorias" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.memorias==null && <input id="memorias" name="memorias" type="checkbox" value="memorias" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="memorias" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Memorias</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.funciones=="funciones" && <input defaultChecked id="funciones" name="funciones" type="checkbox" value="funciones" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.funciones==null && <input id="funciones" name="funciones" type="checkbox" value="funciones" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
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
                                    {st.plan.dislexia=="dislexia" && <input defaultChecked id="dislexia" name="dislexia" type="checkbox" value="dislexia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.dislexia==null && <input id="dislexia" name="dislexia" type="checkbox" value="dislexia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="dislexia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Dislexia</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.discalculia=="discalculia" && <input defaultChecked id="discalculia" name="discalculia" type="checkbox" value="discalculia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.discalculia==null && <input id="discalculia" name="discalculia" type="checkbox" value="discalculia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="discalculia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Discalculia</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.disortografia=="disortografia" && <input defaultChecked id="disortografia" name="disortografia" type="checkbox" value="disortografia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.disortografia==null && <input id="disortografia" name="disortografia" type="checkbox" value="disortografia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="disortografia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Disortografía</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.disgrafia=="disgrafia" && <input defaultChecked id="disgrafia" name="disgrafia" type="checkbox" value="disgrafia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.disgrafia==null && <input id="disgrafia" name="disgrafia" type="checkbox" value="disgrafia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="disgrafia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Disgrafía</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.dispraxia=="dispraxia" && <input defaultChecked id="dispraxia" name="dispraxia" type="checkbox" value="dispraxia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.dispraxia==null && <input id="dispraxia" name="dispraxia" type="checkbox" value="dispraxia" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="dispraxia" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Dispraxia</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.verbal=="verbal" && <input defaultChecked id="verbal" name="verbal" type="checkbox" value="verbal" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.verbal==null && <input id="verbal" name="verbal" type="checkbox" value="verbal" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="verbal" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Transtorno del aprendizaje no verbal</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.lento=="lento" && <input defaultChecked id="lento" name="lento" type="checkbox" value="lento" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.lento==null && <input id="lento" name="lento" type="checkbox" value="lento" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="lento" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Perfiles de aprendizaje lento</label>
                                </div>
                                <div className="flex items-center">
                                    {st.plan.tda=="tda" && <input defaultChecked id="tda" name="tda" type="checkbox" value="tda" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    {st.plan.tda==null && <input id="tda" name="tda" type="checkbox" value="tda" className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"/>}
                                    <label htmlFor="tda" className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full py-1.5 text-xs font-medium text-black">Transtorno por déficit de atención</label>
                                </div>
                            </div>
                        </div>
                    </div> 
                    <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                            Puntos fuertes o fortalezas:
                        </label>
                        <textarea name="fortalezas" defaultValue={st.plan.fortalezas} className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                        placeholder="Son las habilidades de la persona estudiante, que servirán como base para adquirir nuevas habilidades. "></textarea>                    
                    </div>
                    <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                            Estrategias para la mediación:
                        </label>
                        <textarea name="mediacion" defaultValue={st.plan.mediacion} className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                        placeholder="Son las que deben utilizarse en el salón de clase y en los procesos de mediación pedagógica para apoyar a la persona estudiante, buscando que participe y aprenda. "></textarea>                    
                    </div>
                    <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                            Estrategias de apoyo para la casa:
                        </label>
                        <textarea name="casa" defaultValue={st.plan.casa} className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                        placeholder="Son las que se deben utilizar en la casa para que la persona estudiante generalice habilidades. "></textarea>                    
                    </div> 
                    <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                            Estrategias específicas:
                        </label>
                        <textarea name="especificas" defaultValue={st.plan.especificas} className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                        placeholder="Son las que se trabajarán en otros contextos desde el acompañamiento personalizado."></textarea>                    
                    </div>                 
                                    
                    <div className="mt-6 flex justify-end gap-4">
                        <Link
                            href="./"
                            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                        >
                        Cancelar
                        </Link>
                        <Button type="submit">Actualizar Plan</Button>
                    </div>
                </div>
            )})}
        </form>
      );
}