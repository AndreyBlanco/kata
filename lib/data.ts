import clientPromise from "../lib/mongodb";

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
        .sort("lastName")
        .limit(1000)
        .toArray();

    /* const students = await apiStudents();*/
    console.log(students);
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

export async function getStates(code: string) {
  
  try {
    const client = await clientPromise;
    const db = client.db("educational_support");
    const states = await db
      .collection("states")
      .find({"code":code})
      .toArray();
     
    return states;
  } catch (e) {
      console.log(e);
    throw new Error('Failed to fetch states.');
  }

}
