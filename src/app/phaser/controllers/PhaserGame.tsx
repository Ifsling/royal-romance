// src/app/phaser/controllers/PhaserGame.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import QuizGame from "../components/quiz/QuizGame"
import MenuScreen, { MenuChoice } from "./MenuScreen"

type View = "menu" | "phaser" | "quiz"

export default function PhaserGame() {
  const gameRef = useRef<any | null>(null)
  const currentSceneRef = useRef<string | null>(null)
  const [view, setView] = useState<View>("menu")
  const [canvasHidden, setCanvasHidden] = useState(false)

  const bootPhaser = async (sceneName: "BeerDropScene" | "MazeScene") => {
    const Phaser = (await import("phaser")).default
    const SceneModule =
      sceneName === "BeerDropScene"
        ? await import("../components/phaser/BeerDropScene")
        : await import("../components/phaser/MazeScene")

    const StartScene = SceneModule.default

    if (!gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        physics: {
          default: "arcade",
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        dom: { createContainer: true },
        scene: [], // 👈 no scenes here
        parent: "phaser-container",
      }
      gameRef.current = new Phaser.Game(config)

      const handleResize = () => {
        const g = gameRef.current as Phaser.Game | null
        if (!g) return
        g.scale.resize(window.innerWidth, window.innerHeight)
        const s = g.scene.getAt(0) as Phaser.Scene | undefined
        s?.cameras?.main?.setSize(window.innerWidth, window.innerHeight)
      }
      window.addEventListener("resize", handleResize)
      ;(gameRef.current as any).__resize__ = handleResize
    }

    // Add or start safely (no duplicate keys)
    const g: import("phaser").Game = gameRef.current
    const sm = g.scene

    // stop old scene if running
    if (currentSceneRef.current && sm.isActive(currentSceneRef.current)) {
      sm.stop(currentSceneRef.current)
    }

    // if already registered, just start; else add then start
    const exists = !!sm.getScene(sceneName)
    if (!exists) sm.add(sceneName, StartScene)
    sm.start(sceneName)

    currentSceneRef.current = sceneName
  }

  const handleSelectGame = async (choice: MenuChoice) => {
    if (choice === "quiz") {
      if (gameRef.current && currentSceneRef.current) {
        const g: import("phaser").Game = gameRef.current
        g.scene.pause(currentSceneRef.current)
        setCanvasHidden(true)
      }
      setView("quiz")
      return
    }
    const sceneName = choice === "beer" ? "BeerDropScene" : "MazeScene"
    await bootPhaser(sceneName)
    setCanvasHidden(false)
    setView("phaser")
  }

  const goMenu = () => {
    if (gameRef.current && currentSceneRef.current) {
      const g: import("phaser").Game = gameRef.current
      if (g.scene.isActive(currentSceneRef.current))
        g.scene.pause(currentSceneRef.current)
    }
    setCanvasHidden(false)
    setView("menu")
  }

  useEffect(() => {
    const goToMenu = () => goMenu()
    window.addEventListener("GO_TO_MENU", goToMenu)
    return () => window.removeEventListener("GO_TO_MENU", goToMenu)
  }, [])

  // ⭐ Auto-launch from URL: /phaser?game=beer|maze|quiz
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const game = (params.get("game") || "").toLowerCase()
    if (game === "beer" || game === "maze") {
      // start a Phaser scene directly
      const sceneName = game === "beer" ? "BeerDropScene" : "MazeScene"
      bootPhaser(sceneName).then(() => {
        setCanvasHidden(false)
        setView("phaser")
      })
    } else if (game === "quiz") {
      setView("quiz")
      setCanvasHidden(true)
    }
  }, [])

  return (
    <>
      {view === "menu" && <MenuScreen onSelectGame={handleSelectGame} />}
      {view === "quiz" && <QuizGame />}
      <div
        id="phaser-container"
        className={`w-full h-screen ${canvasHidden ? "hidden" : ""}`}
      />
    </>
  )
}
