"use client"

import { useEffect, useMemo, useState } from "react"

type QA = { q: string; a: string[]; correct: number }
type Group = { group?: number; id?: number; questions: QA[] }
type QuizSet = { title: string; groups: Group[] }
type QuizPayload = { sets: QuizSet[] }

const LS_KEY = "quiz_unlocks_v1"

const imageDirs = [
  "image-one",
  "image-two",
  "image-three",
  "image-four",
  "image-five",
  "image-six",
]

// consistent shuffle for piece indexes
function shuffledNine(seed: number) {
  const arr = [...Array(9).keys()]
  let s = seed || 1
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pieceUrl(setIdx: number, pieceIndex0to8: number) {
  const folder = imageDirs[setIdx] || "image-one"
  return `/images/adult-images/for-quiz-game/${folder}/${
    pieceIndex0to8 + 1
  }.jpeg`
}

export default function QuizPage() {
  const [data, setData] = useState<QuizPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [setIdx, setSetIdx] = useState(0)
  const [unlocks, setUnlocks] = useState<boolean[]>(Array(9).fill(false))
  const [activeTile, setActiveTile] = useState<number | null>(null)
  const [qIdx, setQIdx] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/quiz-sets.json", { cache: "no-store" })
        if (!res.ok) throw new Error("quiz-sets.json not found")
        const json = (await res.json()) as QuizPayload
        setData(json)
      } catch (e: any) {
        setError(e?.message || "Failed to load quiz file")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const p = new URLSearchParams(window.location.search)
    const s = Number(p.get("set"))
    if (!Number.isNaN(s) && s >= 0 && s < 6) setSetIdx(s)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, boolean[]>
      if (parsed[String(setIdx)]) setUnlocks(parsed[String(setIdx)])
    } catch {}
  }, [setIdx])

  const saveUnlocks = (next: boolean[]) => {
    setUnlocks(next)
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(LS_KEY)
      const parsed = raw ? (JSON.parse(raw) as Record<string, boolean[]>) : {}
      parsed[String(setIdx)] = next
      localStorage.setItem(LS_KEY, JSON.stringify(parsed))
    } catch {}
  }

  const pieceMap = useMemo(() => shuffledNine(setIdx + 2025), [setIdx])

  const currentSet: QuizSet | null = data?.sets?.[setIdx] || null
  const currentGroup =
    activeTile !== null && currentSet
      ? currentSet.groups[Math.min(activeTile, currentSet.groups.length - 1)]
      : null

  const startTile = (i: number) => {
    if (unlocks[i]) return
    setActiveTile(i)
    setQIdx(0)
  }

  const answer = (idx: number) => {
    if (!currentGroup) return
    if (qIdx < 2) setQIdx(qIdx + 1)
    else {
      const next = unlocks.slice()
      next[activeTile!] = true
      saveUnlocks(next)
      setActiveTile(null)
      setQIdx(0)
    }
  }

  const resetProgress = () => {
    const blank = Array(9).fill(false)
    saveUnlocks(blank)
    setActiveTile(null)
    setQIdx(0)
  }

  if (loading)
    return (
      <div className="min-h-screen grid place-items-center bg-black text-white">
        <div className="animate-pulse text-white/80">Loading quiz…</div>
      </div>
    )

  if (error || !currentSet)
    return (
      <div className="min-h-screen grid place-items-center bg-black text-white">
        <p>{error || "quiz-sets.json missing or invalid."}</p>
      </div>
    )

  const allUnlocked = unlocks.every(Boolean)

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-amber-900 via-stone-900 to-black text-white p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold">
              Quiz Treasure
            </h1>
            <span className="text-xs px-2 py-1 rounded bg-white/10 border border-white/10">
              Unlock hidden images
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/phaser"
              className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 border border-white/20"
            >
              Back to Games
            </a>
          </div>
        </div>

        {/* Set selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {data!.sets.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setSetIdx(i)
                if (typeof window !== "undefined") {
                  try {
                    const raw = localStorage.getItem(LS_KEY)
                    const parsed = raw
                      ? (JSON.parse(raw) as Record<string, boolean[]>)
                      : {}
                    setUnlocks(parsed[String(i)] || Array(9).fill(false))
                  } catch {
                    setUnlocks(Array(9).fill(false))
                  }
                }
                setActiveTile(null)
                setQIdx(0)
              }}
              className={`px-3 py-2 rounded-lg border transition ${
                i === setIdx
                  ? "bg-amber-600 border-amber-400"
                  : "bg-white/5 hover:bg-white/10 border-white/15"
              }`}
            >
              {s.title || `Set ${i + 1}`}
            </button>
          ))}
          <button
            onClick={resetProgress}
            className="ml-auto px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10"
          >
            Reset
          </button>
        </div>

        {/* Question above grid */}
        {activeTile !== null && currentGroup && (
          <div className="bg-stone-900/70 border border-white/10 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm opacity-70">
                Tile {activeTile + 1} – Question {qIdx + 1}/3
              </div>
              <button
                onClick={() => setActiveTile(null)}
                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
              >
                Cancel
              </button>
            </div>
            <h3 className="text-lg font-semibold mb-4">
              {currentGroup.questions[qIdx].q}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentGroup.questions[qIdx].a.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => answer(idx)}
                  className="text-left px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/50 mt-3">
              Answer all 3 to unlock this piece.
            </p>
          </div>
        )}

        {/* Grid + progress */}
        <div className="grid md:grid-cols-[2fr,1fr] gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-lg font-semibold opacity-90 mb-3">
              {currentSet.title}
            </h2>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 9 }).map((_, i) => {
                const isUnlocked = unlocks[i]
                const mapped = pieceMap[i]
                const url = pieceUrl(setIdx, mapped)
                return (
                  <button
                    key={i}
                    onClick={() => startTile(i)}
                    disabled={isUnlocked}
                    className={`relative aspect-square rounded-xl overflow-hidden border ${
                      isUnlocked
                        ? "border-emerald-400 ring-2 ring-emerald-400/40"
                        : "border-white/15 hover:border-white/40 hover:bg-white/5"
                    }`}
                  >
                    <div className="absolute inset-0 bg-black/50">
                      {isUnlocked ? (
                        <img
                          src={url}
                          alt={`Piece ${mapped + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center">
                          <span className="text-white/70 text-sm">Locked</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-1 left-1 text-[10px] bg-black/60 px-1.5 py-0.5 rounded">
                      {i + 1}
                    </div>
                    {isUnlocked && (
                      <a
                        href={url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-1 right-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700"
                      >
                        PNG
                      </a>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-3">Progress</h3>
            <div className="text-sm opacity-80 mb-2">
              {unlocks.filter(Boolean).length}/9 unlocked
            </div>
            <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
              <div
                className="h-2 bg-amber-500"
                style={{
                  width: `${(unlocks.filter(Boolean).length / 9) * 100}%`,
                }}
              />
            </div>
            {allUnlocked && (
              <div className="mt-3 text-emerald-400 text-sm">
                🎉 All 9 unlocked! Download them and assemble the image.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
