import MazeScene from "./MazeScene"
import { MiniPuzzleFactory } from "./MiniPuzzles"

const OVERLAY_SCALE = 0.7
const OVERLAY_ALPHA = 0.7

export default class PuzzleManager {
  private scene: MazeScene
  private activePuzzleBox: Phaser.GameObjects.GameObject | null = null
  private dimBg: Phaser.GameObjects.Rectangle | null = null
  private puzzleContainer: Phaser.GameObjects.Container | null = null
  private uiCam: Phaser.Cameras.Scene2D.Camera | null = null
  private isActive = false

  constructor(scene: MazeScene) {
    this.scene = scene
  }

  public getIsActive() {
    return this.isActive
  }

  public openPuzzle(puzzleBox: Phaser.GameObjects.GameObject) {
    if (this.isActive) return
    this.isActive = true
    this.activePuzzleBox = puzzleBox

    const puzzleType = puzzleBox.getData("puzzleType") as number
    const postKey = puzzleBox.getData("postKey") as string

    const mainCam = this.scene.cameras.main // Get the REAL main camera
    const sw = mainCam.width
    const sh = mainCam.height

    this.uiCam = this.scene.cameras
      .add(0, 0, sw, sh, false) // ⬅ THIS IS THE FIX (was true)
      .setZoom(1)
      .setScroll(0, 0)

    // Tell uiCam to ONLY render UI
    this.uiCam.ignore(this.scene.getWorldObjects())

    this.dimBg = this.scene.add
      .rectangle(sw / 2, sh / 2, sw, sh, 0x000000, OVERLAY_ALPHA)
      .setScrollFactor(0)
      .setDepth(100)

    const viewW = Math.floor(sw * OVERLAY_SCALE)
    const viewH = Math.floor(sh * OVERLAY_SCALE)
    const vx = Math.floor((sw - viewW) / 2)
    const vy = Math.floor((sh - viewH) / 2)

    this.puzzleContainer = this.scene.add
      .container(vx, vy)
      .setDepth(102)
      .setScrollFactor(0)

    const puzzleBg = this.scene.add
      .rectangle(0, 0, viewW, viewH, 0x1a1a1a)
      .setOrigin(0, 0)

    const title = this.scene.add
      .text(viewW / 2, 36, `Puzzle: ${postKey}`, {
        fontSize: "28px",
        color: "#ffffff",
      })
      .setOrigin(0.5)

    const closeBtnSize = 36
    const closeBtnX = viewW - closeBtnSize / 2 - 10
    const closeBtnY = closeBtnSize / 2 + 10

    const closeBtn = this.scene.add
      .rectangle(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, 0xff0000)
      .setInteractive()
      .setOrigin(0.5)

    const closeBtnText = this.scene.add
      .text(closeBtnX, closeBtnY, "X", {
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)

    closeBtn.on("pointerdown", () => {
      this.closePuzzle()
    })

    this.puzzleContainer.add([puzzleBg, title, closeBtn, closeBtnText])

    MiniPuzzleFactory.createPuzzle(
      this.scene,
      this.puzzleContainer,
      puzzleType,
      () => this.onSolve(),
      () => this.rebuildCurrentPuzzle(puzzleType, viewW, viewH)
    )

    // Tell the REAL main camera to IGNORE the UI elements
    mainCam.ignore([this.dimBg, this.puzzleContainer])
  }

  public closePuzzle() {
    if (!this.isActive) return

    const cleanup = this.puzzleContainer?.getData("cleanup") as
      | (() => void)
      | undefined
    if (cleanup) cleanup()

    this.dimBg?.destroy()
    this.puzzleContainer?.destroy()
    this.dimBg = null
    this.puzzleContainer = null

    if (this.uiCam) {
      this.scene.cameras.remove(this.uiCam, true)
      this.uiCam = null
    }

    this.activePuzzleBox = null
    this.isActive = false
  }

  private onSolve() {
    if (this.activePuzzleBox) this.scene.onPuzzleSolved(this.activePuzzleBox)
    this.closePuzzle()
  }

  private rebuildCurrentPuzzle(
    puzzleType: number,
    viewW: number,
    viewH: number
  ) {
    if (!this.puzzleContainer) return
    const keep = this.puzzleContainer.list.slice(0, 4)
    this.puzzleContainer.removeBetween(4, this.puzzleContainer.length - 1, true)
    const msg = this.scene.add
      .text(viewW / 2, 64, "Try again!", { fontSize: "18px", color: "#ff9e9e" })
      .setOrigin(0.5)
    this.puzzleContainer.add(msg)
    this.scene.time.delayedCall(350, () => {
      msg.destroy()
      MiniPuzzleFactory.createPuzzle(
        this.scene,
        this.puzzleContainer!,
        puzzleType,
        () => this.onSolve(),
        () => this.rebuildCurrentPuzzle(puzzleType, viewW, viewH)
      )
    })
  }
}
