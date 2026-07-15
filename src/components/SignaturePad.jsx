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

    function pointFromEvent(e) {
      const rect = canvas.getBoundingClientRect()
      if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    function start(e) {
      e.preventDefault()
      drawing.current = true
      const { x, y } = pointFromEvent(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    function move(e) {
      if (!drawing.current) return
      e.preventDefault()
      const { x, y } = pointFromEvent(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      setHasStroke(true)
    }

    function end(e) {
      if (e) e.preventDefault()
      drawing.current = false
    }

    // Attach as non-passive listeners directly — this is the key fix.
    // React's synthetic touch events default to passive, which silently
    // ignores preventDefault() on iOS Safari and lets the page steal
    // the gesture mid-stroke.
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end, { passive: false })
    canvas.addEventListener('touchcancel', end, { passive: false })
    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('mouseleave', end)

    return () => {
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
      canvas.removeEventListener('touchcancel', end)
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('mouseleave', end)
    }
  }, [])

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
    <div className="border border-slate-700 rounded-lg p-3 bg-white">
      {label && <p className="text-sm text-slate-800 mb-2 font-medium">{label}</p>}
      <canvas
        ref={canvasRef}
        className="w-full h-40 bg-slate-50 rounded border border-dashed border-slate-400"
        style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
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
