import React, { useEffect, useRef, useState } from "react"

const TRACKS = 8
const STEPS = 16
const CELL = 28
const GAP = 8
const STEP_TIME = (bpm) => (60 / bpm) * 1000 / 4

const defaultSamples = Array.from({ length: 8 }, (_, i) => `/sample${i + 1}.mp3`)

export default function App() {
  const [grid, setGrid] = useState(() =>
    Array(TRACKS).fill(null).map(() => Array(STEPS).fill(false))
  )
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const audioRefs = useRef([])
  const intervalRef = useRef(null)

  useEffect(() => {
    audioRefs.current = defaultSamples.map((src, i) =>
      document.getElementById(`audio-${i}`)
    )
  }, [])

  const toggleStep = (row, col) => {
    const copy = grid.map((r) => [...r])
    copy[row][col] = !copy[row][col]
    setGrid(copy)
  }

  const playStep = (current) => {
    grid.forEach((row, rowIndex) => {
      if (row[current] && audioRefs.current[rowIndex]) {
        const audio = audioRefs.current[rowIndex]
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
    })
  }

  useEffect(() => {
    if (!isPlaying) {
      clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setStep((prev) => {
        const next = (prev + 1) % STEPS
        playStep(next)
        return next
      })
    }, STEP_TIME(bpm))

    return () => clearInterval(intervalRef.current)
  }, [isPlaying, bpm, grid])

  return (
    <div style={{ background: "#111", color: "#fff", height: "100vh", padding: 20 }}>
      {defaultSamples.map((src, i) => (
        <audio key={i} id={`audio-${i}`} src={src} preload="auto" />
      ))}

      <button
        onClick={() => setIsPlaying(!isPlaying)}
        style={{
          background: isPlaying ? "#ff0033" : "#00ff00",
          color: "#000",
          fontFamily: "monospace",
          fontWeight: "bold",
          fontSize: 18,
          padding: "10px 20px",
          border: "none",
          marginBottom: 20,
          cursor: "pointer",
        }}
      >
        {isPlaying ? "STOP" : "PLAY"}
      </button>

      <div style={{ position: "relative" }}>
        {grid.map((row, rowIndex) =>
          row.map((isActive, colIndex) => {
            const isCurrent = step === colIndex
            const background = isCurrent
              ? isActive
                ? "#00ffff"
                : "#444"
              : isActive
              ? "#fff200"
              : "#222"

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => toggleStep(rowIndex, colIndex)}
                style={{
                  width: CELL,
                  height: CELL,
                  position: "absolute",
                  top: rowIndex * (CELL + GAP),
                  left: colIndex * (CELL + GAP),
                  background,
                  border: "2px solid #000",
                  boxShadow: isCurrent
                    ? "0px 0px 6px 2px #0ff"
                    : "inset 0px 0px 2px #000",
                  cursor: "pointer",
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
