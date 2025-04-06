import { fetchStudentById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { createStudentValue } from '@/lib/actions';


 
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
        <form action={createStudentValue}>
            <div className="rounded-md bg-gray-50 p-4 md:p-6">
                {stud?.map((st) => {
                    return(
                        <>
                        <div>
                            <h1>{st.datos.fName} {st.datos.lName}</h1>
                            <input id="studentId" name="studentId" type="hidden" value={st._id}/>
                        </div>
                    
                <div className="flex">
                    <legend className="block self-center text-sm font-medium">
                        Invierte el orden de las letras.
                    </legend>
                    <div className="px-[14px] py-1">
                        {st.valoracion.invierte == "si" &&<div className="flex gap-4">
                        <div className="flex items-center">
                             <input
                                id="si"
                                name="status"
                                type="radio"
                                value="si"
                                defaultChecked
                                className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                                required
                            />
                            <label
                                htmlFor="si"
                                className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600"
                            >
                            SI
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                            id="no"
                            name="status"
                            type="radio"
                            value="no"
                            className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                            required
                            />
                            <label
                            htmlFor="no"
                            className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black"
                            >
                            NO
                            </label>
                        </div>
                        </div>}
                        {st.valoracion.invierte == "no" &&<div className="flex gap-4">
                        <div className="flex items-center">
                             <input
                                id="si"
                                name="status"
                                type="radio"
                                value="si"
                                className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                                required
                            />
                            <label
                                htmlFor="si"
                                className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-green-200 px-3 py-1.5 text-xs font-medium text-gray-600"
                            >
                            SI
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                            id="no"
                            name="status"
                            type="radio"
                            defaultChecked
                            value="no"
                            className="h-4 w-4 cursor-pointer border-gray-300 bg-gray-100 text-gray-600 focus:ring-2"
                            required
                            />
                            <label
                            htmlFor="no"
                            className="ml-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-red-200 px-3 py-1.5 text-xs font-medium text-black"
                            >
                            NO
                            </label>
                        </div>
                        </div>}
                    </div>
                </div>                
                <div className="mt-6 flex justify-end gap-4">
                    <Link
                        href="./"
                        className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                    >
                    Cancelar
                    </Link>
                    <Button type="submit">Actualizar Valoración</Button>
                </div> </>)})}
            </div>
        </form>
      );
}