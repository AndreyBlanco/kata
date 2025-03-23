import Image from "next/image";
import { testDatabaseConnection } from "./actions";
import Link from "next/link";
export default async function Home() {
  const isConnected = await testDatabaseConnection();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col place-items-center gap-12">
        <div className="relative flex place-items-center gap-6 before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]">
          <Image
            className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
            src="/kata.svg"
            alt="Logo Katá"
            width={350}
            height={100}
            priority
          />
        </div>
        {isConnected ? (
          <h2 className="text-lg text-green-500">
            Estamos Listos
          </h2>
        ) : (
          <h2 className="text-lg text-red-500">
            You are NOT connected to MongoDB. Check the <code>README.md</code>{" "}
            for instructions.
          </h2>
        )}
        <Link
            href="/dashboard"
            className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <code>Panel de Control</code>
        </Link>
      </div>

    </main>
  );
}
