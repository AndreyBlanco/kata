'use server'

import { auth } from '@/auth';

export default async function UserName() {

    const session = await auth();

    if (session?.user) {
        const name = session?.user.name;
        return (<div>{name}</div>); 
    }

    return ("Hello");
}