import clientPromise from "../lib/mongodb";
import { ObjectId } from 'mongodb';

const ITEMS_PER_PAGE = 10;

export async function fetchFilteredStudents(
  query: string,
  currentPage: number,
  ) {

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  /* async function apiStudents() {
    const url = process.env.STUDENTS_URL;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }*/

  try {
    const client = await clientPromise;
    const db = client.db("educational_support");
    const students = await db
        .collection("students")
        .find({})
        .sort("lName")
        .limit(1000)
        .toArray();

    /* const students = await apiStudents();*/
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
