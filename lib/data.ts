import clientPromise from "../lib/mongodb";

const ITEMS_PER_PAGE = 10;

export async function fetchFilteredStudents(
  query: string,
  currentPage: number,
  ) {

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const client = await clientPromise;
    const db = client.db("educational_support");
    const students = await db
        .collection("students")
        .find({})
        .sort("lastName")
        .limit(1000)
        .toArray();
    return students;
  } catch (e) {
      console.error(e);
    throw new Error('Failed to fetch invoices.');
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
