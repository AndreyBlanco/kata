import { StudentPlan } from '@/app/ui/student-file/student-file';
import { fetchStudentById } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
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

    return (
        <div>
            <StudentPlan {...student} />
        </div>
    );
}