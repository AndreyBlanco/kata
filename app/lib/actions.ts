'use server'

import clientPromise from "./mongodb";
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { signIn } from '@/auth';
import { getUser } from '@/app/lib/data'
import { AuthError } from 'next-auth';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ValoracionIntegral } from "../ui/student-file/value-lists";


export async function createStudent(formData: FormData) { 
  const tId = formData.get('teacher');
  const teacher = new ObjectId(tId);
  
  const datos = {
    fName: formData.get('firstName'),
    lName: formData.get('lastName'),
    ced: formData.get('identity'),
    bdate: formData.get('bdate'),
    country: formData.get('country'),
    state: formData.get('state'),
    dep: formData.get('dep'),
    district: formData.get('dist'),
    ward: formData.get('barrio'),
    street: formData.get('senas'),
    tutor: formData.get('tutorFirstName'),
    tutorPhone: formData.get('tutorPhone'),
    tutorEmail: formData.get('tutorEmail'),

  };
  
  const data = {teacher, datos};

  try {
    const client = await clientPromise;
    client.db("educational_support")
        .collection("students")
        .insertOne(data);
  } catch (e) {
        console.error(e);
  }

  redirect('/dashboard/students');
}


export async function createStudentValue(formData: FormData) { 
  
  var listForm = ValoracionIntegral();
      
  listForm?.map((element) => {
    element.value = formData.get(element.name);
   }
  );

  const sId = formData.get('studentId');

  const oId = new ObjectId(sId);  

  try {
    const client = await clientPromise;
    client.db("educational_support")
        .collection("students")
        .findOneAndUpdate({ _id: oId }, {"$set":{valoracion: listForm}});
  } catch (e) {
        console.error(e);
  }

  redirect(`/dashboard/${sId}/value`);
}

export async function createStudentPlan(formData: FormData) { 
  
  const plan = {
    percepcion: formData.get("percepcion"),
    atencion: formData.get("atencion"),
    emocion: formData.get("emocion"),
    motivacion: formData.get("motivacion"),
    memorias: formData.get("memorias"),
    funciones: formData.get("funciones"),
    dislexia: formData.get("dislexia"),
    discalculia: formData.get("discalculia"),
    disortografia: formData.get("disortografia"),
    disgrafia: formData.get("disgrafia"),
    dispraxia: formData.get("dispraxia"),
    verbal: formData.get("verbal"),
    lento: formData.get("lento"),
    tda: formData.get("tda"),
    fortalezas: formData.get("fortalezas"),
    mediacion: formData.get("mediacion"),
    casa: formData.get("casa"),
    especificas: formData.get("especificas"),
  }
      
  const sId = formData.get('studentId');

  const oId = new ObjectId(sId);  

  try {
    const client = await clientPromise;
    client.db("educational_support")
        .collection("students")
        .findOneAndUpdate({ _id: oId }, {"$set":{plan: plan}});
  } catch (e) {
        console.error(e);
  }

  redirect(`/dashboard/${sId}/plan`);
}



export async function updateStudent(formData: FormData,) {
    const rawFormData = {
      fName: formData.get('firstName'),
      lName: formData.get('lastName'),
      ced: formData.get('identity'),
      bdate: formData.get('bdate'),
      country: formData.get('country'),
      state: formData.get('state'),
      dep: formData.get('dep'),
      district: formData.get('dist'),
      ward: formData.get('barrio'),
      street: formData.get('senas'),
      tutor: formData.get('tutorFirstName'),
      tutorPhone: formData.get('tutorPhone'),
      tutorEmail: formData.get('tutorEmail'),
    };

    const sId = formData.get('studentId');

    const oId = new ObjectId(sId);
   
    try {
      const client = await clientPromise;
      client.db("educational_support")
          .collection("students")
          .findOneAndUpdate({ _id: oId }, {"$set":{datos: rawFormData}});
    } catch (e) {
          console.error(e);
    }
  
    redirect(`/dashboard/${sId}/student-file`);
  }


  export async function createReport(formData: FormData,) {
    
    const sId = formData.get('student');
  
    redirect(`/dashboard/${sId}/report`);
  }

  export async function deleteStudent(id: string) {
    
  }

  export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Credenciales Incorrectas.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }

  export async function register(formData: FormData) {
    const us = {
      email: formData.get('email'),
      password: formData.get('password'),
    }
    try {
      const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(us);
        if (parsedCredentials.success) {
          const email = us.email;
          const user = await getUser(email);
          
          if (!user) {
            const pass = formData.get('password');
            const hashedPassword = await bcrypt.hash(pass, 10);
            const data = {
              password: hashedPassword,
              name: formData.get('name'),
              email: formData.get('email'),
            }
            
            try {
              const client = await clientPromise;
              client.db("educational_support")
                    .collection("teachers")
                    .insertOne(data);
              } catch (e) {
                    console.error(e);
              }
            
              authenticate("none", formData);
            }
                  
        }
 
        return null;
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Credenciales Incorrectas.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }

