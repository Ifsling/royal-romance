"use client"

import dynamic from "next/dynamic"

// Prevent SSR
const PhaserGame = dynamic(() => import("./phaser/controllers/PhaserGame"), {
  ssr: false,
})

export default function Home() {
  return <PhaserGame />
}
