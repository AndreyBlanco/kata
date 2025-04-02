
import StudentFile from '@/app/ui/student-file/student-file';
import { fetchStudentById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';


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

    return (
        <div key="mio">
            <StudentFile {...student} />
        </div>
    );
}

