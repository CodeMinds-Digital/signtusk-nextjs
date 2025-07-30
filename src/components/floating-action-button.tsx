"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, MessageCircle, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function FloatingActionButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
        setIsExpanded(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const actions = [
    {
      icon: ArrowUp,
      label: 'Back to top',
      action: scrollToTop,
      color: 'bg-primary-500 hover:bg-primary-600'
    },
    {
      icon: Shield,
      label: 'Get Started',
      action: () => window.location.href = '/signup',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: MessageCircle,
      label: 'Contact Support',
      action: () => window.location.href = '/contact',
      color: 'bg-blue-500 hover:bg-blue-600'
    }
  ]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-end space-y-3">
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  className="flex flex-col space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {actions.slice(1).map((action, index) => {
                    const Icon = action.icon
                    return (
                      <motion.button
                        key={index}
                        className={`w-12 h-12 rounded-full ${action.color} text-white shadow-lg flex items-center justify-center transition-all duration-200`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={action.action}
                        title={action.label}
                      >
                        <Icon className="w-5 h-5" />
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              className="w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(!isExpanded)}
              animate={{ rotate: isExpanded ? 45 : 0 }}
            >
              <ArrowUp className="w-6 h-6" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
