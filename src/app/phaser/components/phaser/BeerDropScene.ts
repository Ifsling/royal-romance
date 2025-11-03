// src/app/phaser/components/phaser/BeerDropScene.ts
"use client"

import * as Phaser from "phaser"

// --- UI layout ---
const UI_BAR_H = 48
const RIGHT_PANEL_W = 280
const DROP_ZONE_H = 40

// --- Gameplay tuning ---
const START_SPEED = 120
const SPEED_PER_POINT = 2

const BASE_SPAWN_MS = 2000
const MIN_SPAWN_MS = 350
const SPAWN_ACCEL_PER_POINT = 25

const MAX_LIVES = 3
const SCORE_STEP = 10

// --- Drunk effect tuning ---
const SHAKE_MIN_DELAY = 260
const SHAKE_MAX_DELAY = 80
const SHAKE_MIN_INTENSITY = 0.0
const SHAKE_MAX_INTENSITY = 0.02
const SHAKE_BURST_MS = 140

const BLUR_MAX = 8
const FAKE_BLUR_MAX_ZOOM = 1.06
const DRUNK_AT_SCORE = 80

// --- Assets ---
const ASSETS = {
  beer: "/images/beer.png",
  basket: "/images/basket.png",
}

const GIRLS: string[][] = [
  [
    "/images/adult-images/for-beer-drop-game/girl-one/1.png",
    "/images/adult-images/for-beer-drop-game/girl-one/2.png",
    "/images/adult-images/for-beer-drop-game/girl-one/3.png",
    "/images/adult-images/for-beer-drop-game/girl-one/4.png",
    "/images/adult-images/for-beer-drop-game/girl-one/5.png",
    "/images/adult-images/for-beer-drop-game/girl-one/6.png",
    "/images/adult-images/for-beer-drop-game/girl-one/7.png",
    "/images/adult-images/for-beer-drop-game/girl-one/0.png",
  ],
  [
    "/images/adult-images/for-beer-drop-game/girl-two/1.jpg",
    "/images/adult-images/for-beer-drop-game/girl-two/2.jpg",
    "/images/adult-images/for-beer-drop-game/girl-two/3.jpg",
    "/images/adult-images/for-beer-drop-game/girl-two/4.jpg",
    "/images/adult-images/for-beer-drop-game/girl-two/5.jpg",
    "/images/adult-images/for-beer-drop-game/girl-two/6.jpg",
    "/images/adult-images/for-beer-drop-game/girl-two/7.jpg",
    "/images/adult-images/for-beer-drop-game/girl-two/0.jpg",
  ],
]

export default class BeerDropScene extends Phaser.Scene {
  // physics
  private beers!: Phaser.Physics.Arcade.Group
  private basket!: Phaser.Physics.Arcade.Image

  // input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key

  // ui
  private scoreText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private rightImage!: Phaser.GameObjects.Image

  // cameras & FX
  private uiCam!: Phaser.Cameras.Scene2D.Camera
  private playCam!: Phaser.Cameras.Scene2D.Camera
  private playCamBlur?: any
  private shakeLoop?: Phaser.Time.TimerEvent

  // camera assignment helpers
  private gameplayObjects: Phaser.GameObjects.GameObject[] = []
  private uiObjects: Phaser.GameObjects.GameObject[] = []

  // game state
  private selectedGirl = 0
  private score = 0
  private lives = MAX_LIVES
  private isGameOver = false
  private spawnTimer?: Phaser.Time.TimerEvent

  constructor() {
    super("BeerDropScene")
  }

  init() {
    this.isGameOver = false
    this.score = 0
    this.lives = MAX_LIVES
    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
    this.stopDrunkFX()
  }

  private progressKey(idx: number) {
    return `girl_${this.selectedGirl}_${idx}`
  }

  preload() {
    // Pick girl (?set=0/1)
    const params = new URLSearchParams(window.location.search)
    const force = params.get("set")
    if (force === "0" || force === "1") this.selectedGirl = Number(force)
    else this.selectedGirl = Phaser.Math.Between(0, GIRLS.length - 1)

    const chosen = GIRLS[this.selectedGirl]
    chosen.forEach((url, idx) => {
      const key = this.progressKey(idx)
      if (!this.textures.exists(key)) this.load.image(key, url)
    })

    if (!this.textures.exists("beer")) this.load.image("beer", ASSETS.beer)
    if (!this.textures.exists("basket"))
      this.load.image("basket", ASSETS.basket)

    this.load.audio("bg-music", "/music/song1.mp3")
  }

  create() {
    const music = this.sound.add("bg-music", { loop: true, volume: 1 })
    music.play()

    const { width, height } = this.scale
    this.physics.world.setBounds(0, 0, width, height)

    // ---- Cameras: playCam = main, uiCam = overlay
    // playCam is the main camera, it renders FIRST (bottom layer)
    this.playCam = this.cameras.main
    this.playCam.setViewport(
      0,
      UI_BAR_H,
      width - RIGHT_PANEL_W,
      height - UI_BAR_H
    )
    this.playCam.setBackgroundColor(0x000000)

    // uiCam is the new camera, it renders SECOND (top layer)
    this.uiCam = this.cameras.add(0, 0, width, height)

    // Try real blur via postFX
    try {
      // @ts-ignore
      if (this.playCam.postFX && this.playCam.postFX.addBlur) {
        // @ts-ignore
        this.playCamBlur = this.playCam.postFX.addBlur(0, 2)
        this.playCamBlur.active = true
        this.playCamBlur.strength = 0
      }
    } catch {
      this.playCamBlur = undefined
    }

    // ---- UI (drawn by uiCam)
    const gTop = this.add
      .graphics()
      .fillStyle(0x000000, 0.35)
      .fillRect(0, 0, width - RIGHT_PANEL_W, UI_BAR_H)
    const gRight = this.add
      .graphics()
      .fillStyle(0x000000, 0.25)
      .fillRect(width - RIGHT_PANEL_W, 0, RIGHT_PANEL_W, height)
    this.uiObjects.push(gTop, gRight)

    // Single menu button + single label
    const menuBtn = this.add.container(width - RIGHT_PANEL_W - 110, 24)
    const btnRect = this.add
      .rectangle(0, 0, 120, 32, 0x222222, 0.8)
      .setOrigin(0.5)
    btnRect.setInteractive({ useHandCursor: true })
    btnRect.on("pointerup", () => window.dispatchEvent(new Event("GO_TO_MENU")))
    const btnLabel = this.add
      .text(0, 0, "Go to menu", {
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
    menuBtn.add([btnRect, btnLabel])
    this.uiObjects.push(menuBtn)

    // UI texts
    this.scoreText = this.text(12, 10, "Score: 0")
    this.livesText = this.text(
      width / 2 - 40,
      10,
      `Life: ${"♥".repeat(this.lives)}`
    )
    this.uiObjects.push(this.scoreText, this.livesText)

    // Right image (UI)
    this.rightImage = this.add
      .image(width - RIGHT_PANEL_W / 2, height / 2, this.progressKey(0))
      .setOrigin(0.5)
    this.fitRightImage()
    this.uiObjects.push(this.rightImage)

    // ---- DROP ZONE BOX (drawn by PLAY CAMERA so it’s visible in playfield)
    const gDropPlay = this.add
      .graphics()
      .fillStyle(0xffffff, 0.08)
      .fillRect(0, 0, width - RIGHT_PANEL_W, DROP_ZONE_H)
    const gDropBorderPlay = this.add
      .graphics()
      .lineStyle(2, 0xffffff, 0.15)
      .strokeRect(0, 0, width - RIGHT_PANEL_W, DROP_ZONE_H)
    // position them inside the playCam viewport space: playCam starts at y = UI_BAR_H
    gDropPlay.setY(0) // because playCam's (0,0) is actually screen (0, UI_BAR_H)
    gDropBorderPlay.setY(0)
    this.gameplayObjects.push(gDropPlay, gDropBorderPlay)

    // ---- Basket (gameplay)
    this.basket = this.physics.add
      .image((width - RIGHT_PANEL_W) / 2, height - 130, "basket")
      .setScale(0.2)
    this.basket.setImmovable(true).setCollideWorldBounds(true).setDepth(5)

    this.gameplayObjects.push(this.basket)

    // ---- Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // ---- Group
    this.beers = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      collideWorldBounds: false,
    })

    // Catch overlap
    this.physics.add.overlap(
      this.beers,
      this.basket,
      (_basket, beerObj) =>
        this.handleCatch(beerObj as Phaser.Physics.Arcade.Image),
      undefined,
      this
    )

    // Start spawning
    this.recreateSpawnTimer(BASE_SPAWN_MS)

    // Restart/Menu keys
    const kM = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M)
    const kR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    kM.once("down", () => window.dispatchEvent(new Event("GO_TO_MENU")))
    kR.once("down", () => this.scene.restart())

    // Camera masking/ignores
    this.uiCam.ignore(this.gameplayObjects)
    this.playCam.ignore(this.uiObjects)

    // Start continuous drunk effects (begin at zero intensity)
    this.startDrunkFX()
  }

  update() {
    if (this.isGameOver) return

    const { width, height } = this.scale

    // Basket control
    const speed = 500
    let vx = 0
    if (this.cursors.left?.isDown || this.keyA.isDown) vx -= speed
    if (this.cursors.right?.isDown || this.keyD.isDown) vx += speed
    this.basket.setVelocityX(vx)

    const half = this.basket.displayWidth * 0.5
    this.basket.x = Phaser.Math.Clamp(
      this.basket.x,
      half,
      width - RIGHT_PANEL_W - half
    )

    // Miss on floor — use body.bottom so the BEER'S BASE triggers the miss
    const floorY = height - 1
    for (const ch of this.beers.getChildren()) {
      const beer = ch as Phaser.Physics.Arcade.Image
      if (!beer.active) continue
      const body = beer.body as Phaser.Physics.Arcade.Body
      if (body && body.bottom >= floorY) this.handleMiss(beer)
    }

    // Update blur strength each frame
    this.updateDrunkBlur()
  }

  // --------------- helpers & logic ---------------

  private text(x: number, y: number, t: string) {
    return this.add.text(x, y, t, {
      fontFamily: "Inter, system-ui, Arial, sans-serif",
      fontSize: "18px",
      color: "#ffffff",
    })
  }

  private spawnBeer() {
    if (this.isGameOver) return
    const { width } = this.scale
    const playW = width - RIGHT_PANEL_W
    const x = Phaser.Math.Between(18, playW - 18)
    // spawn just below the drop-zone box (inside playCam space)
    const y = UI_BAR_H + DROP_ZONE_H + 10

    const beer = this.beers.get(x, y, "beer") as Phaser.Physics.Arcade.Image
    beer.setActive(true).setVisible(true).setDepth(3).setScale(0.2)

    // IMPORTANT: set body size to match scaled sprite so body.bottom is accurate
    const body = beer.body as Phaser.Physics.Arcade.Body
    body.setSize(beer.displayWidth, beer.displayHeight, true)

    const vy = START_SPEED + this.score * SPEED_PER_POINT
    beer.setVelocity(0, vy)

    // make sure only gameplay camera renders the beer
    this.gameplayObjects.push(beer)
    this.uiCam.ignore([beer])
  }

  private handleCatch(beer: Phaser.Physics.Arcade.Image) {
    if (this.isGameOver) return
    beer.destroy()

    this.score += 1
    this.scoreText.setText(`Score: ${this.score}`)
    this.updateRightImage()
    this.updateSpawnDifficulty()
  }

  private handleMiss(beer: Phaser.Physics.Arcade.Image) {
    if (this.isGameOver) return
    beer.destroy()

    this.lives = Math.max(0, this.lives - 1)
    this.livesText.setText(`Life: ${"♥".repeat(this.lives)}`)
    if (this.lives <= 0) this.gameOver()
  }

  private gameOver() {
    if (this.isGameOver) return
    this.isGameOver = true

    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
    this.beers.clear(true, true)
    this.stopDrunkFX()

    const { width, height } = this.scale

    // --- START OF CHANGES ---

    // Set a high depth to ensure this UI renders on top of all other UI
    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0)
      .setDepth(10) // Force it to be on top

    const t1 = this.text(width / 2, height / 2 - 10, "Game Over")
      .setFontSize(28)
      .setOrigin(0.5)
      .setDepth(11) // Force it to be on top of the overlay

    const t2 = this.text(
      width / 2,
      height / 2 + 24,
      "Press M to Menu / R to Restart"
    )
      .setOrigin(0.5)
      .setDepth(11) // Force it to be on top of the overlay

    // --- END OF CHANGES ---

    // keep overlay on UI camera (Your existing, correct logic)
    this.uiObjects.push(overlay, t1, t2)
    this.playCam.ignore([overlay, t1, t2])
  }

  private updateRightImage() {
    const arr = GIRLS[this.selectedGirl]
    const idx = Math.min(Math.floor(this.score / SCORE_STEP), arr.length - 1)
    const key = this.progressKey(idx)
    if (this.rightImage.texture.key !== key) {
      this.rightImage.setTexture(key)
      this.fitRightImage()
    }
  }

  private fitRightImage() {
    const pad = 16
    const targetW = RIGHT_PANEL_W - pad * 2
    const targetH = this.scale.height - UI_BAR_H - pad * 2
    const src = this.rightImage.texture.getSourceImage() as
      | HTMLImageElement
      | HTMLCanvasElement
    const sw = (src as any)?.width || 1
    const sh = (src as any)?.height || 1
    const s = Math.min(targetW / sw, targetH / sh)
    this.rightImage
      .setScale(s)
      .setPosition(
        this.scale.width - RIGHT_PANEL_W / 2,
        UI_BAR_H + targetH / 2 + pad
      )
  }

  private recreateSpawnTimer(delayMs: number) {
    this.spawnTimer?.remove(false)
    this.spawnTimer = this.time.addEvent({
      delay: delayMs,
      loop: true,
      callback: () => this.spawnBeer(),
    })
  }

  private updateSpawnDifficulty() {
    const newDelay = Math.max(
      MIN_SPAWN_MS,
      BASE_SPAWN_MS - this.score * SPAWN_ACCEL_PER_POINT
    )
    this.recreateSpawnTimer(newDelay)
  }

  // --------- Drunk FX ---------

  private drunkLevel(): number {
    return Phaser.Math.Clamp(this.score / DRUNK_AT_SCORE, 0, 1)
  }

  private startDrunkFX() {
    this.stopDrunkFX()
    this.scheduleNextShake()
    this.updateDrunkBlur()
  }

  private stopDrunkFX() {
    this.shakeLoop?.remove(false)
    this.shakeLoop = undefined
    if (this.playCamBlur) {
      this.playCamBlur.active = true
      this.playCamBlur.strength = 0
    } else if (this.playCam) {
      this.playCam.setZoom(1)
    }
  }

  private scheduleNextShake() {
    const lvl = this.drunkLevel()
    const delay = Phaser.Math.Linear(SHAKE_MIN_DELAY, SHAKE_MAX_DELAY, lvl)
    this.shakeLoop = this.time.addEvent({
      delay,
      loop: false,
      callback: () => {
        this.applyShakeBurst()
        this.scheduleNextShake()
      },
    })
  }

  private applyShakeBurst() {
    if (!this.playCam) return
    const lvl = this.drunkLevel()
    if (lvl <= 0) return
    const intensity = Phaser.Math.Linear(
      SHAKE_MIN_INTENSITY,
      SHAKE_MAX_INTENSITY,
      lvl
    )
    this.playCam.shake(SHAKE_BURST_MS, intensity)
  }

  private updateDrunkBlur() {
    const lvl = this.drunkLevel()
    if (this.playCamBlur) {
      this.playCamBlur.active = true
      this.playCamBlur.strength = BLUR_MAX * lvl
    } else if (this.playCam) {
      const z = Phaser.Math.Linear(1, FAKE_BLUR_MAX_ZOOM, lvl)
      this.playCam.setZoom(z)
    }
  }
}
