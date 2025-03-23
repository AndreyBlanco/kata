import clientPromise from "@/lib/mongodb";

export default function getCountries() {
    const countries = [{id:"01", code:"CRI", name:"Costa Rica"}]
    try {
      return countries;
    } catch (e) {
        console.log(e);
      throw new Error('Failed to fetch countries.');
    }
  
  }
  