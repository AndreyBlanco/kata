import { StudentReport } from '@/app/ui/student-file/student-file';
import { fetchStudentById } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { auth } from '@/auth';

 
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
    
    const session = await auth();
    const name = session.user.name;

    return (
        <div>
            <div className="rounded-md bg-gray-50 p-4 ">
                <div>
                <h1>Informe final de periodo</h1>
                </div>
                <h1>Estudiante: {stud[0].datos.fName} {stud[0].datos.lName}</h1>
                <h1>Docente: {name} </h1>
            </div>
            <StudentReport {...student} />
        </div>
    );
}