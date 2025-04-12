import { auth } from "@/auth"
import { fetchStudents } from "../lib/data";
import { createReport } from '@/app/lib/actions';
import { Button } from '@/app/ui/button';

export default async function Page() {

  const session = await auth();
  const email = session.user.email;
  const name = session.user.name;

  const students = await fetchStudents();
  
  return (
    <div>
        <h1>Panel de Control</h1>
        <div className="block">
          <div className="relative p-3">
            <h1 className="bg-gray-200 p-2">Mi Perfil</h1>
            <div className="px-2 pt-2">
              <h1>Nombre: {name}</h1>
            </div>
            <div className="px-2">
              <h1>Correo electrónico: {email}</h1>              
            </div>
          </div>
          <div className="relative p-3">
            <h1 className="bg-gray-200 p-2">Informes</h1>
            <div className="px-2 pt-2">
              <h1>Informe fin de periodo</h1>
            </div>
            <div className="block">
              <form action={createReport}>
                <label htmlFor="student" className="mb-2 justify-end self-center pr-2 flex text-sm font-medium w-[100px]">
                  Estudiante:
                </label>
                <select
                    id="student"
                    name="student"
                    className="peer block w-full cursor-pointer rounded-md border border-gray-200 mb-3 p-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                    aria-describedby="student-error"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Seleccione un Estudiante
                    </option>
                    {students?.map((student) => (
                      <option key={student._id.toString()} value={student._id.toString()}>
                        {student.datos.fName}
                      </option>
                    ))}
                </select>
                <Button type="submit">Generar Informe</Button>
              </form>
            </div>
          </div>
        </div>

    </div>
  )
}
