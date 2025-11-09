import React, { useEffect, useRef, useState } from "react"

const TRACKS = 8
const STEPS = 16
const CELL = 32
const GAP = 6
const STEP_TIME = (bpm) => (60 / bpm) * 1000 / 4

export default function App() {
  const [grid, setGrid] = useState(() =>
    Array(TRACKS).fill(null).map(() => Array(STEPS).fill(false))
  )
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [samples, setSamples] = useState(() =>
    Array(TRACKS).fill("")
  )
  const [volumes, setVolumes] = useState(() =>
    Array(TRACKS).fill(1)
  )
  const [availableSamples, setAvailableSamples] = useState([])

  const intervalRef = useRef(null)
  const audioRefs = useRef([])

  // Fetch available sample files from server (auto-detect .mp3/.wav)
  useEffect(() => {
    fetch("/")
      .then((res) => res.text())
      .then((html) => {
        const matches = Array.from(html.matchAll(/href="([^"]+\.(mp3|wav))"/g))
        const filenames = matches.map((m) => decodeURIComponent(m[1]).replace("/", ""))
        const unique = Array.from(new Set(filenames))
        setAvailableSamples(unique)
        // Set default sample if blank
        setSamples((prev) => prev.map((val, i) => val || unique[0] || ""))
      })
      .catch((e) => {
        console.warn("Could not load available samples:", e)
      })
  }, [])

  // Maintain audio refs
  useEffect(() => {
    audioRefs.current = audioRefs.current.slice(0, samples.length)
    while (audioRefs.current.length < samples.length) {
      audioRefs.current.push(React.createRef())
    }
  }, [samples])

  const toggleStep = (row, col) => {
    const copy = grid.map((r) => [...r])
    copy[row][col] = !copy[row][col]
    setGrid(copy)
  }

  const playStep = (current) => {
    grid.forEach((row, trackIndex) => {
      if (row[current]) {
        const ref = audioRefs.current[trackIndex]
        if (ref?.current) {
          try {
            ref.current.volume = volumes[trackIndex]
            ref.current.currentTime = 0
            ref.current.play()
          } catch (e) {
            console.warn(`Track ${trackIndex + 1} failed to play`, e)
          }
        }
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
  }, [isPlaying, bpm, grid, volumes])

  const handleSampleChange = (index, value) => {
    const updated = [...samples]
    updated[index] = value
    setSamples(updated)
    setTimeout(() => {
      const audio = audioRefs.current[index]?.current
      if (audio) audio.load()
    }, 100)
  }

  const handleVolumeChange = (index, value) => {
    const updated = [...volumes]
    updated[index] = parseFloat(value)
    setVolumes(updated)
  }

  return (
    <div
      style={{
        background: "linear-gradient(145deg, #080808, #1a1a1a)",
        color: "#0ff",
        minHeight: "100vh",
        padding: 20,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>

      {samples.map((src, i) =>
        src ? (
          <audio
            key={i}
            ref={audioRefs.current[i]}
            src={`/${src}`}
            preload="auto"
          />
        ) : null
      )}

      {/* Controls */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            background: isPlaying ? "#ff0033" : "#00ff00",
            color: "#000",
            fontWeight: "bold",
            fontSize: 14,
            padding: "10px 20px",
            border: "3px solid #0ff",
            boxShadow: "0 0 10px #0ff",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {isPlaying ? "STOP" : "PLAY"}
        </button>

        <label>BPM:</label>
        <input
          type="number"
          value={bpm}
          min={60}
          max={180}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{
            width: 60,
            padding: "6px 10px",
            background: "#111",
            border: "2px solid #0ff",
            color: "#0ff",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Track Controls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {samples.map((sample, i) => (
          <div key={i}>
            <div style={{ marginBottom: 6, fontSize: 10 }}>Track {i + 1}</div>
            <select
              value={sample}
              onChange={(e) => handleSampleChange(i, e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                background: "#111",
                border: "2px solid #0ff",
                color: "#0ff",
                fontFamily: "inherit",
                fontSize: 10,
              }}
            >
              {availableSamples.map((file) => (
                <option key={file} value={file}>
                  {file.replace(/\.(mp3|wav)/, "").toUpperCase()}
                </option>
              ))}
            </select>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumes[i]}
              onChange={(e) => handleVolumeChange(i, e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                accentColor: "#0ff",
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
                ? "#ff00ff"
                : "#333"
              : isActive
              ? "#00ffff"
              : "#111"

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
                    ? "0 0 6px 2px #f0f"
                    : "inset 0 0 4px #000",
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
