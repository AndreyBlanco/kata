import Image from 'next/image';
import { StudentFile } from '@/app/ui/students/buttons';
import { fetchFilteredStudents } from '@/app/lib/data';


export default async function StudentTable({
  query,
  currentPage,
}: {
  query: string;
  currentPage: number;
}) {
  const students = await fetchFilteredStudents(query, currentPage);
   
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
          <div className="md:hidden">
            {students?.map((student) => {
              if (student.datos.image_url == null) {
                student.datos.image_url = '/imageTemplate.png'
                return(
                  <div
                    key={student._id.toString()}
                    className="mb-2 w-full rounded-md bg-white p-4"
                  >
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <div className="mb-2 flex items-center">
                          <Image
                            src={student.datos.image_url}
                            className="mr-2 rounded-full"
                            width={28}
                            height={28}
                            alt={`Foto de perfil de ${student.datos.fName}`}
                          />
                          <p>{student.fName}</p>
                        </div>
                        <p className="text-md text-gray-500">{student.datos.fName} {student.datos.lName}</p>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between pt-4">
                      <div>
                        <p>{calculateAge(student.datos.bdate)}</p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <StudentFile id={student._id.toString()} />
                      </div>
                    </div>
                  </div>
                )
              }}
            )}
          </div>
          <table className="hidden min-w-full text-gray-900 md:table">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Estudiante
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Edad
                </th>
                <th scope="col" className="relative py-3 pl-6 pr-3">
                  <span className="sr-only">Edit</span>
                  Editar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {students?.map((student) => {
                return (
                <tr
                  key={student._id.toString()}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={student.datos.image_url}
                        className="rounded-full"
                        width={28}
                        height={28}
                        alt={`Foto de perfil de ${student.datos.fName}`}
                      />
                      <p>{student.datos.fName} {student.datos.lName}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {calculateAge(student.datos.bdate)}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    <div className="flex justify-end gap-3">
                      <StudentFile id={student._id.toString()} />
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function calculateAge (bdate: Date) {
  var hoy = new Date();
  var cumpleanos = new Date(bdate);
  var edad = hoy.getFullYear() - cumpleanos.getFullYear();
  var m = hoy.getMonth() - cumpleanos.getMonth();

  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
  }

  return edad;
} 

