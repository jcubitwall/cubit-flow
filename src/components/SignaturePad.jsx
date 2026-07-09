import { useRef, useState, useEffect } from 'react'

/**
 * A simple canvas-based signature pad. Works with finger, stylus, or mouse.
 * Calls onSave(blob) with a PNG blob when the signer taps "Use this signature".
 */
export default function SignaturePad({ label, onSave, onClear }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasStroke, setHasStroke] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    // Scale for device pixel ratio so it's crisp on retina / tablet screens
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#12161c'
  }, [])

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return { x: point.clientX - rect.left, y: point.clientY - rect.top }
  }

  function start(e) {
    e.preventDefault()
    drawing.current = true
    const { x, y } = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    const { x, y } = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasStroke(true)
  }

  function end() { drawing.current = false }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStroke(false)
    onClear?.()
  }

  function save() {
    canvasRef.current.toBlob((blob) => onSave(blob), 'image/png')
  }

  return (
    <div className="border border-steel-700 rounded-lg p-3 bg-white">
      {label && <p className="text-sm text-steel-800 mb-2 font-medium">{label}</p>}
      <canvas
        ref={canvasRef}
        className="w-full h-40 bg-steel-50 rounded touch-none border border-dashed border-steel-400"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-2 text-sm rounded border border-steel-400 text-steel-700 hover:bg-steel-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasStroke}
          className="px-4 py-2 text-sm rounded bg-signal text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-95"
        >
          Use this signature
        </button>
      </div>
    </div>
  )
}
