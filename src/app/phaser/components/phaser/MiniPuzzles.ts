import MazeScene from "./MazeScene"

export class MiniPuzzleFactory {
  public static createPuzzle(
    scene: MazeScene,
    container: Phaser.GameObjects.Container,
    puzzleType: number,
    onSolve: () => void,
    onFail: () => void
  ) {
    const bg = container.list[0] as Phaser.GameObjects.Rectangle
    const viewW = bg.width
    const viewH = bg.height

    switch (puzzleType) {
      case 0:
        return this.buildMinesweeper(
          scene,
          container,
          viewW,
          viewH,
          onSolve,
          onFail
        )
      case 1:
        return this.buildSudoku4(
          scene,
          container,
          viewW,
          viewH,
          onSolve,
          onFail
        )
      case 2:
        return this.buildHangman(
          scene,
          container,
          viewW,
          viewH,
          onSolve,
          onFail
        )
      default:
        return this.buildFindColorPuzzle(
          scene,
          container,
          viewW,
          viewH,
          onSolve,
          onFail
        )
    }
  }

  private static buildFindColorPuzzle(
    scene: MazeScene,
    container: Phaser.GameObjects.Container,
    viewW: number,
    viewH: number,
    onSolve: () => void,
    onFail: () => void
  ) {
    const title = scene.add
      .text(viewW / 2, 56, "Click the GREEN box", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)

    const positions = [
      { x: viewW * 0.25, y: viewH / 2 },
      { x: viewW * 0.5, y: viewH / 2 },
      { x: viewW * 0.75, y: viewH / 2 },
    ]
    const correctIndex = Phaser.Math.Between(0, 2)
    const size = 110

    positions.forEach((pos, index) => {
      const isCorrect = index === correctIndex
      const color = isCorrect ? 0x00ff00 : 0xff3b3b
      const box = scene.add
        .rectangle(pos.x, pos.y, size, size, color)
        .setInteractive()
      box.on("pointerdown", () => {
        if (isCorrect) this.flashAndSolve(scene, container, onSolve)
        else onFail()
      })
      container.add(box)
    })
    container.add(title)
  }

  private static buildMinesweeper(
    scene: MazeScene,
    container: Phaser.GameObjects.Container,
    viewW: number,
    viewH: number,
    onSolve: () => void,
    onFail: () => void
  ) {
    const cols = 6
    const rows = 6
    const mines = 6
    const gridSize = Math.min(viewW * 0.8, viewH * 0.7)
    const cell = Math.floor(gridSize / cols)
    const originX = Math.floor((viewW - cols * cell) / 2)
    const originY = Math.floor((viewH - rows * cell) / 2)

    const title = scene.add
      .text(viewW / 2, 36, "Minesweeper: open all safe cells", {
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
    container.add(title)

    const mineSet = new Set<number>()
    while (mineSet.size < mines)
      mineSet.add(Phaser.Math.Between(0, cols * rows - 1))

    const neighbor = (c: number, r: number) =>
      [-1, 0, 1]
        .flatMap((dx) => [-1, 0, 1].map((dy) => [c + dx, r + dy]))
        .filter(
          ([x, y]) =>
            !(x === c && y === r) && x >= 0 && y >= 0 && x < cols && y < rows
        )

    const opened: boolean[] = new Array(cols * rows).fill(false)
    let safeLeft = cols * rows - mines

    const openCell = (ci: number, ri: number) => {
      const idx = ri * cols + ci
      if (opened[idx]) return
      opened[idx] = true

      const x = originX + ci * cell
      const y = originY + ri * cell
      const rect = scene.add.rectangle(
        x + cell / 2,
        y + cell / 2,
        cell - 2,
        cell - 2,
        0x3c3c3c
      )
      container.add(rect)

      if (mineSet.has(idx)) {
        const boom = scene.add
          .text(viewW / 2, originY - 10, "Boom! Retry", {
            fontSize: "24px",
            color: "#ff9e9e",
          })
          .setOrigin(0.5)
        container.add(boom)
        onFail()
        return
      }

      const count = neighbor(ci, ri).reduce((acc, [x, y]) => {
        const id = y * cols + x
        return acc + (mineSet.has(id) ? 1 : 0)
      }, 0)

      safeLeft--
      if (count > 0) {
        const t = scene.add
          .text(x + cell / 2, y + cell / 2, String(count), {
            fontSize: "20px",
            color: "#ffffff",
          })
          .setOrigin(0.5)
        container.add(t)
      } else {
        neighbor(ci, ri).forEach(([nx, ny]) => openCell(nx, ny))
      }

      if (safeLeft <= 0) this.flashAndSolve(scene, container, onSolve)
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = originX + c * cell
        const y = originY + r * cell
        const tile = scene.add
          .rectangle(x + cell / 2, y + cell / 2, cell - 2, cell - 2, 0x7a7a7a)
          .setInteractive()
        tile.on("pointerdown", () => openCell(c, r))
        container.add(tile)
      }
    }
  }

  private static buildSudoku4(
    scene: MazeScene,
    container: Phaser.GameObjects.Container,
    viewW: number,
    viewH: number,
    onSolve: () => void,
    onFail: () => void
  ) {
    const solution = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
    ]
    const holes = 6
    const gridSize = Math.min(viewW * 0.62, viewH * 0.6)
    const cell = Math.floor(gridSize / 4)
    const ox = Math.floor((viewW - (gridSize + 140)) / 2)
    const oy = Math.floor((viewH - gridSize) / 2)

    const title = scene.add
      .text(
        viewW / 2,
        36,
        "4×4 Sudoku: click a cell, press 1–4 (or use keypad). Backspace clears.",
        {
          fontSize: "18px",
          color: "#ffffff",
          wordWrap: { width: viewW * 0.9 },
        }
      )
      .setOrigin(0.5)
    container.add(title)

    const given = solution.map((r) => r.slice())
    let removed = 0
    while (removed < holes) {
      const r = Phaser.Math.Between(0, 3)
      const c = Phaser.Math.Between(0, 3)
      if (given[r][c] !== 0) {
        given[r][c] = 0
        removed++
      }
    }

    const texts: Phaser.GameObjects.Text[][] = [[], [], [], []]
    const editable: boolean[][] = [[], [], [], []]
    let sel: { r: number; c: number } | null = null
    const selector = scene.add
      .rectangle(0, 0, cell - 2, cell - 2)
      .setStrokeStyle(2, 0xffffff)
      .setVisible(false)
    container.add(selector)

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = ox + c * cell
        const y = oy + r * cell
        const base = scene.add.rectangle(
          x + cell / 2,
          y + cell / 2,
          cell - 2,
          cell - 2,
          0x2a2a2a
        )
        base.setStrokeStyle(1, 0x444444)
        container.add(base)

        const v = given[r][c]
        const t = scene.add
          .text(x + cell / 2, y + cell / 2, v ? String(v) : "", {
            fontSize: "28px",
            color: "#ffffff",
          })
          .setOrigin(0.5)
        texts[r][c] = t
        editable[r][c] = v === 0
        container.add(t)

        if (editable[r][c]) {
          const z = scene.add
            .zone(x + cell / 2, y + cell / 2, cell - 2, cell - 2)
            .setInteractive()
          z.on("pointerdown", () => {
            sel = { r, c }
            selector.setPosition(x + cell / 2, y + cell / 2).setVisible(true)
          })
          container.add(z)
        }
      }
    }

    const thick = scene.add.graphics()
    thick.lineStyle(3, 0x555555)
    for (let i = 0; i <= 4; i += 2) {
      thick.strokeLineShape(
        new Phaser.Geom.Line(ox, oy + i * cell, ox + 4 * cell, oy + i * cell)
      )
      thick.strokeLineShape(
        new Phaser.Geom.Line(ox + i * cell, oy, ox + i * cell, oy + 4 * cell)
      )
    }
    container.add(thick)

    const kpX = ox + gridSize + 30
    const kpY = oy + cell
    const makeKey = (num: number, relY: number) => {
      const btn = scene.add
        .rectangle(kpX, kpY + relY, 48, 48, 0x4a4a4a)
        .setInteractive()
      const tx = scene.add
        .text(kpX, kpY + relY, String(num), {
          fontSize: "22px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
      btn.on("pointerdown", () => tryPut(num))
      container.add([btn, tx])
    }
    makeKey(1, 0)
    makeKey(2, 60)
    makeKey(3, 120)
    makeKey(4, 180)
    const clr = scene.add
      .rectangle(kpX, kpY + 240, 60, 36, 0x6a3636)
      .setInteractive()
    const clt = scene.add
      .text(kpX, kpY + 240, "Clear", { fontSize: "16px", color: "#ffffff" })
      .setOrigin(0.5)
    clr.on("pointerdown", () => tryPut(0))
    container.add([clr, clt])

    const keyHandler = (ev: KeyboardEvent) => {
      if (!sel) return
      if (ev.key === "Backspace" || ev.key === "Delete") {
        tryPut(0)
        return
      }
      const n = parseInt(ev.key, 10)
      if (n >= 1 && n <= 4) tryPut(n)
    }
    scene.input.keyboard?.on("keydown", keyHandler)
    container.setData("cleanup", () =>
      scene.input.keyboard?.off("keydown", keyHandler)
    )

    const tryPut = (n: number) => {
      if (!sel) return
      const { r, c } = sel
      if (!editable[r][c]) return
      texts[r][c].setText(n ? String(n) : "")
    }

    const checkBtn = scene.add
      .rectangle(viewW / 2, oy + gridSize + 40, 140, 40, 0x4a4a4a)
      .setInteractive()
    const checkTxt = scene.add
      .text(viewW / 2, oy + gridSize + 40, "Check", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
    container.add([checkBtn, checkTxt])

    checkBtn.on("pointerdown", () => {
      const cur = given.map((row) => row.slice())
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          if (editable[r][c]) cur[r][c] = parseInt(texts[r][c].text) || 0
        }
      const ok =
        cur.every((row) => row.every((v) => v >= 1 && v <= 4)) &&
        cur.every((row) => new Set(row).size === 4) &&
        [0, 1, 2, 3].every(
          (c) =>
            new Set([cur[0][c], cur[1][c], cur[2][c], cur[3][c]]).size === 4
        ) &&
        [0, 2].every((rs) =>
          [0, 2].every((cs) => {
            const box = [
              cur[rs][cs],
              cur[rs][cs + 1],
              cur[rs + 1][cs],
              cur[rs + 1][cs + 1],
            ]
            return new Set(box).size === 4
          })
        )
      if (ok) this.flashAndSolve(scene, container, onSolve)
      else onFail()
    })
  }

  private static buildHangman(
    scene: MazeScene,
    container: Phaser.GameObjects.Container,
    viewW: number,
    viewH: number,
    onSolve: () => void,
    onFail: () => void
  ) {
    const words = [
      "ALPHA",
      "BRAVO",
      "CHARLIE",
      "DELTA",
      "ECHO",
      "FOXTROT",
      "GOLF",
      "HOTEL",
      "INDIA",
      "JULIET",
      "KILO",
      "LIMA",
      "MIKE",
      "NOVEMBER",
      "OSCAR",
      "PAPA",
      "QUEBEC",
      "ROMEO",
      "SIERRA",
      "TANGO",
      "UNIFORM",
      "VICTOR",
      "WHISKEY",
      "XRAY",
      "YANKEE",
      "ZULU",
      "PUZZLE",
      "MAZE",
      "CODING",
      "PHASER",
      "SPRITE",
      "CAMERA",
      "TARGET",
      "VECTOR",
      "RANDOM",
      "GRID",
      "TILE",
      "LAYER",
      "COLLIDE",
      "PARSER",
      "BUFFER",
      "SOCKET",
      "PIXELS",
      "CURSOR",
      "BUTTON",
      "WINDOW",
      "SCREEN",
      "SCROLL",
      "BORDER",
      "SHADOW",
      "LIGHTS",
      "MUSIC",
      "VOLUME",
      "EFFECT",
      "TIMER",
      "SCORE",
      "HEALTH",
      "ARMOR",
      "WEAPON",
      "AMMO",
      "ENEMY",
      "PLAYER",
      "BOSS",
      "LEVEL",
      "QUEST",
      "LOOT",
      "COIN",
      "CHEST",
      "MAPS",
      "BRIDGE",
      "RIVER",
      "FOREST",
      "DESERT",
      "MOUNTAIN",
      "OCEAN",
      "ISLAND",
      "CASTLE",
      "DUNGEON",
      "CAVERN",
      "TUNNEL",
      "PORTAL",
      "TEMPLE",
      "SHRINE",
      "GARDEN",
      "MARKET",
      "VILLAGE",
      "CITY",
      "KINGDOM",
      "EMPIRE",
      "ROBOT",
      "DRAGON",
      "PHOENIX",
      "MONSTER",
      "GHOST",
      "SPIRIT",
      "NINJA",
      "PIRATE",
      "WIZARD",
      "KNIGHT",
      "SAMURAI",
      "ASTEROID",
      "COMET",
      "GALAXY",
      "PLANET",
      "SATELLITE",
      "ORBIT",
      "COSMOS",
      "NEBULA",
      "QUASAR",
      "TELESCOPE",
      "GRAVITY",
      "ATMOSPHERE",
      "ECLIPSE",
      "METEOR",
      "SOLAR",
      "LUNAR",
      "STARLIGHT",
      "ROVER",
      "ASTRONAUT",
      "SPACESHIP",
      "COMPUTER",
      "PROGRAM",
      "VARIABLE",
      "FUNCTION",
      "OBJECT",
      "MODULE",
      "PACKAGE",
      "COMPILER",
      "DEBUGGER",
      "SYNTAX",
      "NETWORK",
      "PROTOCOL",
      "SERVER",
      "CLIENT",
      "DATABASE",
      "STORAGE",
      "MEMORY",
      "PROCESSOR",
      "KERNEL",
      "THREAD",
      "PYTHON",
      "JAVASCRIPT",
      "TYPESCRIPT",
      "JAVA",
      "CLOUD",
      "DOCKER",
      "KUBERNETES",
      "PIPELINE",
      "GITHUB",
      "VERSION",
      "ALGORITHM",
      "DATA",
      "SEARCH",
      "SORTING",
      "MATRIX",
      "VECTOR",
      "BINARY",
      "STRING",
      "ARRAY",
      "QUEUE",
      "STACK",
      "GRAPH",
      "TREE",
      "HEAP",
      "HASHMAP",
      "LOOP",
      "CONDITION",
      "OPERATOR",
      "BOOLEAN",
      "INTEGER",
      "CHARACTER",
      "FLOAT",
      "CLASS",
      "METHOD",
      "INHERIT",
      "POLYMORPH",
      "ENCAPSULATE",
      "ABSTRACTION",
      "INTERFACE",
      "OVERRIDE",
      "EVENT",
      "LISTENER",
      "EMITTER",
      "RENDER",
      "DISPLAY",
      "SHADER",
      "CAMERA",
      "PHYSICS",
      "VELOCITY",
      "ACCELERATION",
      "FORCE",
      "COLLISION",
      "IMPULSE",
      "FRICTION",
      "GRAVITYWELL",
      "TIMESTEP",
      "FRAME",
      "UPDATE",
      "ANIMATE",
      "LOOPING",
    ]
    const word = Phaser.Utils.Array.GetRandom(words)
    const maxMiss = 6
    let misses = 0
    const guessed = new Set<string>()

    const title = scene.add
      .text(viewW / 2, 36, "Hangman", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5)
    container.add(title)

    const masked = () =>
      word
        .split("")
        .map((ch) => (guessed.has(ch) ? ch : "_"))
        .join(" ")

    const wordTxt = scene.add
      .text(viewW / 2, viewH * 0.35, masked(), {
        fontSize: "32px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
    const missTxt = scene.add
      .text(viewW / 2, viewH * 0.45, `Misses: ${misses}/${maxMiss}`, {
        fontSize: "18px",
        color: "#ffb3b3",
      })
      .setOrigin(0.5)
    container.add([wordTxt, missTxt])

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
    const cols = 13
    const spacing = 30
    const startX = Math.floor((viewW - (cols - 1) * spacing) / 2)
    const startY = Math.floor(viewH * 0.6)

    letters.forEach((L, i) => {
      const x = startX + (i % cols) * spacing
      const y = startY + Math.floor(i / cols) * 34
      const btn = scene.add.rectangle(x, y, 26, 26, 0x4a4a4a).setInteractive()
      const txt = scene.add
        .text(x, y, L, { fontSize: "14px", color: "#ffffff" })
        .setOrigin(0.5)
      btn.on("pointerdown", () => {
        if (guessed.has(L)) return
        guessed.add(L)
        btn.setFillStyle(0x2a2a2a)
        if (word.includes(L)) {
          wordTxt.setText(masked())
          if (!word.split("").some((ch) => !guessed.has(ch)))
            this.flashAndSolve(scene, container, onSolve)
        } else {
          misses++
          missTxt.setText(`Misses: ${misses}/${maxMiss}`)
          if (misses >= maxMiss) onFail()
        }
      })
      container.add([btn, txt])
    })
  }

  private static flashAndSolve(
    scene: MazeScene,
    container: Phaser.GameObjects.Container,
    onSolve: () => void
  ) {
    const bg = container.list[0] as Phaser.GameObjects.Rectangle
    const viewW = bg.width
    const viewH = bg.height
    const ok = scene.add
      .text(viewW / 2, viewH / 2, "Correct!", {
        fontSize: "28px",
        color: "#b4ffb4",
      })
      .setOrigin(0.5)
    container.add(ok)
    scene.time.delayedCall(600, () => onSolve())
  }
}
