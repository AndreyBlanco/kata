import { fetchStudentById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { updateStudent } from '@/lib/actions';
import { getCountries } from '@/lib/data';
import { AddressUpdate } from '@/app/ui/students/address';

 
export default async function Page(props: { params: Promise<{ id: ObjectId }> }) {
    
    const params = await props.params;
    const id = params.id;
    const sId = id.toString();
    var st = await Promise.all([
        fetchStudentById(sId),
                
      ]);

    if (!st) {
        notFound();
    }
    
    const student = st[0];
    const countries = await getCountries();

    const data = {student, countries};

    return (
        <div>
            {student?.map((stud) => {
                return(
                    <form action={updateStudent}>
                    <input id="studentId" name="studentId" type="hidden" value={stud._id}/>
                    <div className="rounded-md bg-gray-50 p-4 md:p-6">
                        <h1>Datos Personales</h1>
                        {/* Nombre del Estudiante */}
                        <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium">
                            Nombre
                        </label>
                        <div className="relative">
                            <input
                            id="firstName"
                            name="firstName"
                            type="string"
                            placeholder={stud.datos.fName}
                            defaultValue={stud.datos.fName}
                            className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2"
                            required
                            />
                        </div>
                        </div>
                        {/* Apellidos del Estudiante */}
                        <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium">
                            Apellidos
                        </label>
                        <div className="relative">
                            <input
                            id="lastName"
                            name="lastName"
                            type="string"
                            placeholder={stud.datos.lName}
                            defaultValue={stud.datos.lName}
                            className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                            required
                            />
                        </div>
                        </div>
                        {/* Numero de Identidad */}
                        <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium">
                            Número de Identidad (Cédula)
                        </label>
                        <div className="relative">
                            <input
                            id="identity"
                            name="identity"
                            type="string"
                            placeholder={stud.datos.ced}
                            defaultValue={stud.datos.ced}
                            className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                            required
                            />
                        </div>
                        </div>
                        {/* Fecha de Nacimiento */}
                        <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium">
                            Fecha de Nacimiento
                        </label>
                        <div className="relative">
                            <input
                            id="bdate"
                            name="bdate"
                            type="date"
                            placeholder={stud.datos.bdate}
                            defaultValue={stud.datos.bdate}
                            className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                            required
                            />
                        </div>
                        </div>
                        {/* Dirección */}
                        <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium border-t-2 pt-2">
                            Dirección
                        </label>
                        <AddressUpdate {...data}/>
                        </div>
                    
                    {/* Nombre del Encargado Legal */}
                    <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium  border-t-2 pt-2">
                        Nombre completo del Encargado
                        </label>
                        <div className="relative">
                        <input
                            id="tutorFirstName"
                            name="tutorFirstName"
                            type="string"
                            placeholder={stud.datos.tutor}
                            defaultValue={stud.datos.tutor}
                            className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                            required
                        />
                        </div>
                    </div>
                    {/* Apellidos del Estudiante */}
                    <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium">
                        Teléfono
                        </label>
                        <div className="relative">
                        <input
                            id="tutorPhone"
                            name="tutorPhone"
                            type="phone"
                            placeholder={stud.datos.tutorPhone}
                            defaultValue={stud.datos.tutorPhone}
                            className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                            required
                        />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="student" className="mb-2 block text-sm font-medium">
                        Correo electrónico
                        </label>
                        <div className="relative">
                        <input
                            id="tutorEmail"
                            name="tutorEmail"
                            type="email"
                            placeholder={stud.datos.tutorEmail}
                            defaultValue={stud.datos.tutorEmail}
                            className="peer block w-full rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                            required
                        />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <Link
                        href="/dashboard/students"
                        className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
                        >
                        Cancelar
                        </Link>
                        <Button type="submit">Actualizar Estudiante</Button>
                    </div>
                    </div>
                    </form>
                )
            })};
        </div>
    )
}