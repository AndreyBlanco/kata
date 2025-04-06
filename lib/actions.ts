'use server'

import clientPromise from "../lib/mongodb";
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';

export async function createStudent(formData: FormData) { 
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
  
  const data = {datos};

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
  const rawFormData = {
    invierte: formData.get('status')
   };

  const sId = formData.get('studentId');

  const oId = new ObjectId(sId);
  
  console.log(rawFormData);
  
  try {
    const client = await clientPromise;
    client.db("educational_support")
        .collection("students")
        .findOneAndUpdate({ _id: oId }, {"$set":{valoracion: rawFormData}});
  } catch (e) {
        console.error(e);
  }

  redirect(`/dashboard/${sId}/value`);
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

  export async function deleteStudent(id: string) {
    
  }

/*
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
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }*/
