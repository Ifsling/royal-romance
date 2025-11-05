// src/scenes/MazeScene.ts
"use client"

import * as Phaser from "phaser"
import PuzzleManager from "./PuzzleManager"

// ----- CONFIG -----
const MAP_KEY = "maze-map"
const TILESET_KEY = "maze-tileset"
const BACKGROUND_LAYER = "Background"
const WALLS_LAYER = "Walls"

const MAP_JSON_URL = "/tilemap/maze-map.tmj"
const TILESET_IMG_URL = "/tilemap/tileset.png"

const PLAYER_KEY = "player_char"
const PLAYER_URL = "/images/adult-images/for-maze-game/player_character.png"
const PLAYER_SCALE = 0.18
const PLAYER_SPEED = 280

// Use real world scaling (no camera zoom fakery)
const MAP_SCALE_FACTOR = 2.4

const CAMERA_ZOOM = 1 // keep camera at 1; true zoom comes from MAP_SCALE_FACTOR
const SHOW_COLLISION_DEBUG = false

const POST_KEYS = ["post1", "post2", "post3", "post4", "post5", "post6"]
const POST_URLS = [
  "/images/adult-images/for-maze-game/1.png",
  "/images/adult-images/for-maze-game/2.png",
  "/images/adult-images/for-maze-game/3.png",
  "/images/adult-images/for-maze-game/4.png",
  "/images/adult-images/for-maze-game/5.png",
  "/images/adult-images/for-maze-game/6.png",
]

// ----- GRID <-> WORLD HELPERS (respecting MAP_SCALE_FACTOR) -----
const gx2wx = (tx: number, tileW: number) =>
  tx * tileW * MAP_SCALE_FACTOR + (tileW * MAP_SCALE_FACTOR) / 2
const gy2wy = (ty: number, tileH: number) =>
  ty * tileH * MAP_SCALE_FACTOR + (tileH * MAP_SCALE_FACTOR) / 2
const wx2gx = (wx: number, tileW: number) =>
  Math.floor(wx / (tileW * MAP_SCALE_FACTOR))
const wy2gy = (wy: number, tileH: number) =>
  Math.floor(wy / (tileH * MAP_SCALE_FACTOR))

export default class MazeScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private tileset!: Phaser.Tilemaps.Tileset
  private bgLayer!: Phaser.Tilemaps.TilemapLayer
  private wallLayer!: Phaser.Tilemaps.TilemapLayer

  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyW!: Phaser.Input.Keyboard.Key
  private keyA!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private keyD!: Phaser.Input.Keyboard.Key

  private puzzleManager!: PuzzleManager
  private puzzleBoxes!: Phaser.Physics.Arcade.Group
  private keyP!: Phaser.Input.Keyboard.Key
  private promptText!: Phaser.GameObjects.Text
  private activePuzzleBox: Phaser.GameObjects.GameObject | null = null

  private tileW = 32
  private tileH = 32
  private mapW = 0
  private mapH = 0

  private keyL!: Phaser.Input.Keyboard.Key

  constructor() {
    super("MazeScene")
  }

  preload() {
    this.load.tilemapTiledJSON(MAP_KEY, MAP_JSON_URL)
    this.load.image(TILESET_KEY, TILESET_IMG_URL)

    this.load.image(PLAYER_KEY, PLAYER_URL)
    POST_KEYS.forEach((k, i) => this.load.image(k, POST_URLS[i]))

    this.load.audio("bg-music", "/music/song2.mp3")
  }

  create() {
    const music = this.sound.add("bg-music", { loop: true, volume: 1 })
    music.play()

    this.keyL = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L)

    // Tilemap + layers
    this.map = this.make.tilemap({ key: MAP_KEY })
    this.tileset = this.map.addTilesetImage("tileset", TILESET_KEY)!
    this.bgLayer = this.map
      .createLayer(BACKGROUND_LAYER, this.tileset, 0, 0)!
      .setDepth(0)
    this.wallLayer = this.map
      .createLayer(WALLS_LAYER, this.tileset, 0, 0)!
      .setDepth(1)

    // True world scaling
    this.bgLayer.setScale(MAP_SCALE_FACTOR)
    this.wallLayer.setScale(MAP_SCALE_FACTOR)

    // Tile metrics
    this.tileW = this.map.tileWidth
    this.tileH = this.map.tileHeight
    this.mapW = this.map.width
    this.mapH = this.map.height

    // Collisions (tiles with index 0 usually empty in Tiled)
    this.wallLayer.setCollisionBetween(1, 9999, true)

    if (SHOW_COLLISION_DEBUG) {
      const dbg = this.add.graphics().setDepth(9999)
      this.wallLayer.renderDebug(dbg, {
        tileColor: null,
        collidingTileColor: new Phaser.Display.Color(255, 0, 0, 120),
        faceColor: new Phaser.Display.Color(255, 255, 255, 255),
      })
      this.physics.world.createDebugGraphic()
      this.physics.world.drawDebug = true
    }

    // World/camera bounds in scaled pixels
    const scaledWorldW = this.map.widthInPixels * MAP_SCALE_FACTOR
    const scaledWorldH = this.map.heightInPixels * MAP_SCALE_FACTOR
    this.cameras.main.setBounds(0, 0, scaledWorldW, scaledWorldH)
    this.physics.world.setBounds(0, 0, scaledWorldW, scaledWorldH)

    // Spawn at an empty grid tile -> convert to scaled world
    const spawnTile = this.getRandomEmptyTile()
    const spawnX = gx2wx(spawnTile.x, this.tileW)
    const spawnY = gy2wy(spawnTile.y, this.tileH)

    this.player = this.physics.add
      .sprite(spawnX, spawnY, PLAYER_KEY)
      .setDepth(5)
      .setScale(PLAYER_SCALE)
      .setOrigin(0.5)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)
    body.setSize(
      this.player.displayWidth * 0.55,
      this.player.displayHeight * 0.55,
      true
    )

    this.physics.add.collider(this.player, this.wallLayer)

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.keyP = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P)

    // Camera follow at zoom 1 (true size is from map scaling)
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18)
    this.cameras.main.setZoom(CAMERA_ZOOM)

    // Puzzle manager + boxes
    this.puzzleManager = new PuzzleManager(this)
    this.puzzleBoxes = this.physics.add.group()

    this.promptText = this.add
      .text(0, 0, "Press P to play the Puzzle", {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#000000a0",
        padding: { x: 10, y: 5 },
      })
      .setDepth(50)
      .setOrigin(0.5)
      .setVisible(false)

    const used = new Set<string>([this.key(spawnTile.x, spawnTile.y)])
    for (let i = 0; i < POST_KEYS.length; i++) {
      const t = this.getRandomEmptyTile(used)
      used.add(this.key(t.x, t.y))

      const px = gx2wx(t.x, this.tileW)
      const py = gy2wy(t.y, this.tileH)

      const boxW = this.tileW * MAP_SCALE_FACTOR * 0.8
      const boxH = this.tileH * MAP_SCALE_FACTOR * 0.8

      const puzzleBox = this.add
        .rectangle(px, py, boxW, boxH, 0xffff00)
        .setOrigin(0.5)
        .setDepth(2)

      this.tweens.add({
        targets: puzzleBox,
        alpha: { from: 0.3, to: 0.8 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      })

      puzzleBox.setData("postKey", POST_KEYS[i])
      puzzleBox.setData("isSolved", false)
      puzzleBox.setData("px", px)
      puzzleBox.setData("py", py)
      puzzleBox.setData("puzzleType", i % 3)

      this.puzzleBoxes.add(puzzleBox)
    }
  }

  update() {
    if (this.puzzleManager.getIsActive()) {
      ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyL)) {
      const gx = wx2gx(this.player.x, this.tileW)
      const gy = wy2gy(this.player.y, this.tileH)
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body
    let vx = 0
    let vy = 0

    if (this.cursors.left?.isDown || this.keyA.isDown) vx -= PLAYER_SPEED
    if (this.cursors.right?.isDown || this.keyD.isDown) vx += PLAYER_SPEED
    if (this.cursors.up?.isDown || this.keyW.isDown) vy -= PLAYER_SPEED
    if (this.cursors.down?.isDown || this.keyS.isDown) vy += PLAYER_SPEED

    body.setVelocity(vx, vy)
    if (vx !== 0 && vy !== 0) body.velocity.scale(0.7071)

    let overlappingBox: Phaser.GameObjects.GameObject | null = null

    this.physics.overlap(
      this.player,
      this.puzzleBoxes,
      (_player, puzzleBox) => {
        const box = puzzleBox as Phaser.GameObjects.GameObject
        if (!box.getData("isSolved")) overlappingBox = box
      },
      undefined,
      this
    )

    if (overlappingBox) {
      this.activePuzzleBox = overlappingBox
      this.promptText.setVisible(true)
      this.promptText.setPosition(this.player.x, this.player.y - 50)

      if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
        this.puzzleManager.openPuzzle(this.activePuzzleBox)
        this.promptText.setVisible(false)
        this.activePuzzleBox = null
      }
    } else {
      this.activePuzzleBox = null
      this.promptText.setVisible(false)
    }
  }

  public getWorldObjects(): Phaser.GameObjects.GameObject[] {
    const list: Phaser.GameObjects.GameObject[] = [
      this.bgLayer,
      this.wallLayer,
      this.player,
    ]
    this.puzzleBoxes
      ?.getChildren()
      ?.forEach((g) => list.push(g as Phaser.GameObjects.GameObject))
    return list
  }

  public onPuzzleSolved(solvedPuzzleBox: Phaser.GameObjects.GameObject) {
    if (!solvedPuzzleBox) return

    solvedPuzzleBox.setData("isSolved", true)

    const postKey = solvedPuzzleBox.getData("postKey") as string
    const px = solvedPuzzleBox.getData("px") as number
    const py = solvedPuzzleBox.getData("py") as number

    const post = this.add.image(px, py, postKey).setDepth(3)

    const maxW = this.tileW * MAP_SCALE_FACTOR * 0.8
    const maxH = this.tileH * MAP_SCALE_FACTOR * 0.8
    const src = post.texture.getSourceImage() as
      | HTMLImageElement
      | HTMLCanvasElement
    const sw = (src as any)?.width || 1
    const sh = (src as any)?.height || 1
    post.setScale(Math.min(maxW / sw, maxH / sh))

    this.tweens.killTweensOf(solvedPuzzleBox)
    solvedPuzzleBox.destroy()
  }

  private key(x: number, y: number) {
    return `${x},${y}`
  }

  private getRandomEmptyTile(avoid: Set<string> = new Set()) {
    // Try random samples first
    for (let tries = 0; tries < 2000; tries++) {
      const x = Phaser.Math.Between(0, this.mapW - 1)
      const y = Phaser.Math.Between(0, this.mapH - 1)
      if (avoid.has(this.key(x, y))) continue
      const tile = this.wallLayer.getTileAt(x, y)
      if (!tile || tile.index === 0) return { x, y }
    }
    // Fallback scan
    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        if (avoid.has(this.key(x, y))) continue
        const t = this.wallLayer.getTileAt(x, y)
        if (!t || t.index === 0) return { x, y }
      }
    }
    return { x: 0, y: 0 }
  }
}
