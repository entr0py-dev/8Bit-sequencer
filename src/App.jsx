import React, { useEffect, useRef, useState } from "react"

const TRACKS = 8
const STEPS = 16
const CELL = 28
const GAP = 8
const STEP_TIME = (bpm) => (60 / bpm) * 1000 / 4

const defaultSamples = Array.from({ length: TRACKS }, (_, i) => "")

export default function App() {
  const [grid, setGrid] = useState(() =>
    Array(TRACKS).fill(null).map(() => Array(STEPS).fill(false))
  )
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [samples, setSamples] = useState(() => {
    const saved = localStorage.getItem("samples")
    return saved ? JSON.parse(saved) : defaultSamples
  })

  const audioRefs = useRef([])
  const intervalRef = useRef(null)

  // update refs when sample list changes
  useEffect(() => {
    audioRefs.current = samples.map((src, i) =>
      document.getElementById(`audio-${i}`)
    )
    localStorage.setItem("samples", JSON.stringify(samples))
  }, [samples])

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

  const handleSampleChange = (index, value) => {
    const updated = [...samples]
    updated[index] = value
    setSamples(updated)
  }

  return (
    <div style={{ background: "#111", color: "#fff", minHeight: "100vh", padding: 20, fontFamily: "monospace" }}>
      {/* Audio elements */}
      {samples.map((src, i) =>
        src ? (
          <audio key={i} id={`audio-${i}`} src={src} preload="auto" />
        ) : null
      )}

      {/* Controls */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? "#ff0033" : "#00ff00",
            color: "#000",
            fontWeight: "bold",
            fontSize: 16,
            padding: "8px 16px",
            border: "none",
            cursor: "pointer",
            marginRight: 16,
          }}
        >
          {isPlaying ? "STOP" : "PLAY"}
        </button>

        <label style={{ marginRight: 8 }}>BPM:</label>
        <input
          type="number"
          value={bpm}
          min={60}
          max={180}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{
            width: 60,
            padding: "6px 8px",
            fontFamily: "monospace",
            fontSize: 14,
            border: "1px solid #333",
            background: "#222",
            color: "#fff",
          }}
        />
      </div>

      {/* Sample Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {samples.map((sample, i) => (
          <div key={i}>
            <label>Track {i + 1}:</label>
            <input
              type="text"
              placeholder="Paste sample URL"
              value={sample}
              onChange={(e) => handleSampleChange(i, e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "6px 8px",
                fontFamily: "monospace",
                fontSize: 14,
                background: "#222",
                border: "1px solid #333",
                color: "#fff",
              }}
            />
          </div>
        ))}
      </div>

      {/* Sequencer Grid */}
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
