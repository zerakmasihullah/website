"use client"

import { Menu, ChevronLeft } from "lucide-react"
import Script from "next/script"
import { ThemeToggle } from "@/components/theme-toggle"

interface HeaderProps {
  onMenuClick: () => void
}


export default function Header({ onMenuClick }: HeaderProps) {

  return (
    <>
      <Script id="gtranslate-settings" strategy="beforeInteractive">
        {`window.gtranslateSettings = {"default_language":"en","languages":["en", "ga"],"globe_color":"#ffffff","wrapper_selector":".gtranslate_wrapper","globe_size":16}`}
      </Script>
      <Script src="https://cdn.gtranslate.net/widgets/latest/globe.js" strategy="lazyOnload" defer />
      
      <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 transition-colors duration-300">
        <div className="flex items-center justify-between px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center gap-2">
       
            <div className="flex items-center gap-1.5">
              <img 
                src="/logo.png" 
                alt="Oscar's Pizza" 
                className="w-8 h-8 md:w-10 md:h-10 object-contain"
              />
              <span className="text-foreground text-lg md:text-xl font-bold tracking-tight hidden sm:block">Oscar's Pizza</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* GTranslate Globe Widget */}
            <div className="gtranslate_wrapper [&_img]:dark:brightness-0 [&_img]:dark:invert-0 [&_img]:brightness-0 [&_img]:invert"></div>
            <button 
              onClick={onMenuClick}
              className="text-foreground hover:text-orange-500 relative transition p-1.5 rounded-full hover:bg-accent"
              aria-label="Account menu"
            >
              <Menu className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-background"></span>
            </button>
          </div>
        </div>
        
       
      </header>
    </>
  )
}
