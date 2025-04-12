import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { createStudentValue } from '@/app/lib/actions';
import { ObjectId } from 'mongodb';
import { fetchStudentById } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { ContextoAula, Grafia, Motricidad , Visual, Auditiva, Espacio, Tiempo, Madurez, Lectoescritura, Ortograficas, Matematicas } from '@/app/ui/student-file/value-listforms';

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
                        <div>
                            <h1>{st.fName} {st.lName}</h1>
                            <input id="studentId" name="studentId" type="hidden" value={st._id}/>
                        </div>
                    )})}
                < ContextoAula />
                < Grafia />
                < Motricidad />
                < Visual /> 
                < Auditiva />                 
                < Espacio />
                < Tiempo />
                < Madurez />
                < Lectoescritura />
                < Ortograficas />
                < Matematicas />
                <div className="mt-6 flex justify-end gap-4">
                    <Link
                        href="./"
                        className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                    >
                    Cancelar
                    </Link>
                    <Button type="submit">Guardar Valoración</Button>
                </div>
            </div>
        </form>
      );
}