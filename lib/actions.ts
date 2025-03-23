'use server'

/*import { signIn } from '@/auth';
import { AuthError } from 'next-auth';*/

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import clientPromise from "../lib/mongodb";

 const FormSchema = z.object({
  firstName: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  lastName: z.string({
    invalid_type_error: 'Please select an invoice status.',
  }),
  identity: z.string(),
});
 
const CreateStudent= FormSchema;

/*const UpdateStudent = FormSchema.omit({ id: true, date: true });*/

export type State = {
  errors?: {
    firstName?: string;
    lastName?: string;
    identity?: string;
  };
  message?: string | null;
};
 
  export async function createStudent(formData: FormData) {
    const validatedFields = CreateStudent.safeParse({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      identity: formData.get('identity'),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
    
    const { firstName, lastName, identity } = validatedFields.data;
    
    try {
      const estudiante = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        age: formData.get('identity'),
        grade: 3
      };
      const client = await clientPromise;
      const db = client.db("educational_support").collection('students').insertOne(estudiante);
    } catch (error) {
      console.error(error);
    }

    revalidatePath('/dashboard/students');
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
  }

  export async function deleteStudent(id: string) {
    
  }

*/
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
