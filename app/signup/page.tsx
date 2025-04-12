import Image from "next/image";
import SignupForm from '@/app/ui/signup-form';
 
export default function SignupPage() {
  return (
    <main className="flex items-center justify-center md:h-screen">
      <div className="relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32">
        <Image
          className="relative dark:drop-shadow-[0_0_0.3rem_#ffffff70] dark:invert"
          src="/kata.svg"
          alt="Logo Katá"
          width={350}
          height={100}
          priority
        />
        <SignupForm />
      </div>
    </main>
  );
}