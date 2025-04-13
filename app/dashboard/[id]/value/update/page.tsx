import { fetchStudentById } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { createStudentValue } from '@/app/lib/actions';
import { Student } from '@/app/lib/definitions';
import { ContextoAulaUpdate, GrafiaUpdate, MotricidadUpdate, VisualUpdate, AuditivaUpdate, EspacioUpdate, TiempoUpdate, 
    MadurezUpdate, LectoescrituraUpdate, OrtograficasUpdate, MatematicasUpdate } from '@/app/ui/student-file/value-listforms';


 
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
      const st = stud?.map((st:Student) => {return(st)});
      const stu = st[0];
        
      return (
        <form action={createStudentValue}>
            <div className="rounded-md bg-gray-50 p-4 md:p-6">
                <div>
                    <h1>{stu.datos.fName} {stu.datos.lName}</h1>
                    <input id="studentId" name="studentId" type="hidden" value={stu._id}/>
                </div>
                < ContextoAulaUpdate {...stu.valoracion} />
                < GrafiaUpdate {...stu.valoracion} />
                < MotricidadUpdate {...stu.valoracion} />
                < VisualUpdate {...stu.valoracion} /> 
                < AuditivaUpdate {...stu.valoracion} />                 
                < EspacioUpdate {...stu.valoracion} />
                < TiempoUpdate {...stu.valoracion} />
                < MadurezUpdate {...stu.valoracion} />
                < LectoescrituraUpdate {...stu.valoracion} />
                < OrtograficasUpdate {...stu.valoracion} />
                < MatematicasUpdate {...stu.valoracion} />
                <div className="mt-6 flex justify-end gap-4">
                    <Link
                        href="./"
                        className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                    >
                    Cancelar
                    </Link>
                    <Button type="submit">Actualizar Valoración</Button>
                </div>
            </div>
        </form>
      );
}