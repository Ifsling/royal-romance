// src/app/phaser/controllers/MenuScreen.tsx
"use client"

import { useEffect, useState } from "react"

export type MenuChoice = "beer" | "maze" | "quiz"

interface MenuScreenProps {
  onSelectGame: (choice: MenuChoice) => void
}

export default function MenuScreen({ onSelectGame }: MenuScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (settingsOpen) setSettingsOpen(false)
        if (keysOpen) setKeysOpen(false)
        if (pickerOpen) setPickerOpen(false)
      }
    }
    window.addEventListener("keydown", handleEscKey)
    return () => window.removeEventListener("keydown", handleEscKey)
  }, [settingsOpen, keysOpen, pickerOpen])

  return (
    <div className="relative w-full h-screen flex items-center">
      {/* Background */}
      <div className="absolute inset-0 bg-black/50 z-0 -scale-x-100 pointer-events-none">
        <img
          src="/images/logos/splash-screen.jpg"
          alt="Background"
          className="object-cover w-full h-full"
        />
      </div>

      {/* Left side gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10 pointer-events-none" />

      {/* Logo */}
      <div className="absolute top-20 left-20 z-30 pointer-events-none">
        <img
          src="/images/logos/text-logo.png"
          alt="Game Logo"
          className="w-128 h-auto"
        />
      </div>

      {/* Menu content */}
      <div className="relative z-20 w-full max-w-md pl-12 md:pl-24">
        <div className="space-y-4">
          <button
            className="w-full text-xl py-6 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200 font-medium"
            onClick={() => setPickerOpen(true)}
          >
            Start Game
          </button>

          <button
            className="w-full text-xl py-6 px-4 border border-white text-white hover:bg-white/10 rounded-md transition-colors duration-200 font-medium"
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </button>

          <button
            className="w-full text-xl py-6 px-4 border border-white text-white hover:bg-white/10 rounded-md transition-colors duration-200 font-medium"
            onClick={() => setKeysOpen(true)}
          >
            Key Mappings / Usages
          </button>
        </div>
      </div>

      {/* Game Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 text-white rounded-xl w-full max-w-3xl shadow-2xl p-6">
            <h3 className="text-2xl font-semibold mb-4">Choose a Game</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => onSelectGame("beer")}
                className="group rounded-lg border border-white/20 hover:border-white/60 p-5 text-left transition"
              >
                <div className="text-xl font-bold mb-2">🍺 Beer Drop</div>
                <p className="text-sm text-gray-300">
                  Catch falling beers. Simple, fast, arcade fun.
                </p>
              </button>

              <button
                onClick={() => onSelectGame("maze")}
                className="group rounded-lg border border-white/20 hover:border-white/60 p-5 text-left transition"
              >
                <div className="text-xl font-bold mb-2">🧩 Maze Game</div>
                <p className="text-sm text-gray-300">
                  Navigate the maze to the exit. Watch the timer!
                </p>
              </button>

              <button
                onClick={() => onSelectGame("quiz")}
                className="group rounded-lg border border-white/20 hover:border-white/60 p-5 text-left transition"
              >
                <div className="text-xl font-bold mb-2">❓ Quiz Game</div>
                <p className="text-sm text-gray-300">
                  Multiple-choice quizzes. Pure React, no Phaser.
                </p>
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                onClick={() => setPickerOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-medium leading-6 mb-2">Settings</h3>
              <p className="text-sm text-gray-300 mb-4">
                There are no settings available. All you can do is play the
                game.
              </p>
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                  onClick={() => setSettingsOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Mappings Modal */}
      {keysOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 text-white rounded-lg max-w-md w-full mx-4 overflow-hidden shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-medium leading-6 mb-4">
                Key Mappings / Usages
              </h3>
              <ul className="space-y-3 text-sm text-gray-300">
                <li>
                  <span className="font-bold">Gun Pickup</span> – G
                </li>
                <li>
                  <span className="font-bold">Reload</span> – R
                </li>
                <li>
                  <span className="font-bold">House enter/exit</span> – E
                </li>
                <li>
                  <span className="font-bold">Movement</span> – A / S / D / F
                </li>
              </ul>
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                  onClick={() => setKeysOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
