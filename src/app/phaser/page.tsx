"use client"

import dynamic from "next/dynamic"

// Prevent SSR for Phaser
const PhaserGame = dynamic(() => import("../phaser/controllers/PhaserGame"), {
  ssr: false,
})

export default function PhaserPage() {
  return <PhaserGame />
}
