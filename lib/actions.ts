'use server'

import clientPromise from "../lib/mongodb";
import { redirect } from 'next/navigation';

export async function createStudent(formData: FormData) { 
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
  console.log(rawFormData);
  try {
    const client = await clientPromise;
    client.db("educational_support")
        .collection("students")
        .insertOne(rawFormData);
  } catch (e) {
        console.error(e);
  }

  redirect('/dashboard/students');
}

/*
  export async function updateStudent(
    id: string,
    prevState: State,
    formData: FormData,
  ) {
    const validatedFields = UpdateStudent.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
      };
    }
   
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
   
    try {
      
    } catch (error) {
      console.error(error);
    }
   
    revalidatePath('/dashboard/students');
    redirect('/dashboard/students');
  }*/

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
