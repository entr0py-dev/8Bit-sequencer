import React, { useEffect, useState, useRef } from "react"

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
  const [showSaveToast, setShowSaveToast] = useState(false)
  const [userSamples, setUserSamples] = useState({})
 
  const intervalRef = useRef(null)
  const audioCtxRef = useRef(null)
  const sampleBuffersRef = useRef({})

  const getStepTime = () => (60 / bpm) * 1000 / 4

const initAudio = async () => {
  if (!audioCtxRef.current) {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    audioCtxRef.current = new AudioContext()
  }

  if (audioCtxRef.current.state === "suspended") {
    await audioCtxRef.current.resume()
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

  const toggleStep = (row, col) => {
  setGrid((prev) => {
    const copy = prev.map((r) => [...r])
    copy[row][col] = !copy[row][col]
    return copy
  })
}

  
  const playStep = async (currentStep) => {
  const stepTime = getStepTime()
  const newTriggers = Array(TRACKS).fill(false)

  for (let trackIndex = 0; trackIndex < TRACKS; trackIndex++) {
    const row = grid[trackIndex]
    const isActive = row[currentStep]

    if (isActive && !muted[trackIndex]) {
      const file = samples[trackIndex]
      const pitch = pitches[trackIndex]
      const volume = volumes[trackIndex]
      const shouldSwing = swing[trackIndex]

      // ✅ SAFARI FIX: decode on demand after user interaction
      if (!sampleBuffersRef.current[file] && file) {
        try {
          const res = await fetch(`/${file}`)
          const arrayBuffer = await res.arrayBuffer()
          const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer)
          sampleBuffersRef.current[file] = audioBuffer
        } catch (e) {
          console.error(`Failed to decode ${file}:`, e)
          continue // skip this sample
        }
      }

      const delay = shouldSwing && currentStep % 2 === 1 ? stepTime * 0.2 : 0
      setTimeout(() => {
        playSample(file, volume, pitch)
      }, delay)

      newTriggers[trackIndex] = true
    }
  }

  setTriggeredSteps(newTriggers)
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
        <input
  type="file"
  accept=".wav,.mp3"
  onChange={(e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext
          audioCtxRef.current = new AudioContext()
        }
        const arrayBuffer = reader.result
        const audioBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer)
        sampleBuffersRef.current[file.name] = audioBuffer
        setUserSamples((prev) => ({ ...prev, [file.name]: audioBuffer }))
      } catch (err) {
        console.error("Upload decode failed:", err)
      }
    }
    reader.readAsArrayBuffer(file)
  }}
  style={{
    padding: 6,
    fontSize: 10,
    color: themeStyles.text,
    background: themeStyles.bg,
    border: "1px solid " + themeStyles.text,
    marginLeft: 8,
  }}
          />

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

 if (!sampleBuffersRef.current[e.target.value] && e.target.value) {
  // Skip fetch if it's a user-uploaded sample
  if (userSamples[e.target.value]) return

  const res = await fetch(`/${e.target.value}`)
  const buf = await res.arrayBuffer()
  const decoded = await audioCtxRef.current.decodeAudioData(buf)
  sampleBuffersRef.current[e.target.value] = decoded
}
 catch (err) {
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
              {[...availableSamples, ...Object.keys(userSamples)].map((file) => (

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
<div style={{
  position: "absolute",
  bottom: 20,
  right: 20,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  fontSize: 8,
  color: themeStyles.text,
  opacity: 0.8,
}}>
  <div style={{ display: "flex", gap: 6 }}>
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: Math.random() > 0.5 ? themeStyles.highlight : "#222",
          boxShadow: "0 0 4px " + themeStyles.highlight,
          transition: "opacity 0.3s",
        }}
      />
    ))}
  </div>
  <div style={{ marginTop: 6 }}>SYS DIAG OK</div>
  <div>MODEL: DX8-TRK</div>
</div>

    </div>
  )
}
