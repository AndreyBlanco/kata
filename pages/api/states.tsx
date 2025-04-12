'use Server';

import clientPromise from "../../app/lib/mongodb";
import { NextApiRequest, NextApiResponse } from 'next';

export default async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const client = await clientPromise;
        const db = client.db("educational_support");
        const states = await db
            .collection("states")
            .find({})
            .toArray();
        res.json(states);
    } catch (e) {
        console.error(e);
    }
}