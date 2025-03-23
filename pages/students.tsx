import clientPromise from "../lib/mongodb";
import { GetStaticProps } from 'next';


interface Students {
   _id: string;
   firstName: string;
   lastName: string;
   age: number;
   grade: number;
   disabilities: [];
}


interface StudentsProps {
   students: Students[];
}


export default function Students({ students }: StudentsProps) {
  
   return (
       <div>
           <h1>Students List</h1>
           <p>
               <small>(According to LastName)</small>
           </p>
           <ul>
               {students.map((student) => (
                   <li key={student._id}>
                       <h2>Name: {student.firstName} {student.lastName}</h2>
                       <h3>Age: {student.age}</h3>
                       <h3>Grade: {student.grade}</h3>
                   </li>
               ))}
           </ul>
       </div>
   );
};

export const getStaticProps: GetStaticProps<StudentsProps> = async () => {
   try {
       const client = await clientPromise;
       const db = client.db("educational_support");
       const students = await db
           .collection("students")
           .find({})
           .sort("lastName")
           .limit(1000)
           .toArray();
       return {
           props: { students: JSON.parse(JSON.stringify(students)) },
       };
   } catch (e) {
       console.error(e);
       return { props: { students: [] } };
   }
};