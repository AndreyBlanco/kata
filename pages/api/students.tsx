'use Server';

import clientPromise from "../../app/lib/mongodb";
import { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const client = await clientPromise;
        const db = client.db("educational_support");
        const students = await db
            .collection("students")
            .find({})
            .sort("lastName")
            .limit(10)
            .toArray();
        res.json(students);
    } catch (e) {
        console.error(e);
    }
}