import Image from "next/image"

export default function HeroSection() {
  return (
    <div className="relative w-full h-[250px] sm:h-[350px] lg:h-[400px] overflow-hidden">
      <Image
        src="/hero.png"
        alt="Oscar's Pizza & Kebab Hero"
        fill
        className="object-cover object-center w-full h-full"
        priority
      />

      {/* Restaurant Logo Badge */}
      <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 bg-white rounded-lg p-2 md:p-3 shadow-lg">
        <Image
          src="/logo.png"
          alt="Oscar's Pizza"
          width={160}
          height={50}
          className="h-auto w-auto max-h-12 md:max-h-14"
          priority
        />
      </div>
    </div>
  )
}
