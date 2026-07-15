import { useRef, useState, useEffect } from 'react'

export default function SignaturePad({ label, onSave, onClear }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [hasStroke, setHasStroke] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#12161c'
  }, [])

  function pointFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e) {
    e.preventDefault()
    e.stopPropagation()
    drawing.current = true
    const { x, y } = pointFromEvent(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e) {
    if (!drawing.current) return
    e.preventDefault()
    e.stopPropagation()
    const { x, y } = pointFromEvent(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasStroke(true)
  }

  function end(e) {
    if (e) { e.preventDefault(); e.stopPropagation() }
    drawing.current = false
  }

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
    <div className="border border-slate-700 rounded-lg p-3 bg-white" style={{ overscrollBehavior: 'contain' }}>
      {label && <p className="text-sm text-slate-800 mb-2 font-medium">{label}</p>}
      <canvas
        ref={canvasRef}
        className="w-full h-40 bg-slate-50 rounded border border-dashed border-slate-400"
        style={{
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
          overscrollBehavior: 'contain',
        }}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        onTouchCancel={end}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
      />
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-2 text-sm rounded border border-slate-400 text-slate-700 hover:bg-slate-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!hasStroke}
          className="px-4 py-2 text-sm rounded bg-orange-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Use this signature
        </button>
      </div>
    </div>
  )
}
