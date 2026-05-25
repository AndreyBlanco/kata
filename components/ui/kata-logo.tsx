import Image from 'next/image'

type KataLogoProps = {
  width?: number
  height?: number
  priority?: boolean
  className?: string
}

export function KataLogo({
  width = 220,
  height = 80,
  priority = false,
  className,
}: KataLogoProps) {
  return (
    <Image
      src="/kata.svg"
      alt="Katà"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  )
}
