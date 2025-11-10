import React, { useEffect, useState, useRef, useCallback } from "react"

const TRACKS = 8
const STEPS = 16
const CELL = 32
const GAP = 6
const STEP_TIME = (bpm) => (60 / bpm) * 1000 / 4

const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const Cell = React.memo(({ isActive, isCurrent, onClick, row, col }) => {
  const background = isCurrent
    ? isActive
      ? "#ff00ff"
      : "#333"
    : isActive
    ? "#00ffff"
    : "#111"

  return (
    <div
      onClick={onClick}
      style={{
        width: CELL,
        height: CELL,
        position: "absolute",
        top: row * (CELL + GAP),
        left: col * (CELL + GAP),
        background,
        border: "2px solid #000",
        boxShadow: isCurrent ? "0 0 6px 2px #f0f" : "inset 0 0 4px #000",
        cursor: "pointer",
      }}
    />
  )
})

export default function App() {
  const [grid, setGrid] = useState(() =>
    Array(TRACKS).fill(null).map(() => Array(STEPS).fill(false))
  )
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(87)
  const [samples, setSamples] = useState(() =>
    Array(TRACKS).fill("")
  )
  const [volumes, setVolumes] = useState(() =>
    Array(TRACKS).fill(1)
  )
  const [muted, setMuted] = useState(() =>
    Array(TRACKS).fill(false)
  )
  const [triggeredSteps, setTriggeredSteps] = useState(Array(TRACKS).fill(false))
  const [availableSamples, setAvailableSamples] = useState([])

  const intervalRef = useRef(null)

  useEffect(() => {
    fetch("/samples.json")
      .then((res) => res.json())
      .then((files) => {
        setAvailableSamples(files)
        setSamples((prev) => prev.map((val, i) => val || files[0] || ""))
      })
      .catch((e) => {
        console.warn("Could not load samples.json", e)
      })
  }, [])

  const toggleStep = useCallback((row, col) => {
    setGrid((prev) => {
      const copy = prev.map((r) => [...r])
      copy[row][col] = !copy[row][col]
      return copy
    })
  }, [])

  const playStep = (current) => {
    const newTriggers = Array(TRACKS).fill(false)

    grid.forEach((row, trackIndex) => {
      if (row[current] && !muted[trackIndex]) {
        const file = samples[trackIndex]
        if (file) {
          const audio = new Audio(`/${file}`)
          audio.volume = volumes[trackIndex]
          audio.play().catch(() => {})
          newTriggers[trackIndex] = true
        }
      }
    })

    setTriggeredSteps(newTriggers)
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
  }, [isPlaying, bpm, grid, volumes, muted, samples])

  const updateSample = (index, value) => {
    const updated = [...samples]
    updated[index] = value
    setSamples(updated)
  }

  const debouncedUpdateSample = useCallback(debounce(updateSample, 100), [])
  const debouncedSetVolume = useCallback(
    debounce((index, value) => {
      setVolumes((prev) => {
        const copy = [...prev]
        copy[index] = parseFloat(value)
        return copy
      })
    }, 100),
    []
  )

  const toggleMute = (index) => {
    setMuted((prev) => {
      const copy = [...prev]
      copy[index] = !copy[index]
      return copy
    })
  }

  return (
    <div
      style={{
        background: "linear-gradient(145deg, #080808, #1a1a1a)",
        color: "#0ff",
        minHeight: "100vh",
        padding: 20,
        fontFamily: "'Press Start 2P', monospace",
        overflowX: "auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>

      {/* Top controls */}
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

      {/* Track controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
        {samples.map((sample, i) => (
          <div key={i} style={{ width: 180, position: "relative" }}>
            <div style={{ marginBottom: 6, fontSize: 10 }}>Track {i + 1}</div>

            <div
              style={{
                fontSize: 10,
                color: muted[i] ? "#888" : "#0ff",
                marginBottom: 4,
              }}
            >
              {sample.replace(/\.(mp3|wav)/, "").toUpperCase()}
            </div>

            <select
              defaultValue={sample}
              onChange={(e) => debouncedUpdateSample(i, e.target.value)}
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
              defaultValue={volumes[i]}
              onChange={(e) => debouncedSetVolume(i, e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                accentColor: "#0ff",
              }}
            />

            <button
              onClick={() => toggleMute(i)}
              style={{
                marginTop: 4,
                fontSize: 10,
                background: muted[i] ? "#444" : "#0ff",
                color: muted[i] ? "#ccc" : "#000",
                border: "2px solid #000",
                cursor: "pointer",
                width: "100%",
              }}
            >
              {muted[i] ? "MUTED" : "MUTE"}
            </button>
          </div>
        ))}
      </div>

      {/* Sequencer + VU */}
      <div style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
        {/* Sequencer grid */}
        <div style={{ position: "relative", width: STEPS * (CELL + GAP) }}>
          {grid.map((row, rowIndex) =>
            row.map((isActive, colIndex) => (
              <Cell
                key={`${rowIndex}-${colIndex}`}
                isActive={isActive}
                isCurrent={step === colIndex}
                row={rowIndex}
                col={colIndex}
                onClick={() => toggleStep(rowIndex, colIndex)}
              />
            ))
          )}
        </div>

        {/* VU meters */}
        <div style={{ marginLeft: 48, display: "flex", flexDirection: "column", gap: GAP }}>
          {triggeredSteps.map((active, i) => (
            <div
              key={i}
              style={{
                width: 24,
                height: CELL,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  height: "33%",
                  background: active ? "red" : "#200",
                  transition: "all 150ms ease",
                }}
              />
              <div
                style={{
                  height: "33%",
                  background: active ? "yellow" : "#220",
                  transition: "all 150ms ease",
                }}
              />
              <div
                style={{
                  height: "34%",
                  background: active ? "lime" : "#040",
                  transition: "all 150ms ease",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
