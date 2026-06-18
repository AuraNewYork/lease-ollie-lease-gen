import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
}

interface Props {
  className?: string;
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad({ className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [hasContent, setHasContent] = useState(false);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => canvasRef.current?.toDataURL('image/png') ?? null,
    isEmpty: () => !hasContent,
    clear: clearCanvas,
  }));

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    if (mode === 'type') setTypedName('');
  }

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function onPointerDown(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (mode !== 'draw') return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  }

  function onPointerMove(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!drawing || mode !== 'draw') return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasContent(true);
  }

  function onPointerUp() {
    setDrawing(false);
  }

  // Render typed name to canvas
  useEffect(() => {
    if (mode !== 'type') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typedName.trim()) {
      ctx.font = '44px cursive';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      setHasContent(true);
    } else {
      setHasContent(false);
    }
  }, [typedName, mode]);

  function switchMode(next: 'draw' | 'type') {
    setMode(next);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    setTypedName('');
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => switchMode('draw')}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            mode === 'draw'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'border-slate-300 text-slate-600 hover:border-slate-400'
          }`}
        >
          Draw
        </button>
        <button
          type="button"
          onClick={() => switchMode('type')}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            mode === 'type'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'border-slate-300 text-slate-600 hover:border-slate-400'
          }`}
        >
          Type instead
        </button>
        <button
          type="button"
          onClick={clearCanvas}
          className="text-xs px-3 py-1 rounded-full border border-slate-300 text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors ml-auto"
        >
          Clear
        </button>
      </div>

      {mode === 'type' && (
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder="Type your full name"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      )}

      <canvas
        ref={canvasRef}
        width={600}
        height={150}
        className="w-full rounded-lg border border-slate-300 bg-white touch-none"
        style={{ cursor: mode === 'draw' ? 'crosshair' : 'default', height: '150px' }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      />
      {mode === 'draw' && (
        <p className="text-xs text-slate-400 mt-1">Draw your signature above</p>
      )}
    </div>
  );
});

export default SignaturePad;
