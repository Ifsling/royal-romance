"use client"

import * as Phaser from "phaser"

// ---- Constants & paths ----
const MAP_KEY = "maze-map"
const TILESET_KEY = "maze-tileset"
const BACKGROUND_LAYER = "Background"
const WALLS_LAYER = "Walls"

// Tiled exports (.tmj) & tileset image inside /public/tilemap
const MAP_JSON_URL = "/tilemap/maze-map.tmj"
const TILESET_IMG_URL = "/tilemap/tileset.png"

// Player
const PLAYER_KEY = "player_char"
const PLAYER_URL = "/images/adult-images/for-maze-game/player_character.png"
const PLAYER_SCALE = 0.18 // ⬅ smaller than before (was 0.4)
const PLAYER_SPEED = 280 // a bit slower to avoid tunneling through tiles

// View
const CAMERA_ZOOM = 2 // ⬅ zoomed-out a bit so map looks “bigger”
const SHOW_COLLISION_DEBUG = false // set true to see colliders

// Optional posts
const POST_KEYS = ["post1", "post2", "post3", "post4", "post5", "post6"]
const POST_URLS = [
  "/images/adult-images/for-maze-game/1.png",
  "/images/adult-images/for-maze-game/2.png",
  "/images/adult-images/for-maze-game/3.png",
  "/images/adult-images/for-maze-game/4.png",
  "/images/adult-images/for-maze-game/5.png",
  "/images/adult-images/for-maze-game/6.png",
]

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

  private tileW = 32
  private tileH = 32
  private mapW = 0
  private mapH = 0

  constructor() {
    super("MazeScene")
  }

  preload() {
    // Map + tileset
    this.load.tilemapTiledJSON(MAP_KEY, MAP_JSON_URL)
    this.load.image(TILESET_KEY, TILESET_IMG_URL)

    // Player & posts
    this.load.image(PLAYER_KEY, PLAYER_URL)
    POST_KEYS.forEach((k, i) => this.load.image(k, POST_URLS[i]))
  }

  create() {
    // --- Build map
    this.map = this.make.tilemap({ key: MAP_KEY })
    // name "tileset" must match tileset.name inside TMJ
    this.tileset = this.map.addTilesetImage("tileset", TILESET_KEY)!

    this.bgLayer = this.map
      .createLayer(BACKGROUND_LAYER, this.tileset, 0, 0)!
      .setDepth(0)
    this.wallLayer = this.map
      .createLayer(WALLS_LAYER, this.tileset, 0, 0)!
      .setDepth(1)

    // Metrics
    this.tileW = this.map.tileWidth
    this.tileH = this.map.tileHeight
    this.mapW = this.map.width
    this.mapH = this.map.height

    // ---- COLLISION ----
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

    // --- Player spawn on an empty tile
    const spawnTile = this.getRandomEmptyTile()
    const spawnX = spawnTile.x * this.tileW + this.tileW / 2
    const spawnY = spawnTile.y * this.tileH + this.tileH / 2

    this.player = this.physics.add
      .sprite(spawnX, spawnY, PLAYER_KEY)
      .setDepth(5)
      .setScale(PLAYER_SCALE)
      .setOrigin(0.5)

    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setCollideWorldBounds(true)

    // shrink body a bit so he fits corridors and properly hits walls
    body.setSize(
      this.player.displayWidth * 0.55,
      this.player.displayHeight * 0.55,
      true
    )

    // Add the collider (this is what actually stops the player on walls)
    this.physics.add.collider(this.player, this.wallLayer)

    // --- Input
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)

    // --- Camera (zoomed out to make map feel "bigger")
    const worldW = this.mapW * this.tileW
    const worldH = this.mapH * this.tileH
    this.cameras.main.setBounds(0, 0, worldW, worldH)
    this.physics.world.setBounds(0, 0, worldW, worldH)
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18)
    this.cameras.main.setZoom(CAMERA_ZOOM)

    // --- Random posts on empty tiles (not overlapping player)
    const used = new Set<string>([this.key(spawnTile.x, spawnTile.y)])
    for (let i = 0; i < POST_KEYS.length; i++) {
      const t = this.getRandomEmptyTile(used)
      used.add(this.key(t.x, t.y))

      const px = t.x * this.tileW + this.tileW / 2
      const py = t.y * this.tileH + this.tileH / 2
      const post = this.add.image(px, py, POST_KEYS[i]).setDepth(3)

      // keep inside a tile
      const maxW = this.tileW * 0.8
      const maxH = this.tileH * 0.8
      const src = post.texture.getSourceImage() as
        | HTMLImageElement
        | HTMLCanvasElement
      const sw = (src as any)?.width || 1
      const sh = (src as any)?.height || 1
      post.setScale(Math.min(maxW / sw, maxH / sh))
    }
  }

  update() {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    let vx = 0
    let vy = 0

    if (this.cursors.left?.isDown || this.keyA.isDown) vx -= PLAYER_SPEED
    if (this.cursors.right?.isDown || this.keyD.isDown) vx += PLAYER_SPEED
    if (this.cursors.up?.isDown || this.keyW.isDown) vy -= PLAYER_SPEED
    if (this.cursors.down?.isDown || this.keyS.isDown) vy += PLAYER_SPEED

    body.setVelocity(vx, vy)
    if (vx !== 0 && vy !== 0) body.velocity.scale(0.7071) // normalize diagonal
  }

  // --- helpers ---
  private key(x: number, y: number) {
    return `${x},${y}`
  }

  private getRandomEmptyTile(avoid: Set<string> = new Set()) {
    for (let tries = 0; tries < 2000; tries++) {
      const x = Phaser.Math.Between(0, this.mapW - 1)
      const y = Phaser.Math.Between(0, this.mapH - 1)
      if (avoid.has(this.key(x, y))) continue
      const tile = this.wallLayer.getTileAt(x, y)
      if (!tile || tile.index === 0) return { x, y }
    }
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
