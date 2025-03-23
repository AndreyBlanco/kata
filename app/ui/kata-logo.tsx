import Image from "next/image";

export default function KataLogo() {
  return (
    <Image
      src="/kata.svg"
      alt="Logo Katà"
      width={250}
      height={80}
      priority
    />
  );
}