import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, ZoomIn, ZoomOut, Plus } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export default function CanvasDetailRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [canvasInfo, setCanvasInfo] = useState<{width: number, height: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState({ r: 0, g: 0, b: 0 });
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!id) return;

    let localSocket: Socket;

    const init = async () => {
      try {
        const res = await fetch(`${API_URL}/canvas/${id}`);
        if (!res.ok) {
          if (res.status === 404) setError('Canvas not found');
          else setError('Failed to load canvas data');
          return;
        }
        const data = await res.json();
        setCanvasInfo({ width: data.width, height: data.height });
        
        // Setup initial scale
        const screenWidth = window.innerWidth - 64;
        const initialScale = Math.min(Math.max(Math.floor(screenWidth / data.width), 4), 20);
        setScale(initialScale);

        // Map Base64 RGB to Canvas RGBA
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = data.width;
          canvas.height = data.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const binary = atob(data.pixelData);
            const buffer = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              buffer[i] = binary.charCodeAt(i);
            }
            
            const imageData = ctx.createImageData(data.width, data.height);
            for (let y = 0; y < data.height; y++) {
              for (let x = 0; x < data.width; x++) {
                const srcOffset = (y * data.width + x) * 3;
                const dstOffset = (y * data.width + x) * 4;
                imageData.data[dstOffset] = buffer[srcOffset];
                imageData.data[dstOffset + 1] = buffer[srcOffset + 1];
                imageData.data[dstOffset + 2] = buffer[srcOffset + 2];
                imageData.data[dstOffset + 3] = 255;
              }
            }
            ctx.putImageData(imageData, 0, 0);
          }
        }

        // Connect to Socket.IO namespace
        localSocket = io(`${API_URL}/canvas`, {
          query: { canvasId: id },
          transports: ['websocket'],
        });

        localSocket.on('connect', () => {
          console.log('Connected to room', id);
        });

        localSocket.on('pixelUpdated', (bufferData: ArrayBuffer) => {
          const packet = new Uint8Array(bufferData);
          if (packet.length < 5) return;
          const px = packet[0];
          const py = packet[1];
          const pr = packet[2];
          const pg = packet[3];
          const pb = packet[4];

          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.fillStyle = `rgb(${pr}, ${pg}, ${pb})`;
              ctx.fillRect(px, py, 1, 1);
            }
          }
        });

        localSocket.on('canvasResized', (payload) => {
          const { width, height, pixelData } = payload;
          setCanvasInfo({ width, height });
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const binary = atob(pixelData);
              const buffer = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                buffer[i] = binary.charCodeAt(i);
              }
              const imageData = ctx.createImageData(width, height);
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  const srcOffset = (y * width + x) * 3;
                  const dstOffset = (y * width + x) * 4;
                  imageData.data[dstOffset] = buffer[srcOffset];
                  imageData.data[dstOffset + 1] = buffer[srcOffset + 1];
                  imageData.data[dstOffset + 2] = buffer[srcOffset + 2];
                  imageData.data[dstOffset + 3] = 255;
                }
              }
              ctx.putImageData(imageData, 0, 0);
            }
          }
        });

        localSocket.on('canvasDeleted', () => {
          alert('이 캔버스가 삭제되었습니다.');
          navigate('/canvas');
        });

        localSocket.on('error', (message: string) => {
          console.error('Socket error:', message);
          // Show error toast ideally
        });

        setSocket(localSocket);

      } catch (err) {
        console.error(err);
        setError('Network error');
      }
    };

    init();

    return () => {
      if (localSocket) localSocket.disconnect();
    };
  }, [id]);

  const handleResize = async (direction: 'up' | 'down' | 'left' | 'right') => {
    try {
      const res = await fetch(`${API_URL}/canvas/${id}/resize`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ direction, amount: 1 })
      });
      if (!res.ok) {
        throw new Error('Resize failed');
      }
    } catch (e) {
      console.error(e);
      setError('Failed to resize canvas');
    }
  };

  const drawPixelAt = useCallback((x: number, y: number) => {
    if (!canvasRef.current || !socket || !canvasInfo) return;
    
    // Bounds check
    if (x < 0 || x >= canvasInfo.width || y < 0 || y >= canvasInfo.height) return;

    // Fast local rendering
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Packet creation per API spec (5 bytes)
    const packet = new Uint8Array(5);
    packet[0] = x;
    packet[1] = y;
    packet[2] = color.r;
    packet[3] = color.g;
    packet[4] = color.b;
    socket.emit('draw', packet.buffer);
  }, [socket, canvasInfo, color]);

  const handlePointerEvent = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current || !canvasInfo) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    
    drawPixelAt(x, y);
  }, [canvasInfo, scale, drawPixelAt]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDrawing(true);
    handlePointerEvent(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDrawing) {
      handlePointerEvent(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDrawing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '10vh' }}>
        <div style={{ padding: '2rem', background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', display: 'inline-block' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>{error}</h2>
          <button 
            onClick={() => navigate('/canvas')}
            style={{ padding: '0.75rem 1.5rem', background: 'var(--text-primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 500 }}
          >
            Return to List
          </button>
        </div>
      </div>
    );
  }

  const predefinedColors = [
    { r: 0, g: 0, b: 0, label: 'Black' },
    { r: 255, g: 255, b: 255, label: 'White' },
    { r: 239, g: 68, b: 68, label: 'Red' },
    { r: 34, g: 197, b: 94, label: 'Green' },
    { r: 59, g: 130, b: 246, label: 'Blue' },
    { r: 234, g: 179, b: 8, label: 'Yellow' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ 
        padding: '0.75rem 1.5rem', 
        background: '#fff', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/canvas')}
            style={{ 
              padding: '0.5rem', 
              borderRadius: '50%', 
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Canvas #{id}</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={() => setScale(s => Math.max(1, s - 1))}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ZoomOut size={20} />
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'center' }}>{scale}x</span>
          <button 
            onClick={() => setScale(s => Math.min(50, s + 1))}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ZoomIn size={20} />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div 
        ref={containerRef}
        style={{ 
          flex: 1, 
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          position: 'relative',
          padding: '2rem'
        }}
      >
        <div style={{
          boxShadow: 'var(--shadow-xl)',
          background: '#fff',
          borderRadius: '4px',
          padding: '1px',
          display: 'flex',
          position: 'relative'
        }}>
          {/* Resize Buttons */}
          <button 
            onClick={() => handleResize('up')}
            style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 32, height: 32, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Expand Canvas Up"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={() => handleResize('down')}
            style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)', width: 32, height: 32, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Expand Canvas Down"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={() => handleResize('left')}
            style={{ position: 'absolute', left: -40, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Expand Canvas Left"
          >
            <Plus size={16} />
          </button>
          <button 
            onClick={() => handleResize('right')}
            style={{ position: 'absolute', right: -40, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Expand Canvas Right"
          >
            <Plus size={16} />
          </button>

          {/* Grid Overlay Layer */}
          <div style={{
            position: 'absolute',
            top: 1,
            left: 1,
            width: canvasInfo ? canvasInfo.width * scale : 0,
            height: canvasInfo ? canvasInfo.height * scale : 0,
            pointerEvents: 'none',
            zIndex: 5,
            backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
            backgroundSize: `${scale}px ${scale}px`,
            opacity: scale > 4 ? 0.5 : 0 // Only show grid when zoomed in enough
          }} />
          
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: canvasInfo ? canvasInfo.width * scale : 0,
              height: canvasInfo ? canvasInfo.height * scale : 0,
              imageRendering: 'pixelated',
              cursor: 'crosshair',
              background: '#fff',
              touchAction: 'none',
              zIndex: 1
            }}
          />
        </div>
      </div>

      {/* Toolbox */}
      <div style={{ 
        padding: '1.25rem 2rem', 
        background: '#fff', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        {predefinedColors.map((c, idx) => {
          const isSelected = color.r === c.r && color.g === c.g && color.b === c.b;
          return (
            <button
              key={idx}
              onClick={() => setColor(c)}
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                backgroundColor: `rgb(${c.r}, ${c.g}, ${c.b})`,
                border: isSelected 
                  ? '3px solid var(--text-primary)' 
                  : '1px solid var(--border-color)',
                boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s ease'
              }}
              title={c.label}
            />
          );
        })}
      </div>
    </div>
  );
}
