import clientPromise from "./mongodb";
import { ObjectId } from 'mongodb';
import type { User } from '@/app/lib/definitions';
import { auth } from '@/auth';

const ITEMS_PER_PAGE = 10;

export async function fetchFilteredStudents(
  query: string,
  currentPage: number,
  ) {

  const session = await auth();
  const user = session?.user.email;
  const teacher = await getUser(user); 
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {

    const client = await clientPromise;
    const db = client.db("educational_support");
    const students = await db
        .collection("students")
        .find({teacher:teacher._id})
        .sort("lName")
        .toArray();

    return students;
  } catch (e) {
      console.error(e);
    throw new Error('Failed to fetch students.');
  }

}

export async function fetchStudents() {

  const session = await auth();
  const user = session?.user.email;
  const teacher = await getUser(user);

  try {

    const client = await clientPromise;
    const db = client.db("educational_support");
    const students = await db
        .collection("students")
        .find({teacher:teacher._id})
        .sort("lName")
        .toArray();

    return students;
  } catch (e) {
      console.error(e);
    throw new Error('Failed to fetch students.');
  }

}

export async function fetchStudentsPages(query: string) {
  try {
    const client = await clientPromise;
    const db = client.db("educational_support")
    const students = await db
        .collection("students")
        .estimatedDocumentCount();
    const totalPages = Math.ceil(students / ITEMS_PER_PAGE);
    return totalPages;
  } catch (e) {
      console.error(e);
    throw new Error('Failed to fetch students.');
  }
}

export async function getCountries() {
  //const countries = [{id:"01", code:"CRI", name:"Costa Rica"}]
  try {
    const client = await clientPromise;
    const db = client.db("educational_support");
    const countries = await db
      .collection("countries")
      .find({})
      .toArray();
     
    return JSON.parse(JSON.stringify(countries));
  } catch (e) {
      console.log(e);
    throw new Error('Failed to fetch countries.');
  }

}

export async function fetchStudentById( id: string ) {
 
  const oId = new ObjectId(id);

  try {
    const client = await clientPromise;
    const db = client.db("educational_support");
    const student = await db
      .collection("students")
      .find({_id: oId})
      .toArray();
    
    return JSON.parse(JSON.stringify(student));
  } catch (e) {
      console.log(e);
    throw new Error('Failed to fetch student.');
  }
}


export async function getUser(email: string): Promise<User | undefined> {
  
  try {
    const client = await clientPromise;
    const db = client.db("educational_support");
    const user = await db
        .collection("teachers")
        .find({email:email})
        .toArray();
    
    const us = user[0];
    const data: User = {_id:us._id, name:us.name, email:us.email, password:us.password};
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    
  }
}
