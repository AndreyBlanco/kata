'use Server';

import clientPromise from "../../app/lib/mongodb";
import { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const client = await clientPromise;
        const db = client.db("educational_support");
        const countries = await db
            .collection("countries")
            .find({})
            .toArray();
        res.json(countries);
    } catch (e) {
        console.error(e);
    }
}