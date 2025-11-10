import React, { useEffect, useState, useRef } from "react"

const [showSaveToast, setShowSaveToast] = useState(false)
const TRACKS = 8
const STEPS = 16
const STEP_GAP = 4
const CELL_SIZE = 28

export default function App() {
  const [grid, setGrid] = useState(() =>
    Array(TRACKS).fill(null).map(() => Array(STEPS).fill(false))
  )
  const [step, setStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(87)
  const [samples, setSamples] = useState(Array(TRACKS).fill(""))
  const [volumes, setVolumes] = useState(Array(TRACKS).fill(1))
  const [muted, setMuted] = useState(Array(TRACKS).fill(false))
  const [swing, setSwing] = useState(Array(TRACKS).fill(false))
  const [pitches, setPitches] = useState(Array(TRACKS).fill(1))
  const [triggeredSteps, setTriggeredSteps] = useState(Array(TRACKS).fill(false))
  const [availableSamples, setAvailableSamples] = useState([])
  const [theme, setTheme] = useState("synthwave")

  const intervalRef = useRef(null)
  const audioCtxRef = useRef(null)
  const sampleBuffersRef = useRef({})

  const getStepTime = () => (60 / bpm) * 1000 / 4

  const initAudio = async () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    for (const sample of samples) {
      if (!sampleBuffersRef.current[sample] && sample) {
        const res = await fetch(`/${sample}`)
        const arrayBuffer = await res.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        sampleBuffersRef.current[sample] = audioBuffer
      }
    }
  }

  const playSample = (sample, volume = 1, pitch = 1) => {
    const ctx = audioCtxRef.current
    const buffer = sampleBuffersRef.current[sample]
    if (!ctx || !buffer) return
    const source = ctx.createBufferSource()
    const gainNode = ctx.createGain()
    source.buffer = buffer
    source.playbackRate.value = pitch
    gainNode.gain.value = volume
    source.connect(gainNode).connect(ctx.destination)
    source.start()
  }

  const playStep = (currentStep) => {
    const stepTime = getStepTime()
    const newTriggers = Array(TRACKS).fill(false)
    grid.forEach((row, trackIndex) => {
      const isActive = row[currentStep]
      if (isActive && !muted[trackIndex]) {
        const file = samples[trackIndex]
        const pitch = pitches[trackIndex]
        const volume = volumes[trackIndex]
        const shouldSwing = swing[trackIndex]
        const delay = shouldSwing && currentStep % 2 === 1 ? stepTime * 0.2 : 0
        setTimeout(() => {
          playSample(file, volume, pitch)
        }, delay)
        newTriggers[trackIndex] = true
      }
    })
    setTriggeredSteps(newTriggers)
  }

  const toggleStep = (row, col) => {
    setGrid((prev) => {
      const copy = prev.map((r) => [...r])
      copy[row][col] = !copy[row][col]
      return copy
    })
  }

  useEffect(() => {
    fetch("/samples.json")
      .then((res) => res.json())
      .then((files) => {
        setAvailableSamples(files)
        setSamples((prev) => prev.map((s, i) => s || files[0] || ""))
      })
  }, [])
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
    }, getStepTime())
    return () => clearInterval(intervalRef.current)
  }, [isPlaying, bpm, grid, samples, volumes, muted, pitches, swing])

  const handlePlayToggle = async () => {
  await initAudio()

  // ✅ Fix: ensure audio context resumes on user interaction
  if (audioCtxRef.current?.state === "suspended") {
    await audioCtxRef.current.resume()
  }

  setIsPlaying((prev) => !prev)
}


const savePattern = () => {
  const pattern = {
    grid,
    bpm,
    samples,
    volumes,
    muted,
    swing,
    pitches,
  }
  localStorage.setItem("sequencerPattern", JSON.stringify(pattern))
  setShowSaveToast(true)
  setTimeout(() => setShowSaveToast(false), 2000)
}


  const loadPattern = () => {
    const pattern = JSON.parse(localStorage.getItem("sequencerPattern"))
    if (pattern) {
      setGrid(pattern.grid)
      setBpm(pattern.bpm)
      setSamples(pattern.samples)
      setVolumes(pattern.volumes)
      setMuted(pattern.muted)
      setSwing(pattern.swing)
      setPitches(pattern.pitches)
    }
  }

  const colors = {
    synthwave: {
      bg: "#111",
      text: "#0ff",
      highlight: "#f0f",
    },
    crt: {
      bg: "#000",
      text: "#0f0",
      highlight: "#0c0",
    },
  }

  const themeStyles = colors[theme]

  return (
    <div
      style={{
        background: themeStyles.bg,
        color: themeStyles.text,
        fontFamily: "'Press Start 2P', monospace",
        width: "90vw",
        height: "90vh",
        maxWidth: 1390,
        maxHeight: 1000,
        margin: "auto",
        padding: 20,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}
      </style>

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handlePlayToggle}
          style={{
            background: themeStyles.highlight,
            color: themeStyles.bg,
            fontWeight: "bold",
            fontSize: 12,
            padding: "8px 16px",
            border: "2px solid " + themeStyles.text,
            cursor: "pointer",
          }}
        >
          {isPlaying ? "STOP" : "PLAY"}
        </button>

        <label style={{ fontSize: 10 }}>BPM:</label>
        <input
          type="number"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          style={{
            width: 60,
            padding: "4px 8px",
            background: "#000",
            border: "1px solid " + themeStyles.text,
            color: themeStyles.text,
            fontSize: 10,
          }}
        />

        <button
          onClick={savePattern}
          style={{
            padding: "6px 12px",
            border: "2px solid " + themeStyles.text,
            background: "transparent",
            color: themeStyles.text,
            fontSize: 10,
          }}
        >
          Save
        </button>

        <button
          onClick={loadPattern}
          style={{
            padding: "6px 12px",
            border: "2px solid " + themeStyles.text,
            background: "transparent",
            color: themeStyles.text,
            fontSize: 10,
          }}
        >
          Load
        </button>

        <button
          onClick={() => setTheme((prev) => (prev === "synthwave" ? "crt" : "synthwave"))}
          style={{
            marginLeft: "auto",
            width: 40,
            height: 40,
            border: "2px solid " + themeStyles.text,
            background: "linear-gradient(135deg, #0f0, #f0f)",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Track Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        {samples.map((sample, i) => (
          <div key={i} style={{ width: 220 }}>
            <div style={{ fontSize: 10, marginBottom: 4 }}>Track {i + 1}</div>

            <select
              value={sample}
              onChange={async (e) => {
  const newSamples = [...samples]
  newSamples[i] = e.target.value
  setSamples(newSamples)

  // ✅ Fix: Ensure AudioContext exists
  if (!audioCtxRef.current) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    audioCtxRef.current = new AudioContext()
  }

  try {
    const res = await fetch(`/${e.target.value}`)
    const buf = await res.arrayBuffer()
    const decoded = await audioCtxRef.current.decodeAudioData(buf)
    sampleBuffersRef.current[e.target.value] = decoded
  } catch (err) {
    console.error("Failed to load sample:", err)
  }
}}

              style={{
                width: "100%",
                padding: 4,
                background: "#111",
                color: themeStyles.text,
                fontFamily: "inherit",
              }}
            >
              {availableSamples.map((file) => (
                <option key={file} value={file}>
                  {file.replace(/\.(mp3|wav)/, "").toUpperCase()}
                </option>
              ))}
            </select>

            <div style={{ fontSize: 10, marginTop: 6 }}>Volume</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volumes[i]}
              onChange={(e) => {
                const newVolumes = [...volumes]
                newVolumes[i] = parseFloat(e.target.value)
                setVolumes(newVolumes)
              }}
              style={{ width: "100%" }}
            />

            <div style={{ fontSize: 10, marginTop: 6 }}>Pitch</div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.01"
              value={pitches[i]}
              onChange={(e) => {
                const newPitches = [...pitches]
                newPitches[i] = parseFloat(e.target.value)
                setPitches(newPitches)
              }}
              style={{ width: "100%" }}
            />

            <div style={{ marginTop: 6 }}>
              <label style={{ fontSize: 10 }}>
                <input
                  type="checkbox"
                  checked={swing[i]}
                  onChange={() => {
                    const newSwing = [...swing]
                    newSwing[i] = !newSwing[i]
                    setSwing(newSwing)
                  }}
                  style={{ marginRight: 4 }}
                />
                Swing
              </label>
            </div>

            <button
              onClick={() => {
                const newMuted = [...muted]
                newMuted[i] = !newMuted[i]
                setMuted(newMuted)
              }}
              style={{
                marginTop: 4,
                width: "100%",
                background: muted[i] ? "#444" : themeStyles.highlight,
                color: muted[i] ? "#aaa" : themeStyles.bg,
                border: "2px solid #000",
                fontSize: 10,
              }}
            >
              {muted[i] ? "MUTED" : "MUTE"}
            </button>
          </div>
        ))}
      </div>
      {/* Sequencer Grid & VU Meters */}
      <div style={{ display: "flex", overflow: "hidden" }}>
        <div style={{ position: "relative", width: STEPS * (CELL_SIZE + STEP_GAP) }}>
          {grid.map((row, rowIndex) =>
            row.map((isActive, colIndex) => {
              const isCurrent = colIndex === step
              const bg = isCurrent
                ? isActive
                  ? themeStyles.highlight
                  : "#333"
                : isActive
                ? themeStyles.text
                : "#111"
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => toggleStep(rowIndex, colIndex)}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    position: "absolute",
                    top: rowIndex * (CELL_SIZE + STEP_GAP),
                    left: colIndex * (CELL_SIZE + STEP_GAP),
                    background: bg,
                    border: "1px solid #000",
                    boxShadow: isCurrent ? `0 0 6px ${themeStyles.highlight}` : "none",
                    cursor: "pointer",
                  }}
                />
              )
            })
          )}
        </div>

        {/* VU Meters */}
        <div style={{ marginLeft: 24, display: "flex", flexDirection: "column", gap: STEP_GAP }}>
          {triggeredSteps.map((active, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: CELL_SIZE,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  height: "33%",
                  background: active ? "red" : "#200",
                  transition: "all 150ms",
                }}
              />
              <div
                style={{
                  height: "33%",
                  background: active ? "yellow" : "#220",
                  transition: "all 150ms",
                }}
              />
              <div
                style={{
                  height: "34%",
                  background: active ? "lime" : "#040",
                  transition: "all 150ms",
                }}
              />
            </div>
          ))}
        </div>
      </div>
      {showSaveToast && (
  <div
    style={{
      position: "absolute",
      top: 20,
      right: 20,
      background: themeStyles.highlight,
      color: themeStyles.bg,
      padding: "8px 16px",
      fontSize: 10,
      border: `2px solid ${themeStyles.text}`,
      zIndex: 999,
    }}
  >
    Pattern Saved!
  </div>
)}

    </div>
  )
}
