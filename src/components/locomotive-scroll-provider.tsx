"use client"

import { useEffect, useRef } from 'react'

interface SmoothScrollProviderProps {
  children: React.ReactNode
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Add smooth scrolling CSS
    const style = document.createElement('style')
    style.textContent = `
      html {
        scroll-behavior: smooth;
      }

      .scroll-smooth {
        scroll-behavior: smooth;
      }

      .parallax-element {
        will-change: transform;
      }

      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }
        .parallax-element {
          transform: none !important;
        }
      }
    `
    document.head.appendChild(style)

    // Add intersection observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in')
        }
      })
    }, observerOptions)

    // Observe all elements with data-scroll attribute
    const scrollElements = document.querySelectorAll('[data-scroll]')
    scrollElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div ref={scrollRef} className="scroll-smooth">
      {children}
    </div>
  )
}
