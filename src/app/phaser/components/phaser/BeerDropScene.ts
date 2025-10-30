import Phaser from "phaser"

const UI_BAR_H = 48
const RIGHT_PANEL_W = 280
const DROP_ZONE_H = 40

const START_SPEED = 120
const SPEED_PER_POINT = 4

const BASE_SPAWN_MS = 2000
const MIN_SPAWN_MS = 350
const SPAWN_ACCEL_PER_POINT = 5

const MAX_LIVES = 3
const SCORE_STEP = 2

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

// const GIRLS: string[][] = [
//   [
//     "/images/adult-images/placeholders/1.png",
//     "/images/adult-images/placeholders/2.png",
//     "/images/adult-images/placeholders/3.png",
//     "/images/adult-images/placeholders/4.png",
//     "/images/adult-images/placeholders/5.png",
//     "/images/adult-images/placeholders/6.png",
//     "/images/adult-images/placeholders/7.png",
//     "/images/adult-images/placeholders/8.png",
//     "/images/adult-images/placeholders/9.png",
//   ],
// ]
export default class BeerDropScene extends Phaser.Scene {
  private beers!: Phaser.Physics.Arcade.Group
  private basket!: Phaser.Physics.Arcade.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyA!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key

  private score = 0
  private lives = MAX_LIVES
  private spawnTimer?: Phaser.Time.TimerEvent

  private scoreText!: Phaser.GameObjects.Text
  private livesText!: Phaser.GameObjects.Text
  private rightImage!: Phaser.GameObjects.Image

  private selectedGirl = 0

  constructor() {
    super("BeerDropScene")
  }

  private progressKey(idx: number) {
    return `girl_${this.selectedGirl}_${idx}`
  }

  preload() {
    // --- Pick girl before loading assets ---
    const params = new URLSearchParams(window.location.search)
    const force = params.get("set")
    if (force === "0" || force === "1") this.selectedGirl = Number(force)
    else this.selectedGirl = Phaser.Math.Between(0, GIRLS.length - 1)

    // --- Load only chosen girl ---
    const chosen = GIRLS[this.selectedGirl]
    chosen.forEach((url, idx) => {
      const key = this.progressKey(idx)
      if (!this.textures.exists(key)) this.load.image(key, url)
    })

    // --- Core assets ---
    if (!this.textures.exists("beer")) this.load.image("beer", ASSETS.beer)
    if (!this.textures.exists("basket"))
      this.load.image("basket", ASSETS.basket)
  }

  create() {
    const { width, height } = this.scale
    this.physics.world.setBounds(0, 0, width, height)

    // --- Background panels ---
    const g = this.add.graphics()
    g.fillStyle(0x000000, 0.35).fillRect(0, 0, width - RIGHT_PANEL_W, UI_BAR_H)
    g.fillStyle(0x000000, 0.25).fillRect(
      width - RIGHT_PANEL_W,
      0,
      RIGHT_PANEL_W,
      height
    )
    g.fillStyle(0xffffff, 0.08).fillRect(
      0,
      UI_BAR_H,
      width - RIGHT_PANEL_W,
      DROP_ZONE_H
    )
    g.lineStyle(2, 0xffffff, 0.15).strokeRect(
      0,
      UI_BAR_H,
      width - RIGHT_PANEL_W,
      DROP_ZONE_H
    )

    // --- Text ---
    this.scoreText = this.text(12, 10, "Score: 0")
    this.livesText = this.text(
      width / 2 - 40,
      10,
      `Life: ${"♥".repeat(this.lives)}`
    )

    // --- Menu button ---
    const btn = this.add
      .rectangle(width - RIGHT_PANEL_W - 110, 24, 120, 32, 0x222222, 0.8)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => window.dispatchEvent(new Event("GO_TO_MENU")))
    this.text(btn.x, btn.y, "Go to menu").setOrigin(0.5)

    // --- Right image ---
    this.rightImage = this.add
      .image(width - RIGHT_PANEL_W / 2, height / 2, this.progressKey(0))
      .setOrigin(0.5)
    this.fitRightImage()

    // --- Basket ---
    this.basket = this.physics.add
      .image(width / 2, height - 70, "basket")
      .setScale(0.2)
    this.basket.setImmovable(true).setCollideWorldBounds(true).setDepth(5)

    // --- Input ---
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // --- Beers group ---
    this.beers = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      collideWorldBounds: false,
    })

    // --- Overlap (beer first) ---
    this.physics.add.overlap(
      this.beers,
      this.basket,
      (_basket, beerObj) =>
        this.handleCatch(beerObj as Phaser.Physics.Arcade.Image),
      undefined,
      this
    )

    // --- Start spawning ---
    this.recreateSpawnTimer(BASE_SPAWN_MS)
  }

  update() {
    const { width, height } = this.scale

    // Basket control
    const speed = 500
    let vx = 0
    if (this.cursors.left?.isDown || this.keyA.isDown) vx -= speed
    if (this.cursors.right?.isDown || this.keyD.isDown) vx += speed
    this!.basket!.setVelocityX(vx)

    const half = this.basket.displayWidth * 0.5
    this.basket.x = Phaser.Math.Clamp(
      this.basket.x,
      half,
      width - RIGHT_PANEL_W - half
    )

    // Floor misses
    for (const ch of this.beers.getChildren()) {
      const beer = ch as Phaser.Physics.Arcade.Image
      if (beer.active && beer.y > height - 2) this.handleMiss(beer)
    }
  }

  // --- Game logic ---
  private text(x: number, y: number, t: string) {
    return this.add.text(x, y, t, {
      fontFamily: "Inter, system-ui, Arial, sans-serif",
      fontSize: "18px",
      color: "#ffffff",
    })
  }

  private spawnBeer() {
    const { width } = this.scale
    const playW = width - RIGHT_PANEL_W
    const x = Phaser.Math.Between(18, playW - 18)
    const y = UI_BAR_H + DROP_ZONE_H + 10

    const beer = this.beers.get(x, y, "beer") as Phaser.Physics.Arcade.Image
    beer.setActive(true).setVisible(true).setDepth(3).setScale(0.2)
    const vy = START_SPEED + this.score * SPEED_PER_POINT
    beer.setVelocity(0, vy)
  }

  private handleCatch(beer: Phaser.Physics.Arcade.Image) {
    beer.destroy()
    this.score += 1
    this.scoreText.setText(`Score: ${this.score}`)
    this.updateRightImage()
    this.updateSpawnDifficulty()
  }

  private handleMiss(beer: Phaser.Physics.Arcade.Image) {
    beer.destroy()
    this.lives = Math.max(0, this.lives - 1)
    this.livesText.setText(`Life: ${"♥".repeat(this.lives)}`)
    if (this.lives <= 0) this.gameOver()
  }

  private gameOver() {
    this.spawnTimer?.remove(false)
    const { width, height } = this.scale
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0)
    this.text(width / 2, height / 2 - 10, "Game Over")
      .setFontSize(28)
      .setOrigin(0.5)
    this.text(
      width / 2,
      height / 2 + 24,
      "Press M to Menu / R to Restart"
    ).setOrigin(0.5)

    const kM = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M)
    const kR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R)
    kM.once("down", () => window.dispatchEvent(new Event("GO_TO_MENU")))
    kR.once("down", () => this.scene.restart())
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
    const sw = src?.width || 1
    const sh = src?.height || 1
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
}
