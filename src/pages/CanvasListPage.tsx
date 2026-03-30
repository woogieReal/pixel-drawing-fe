import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100';

interface CanvasItem {
  canvasId: number;
  width: number;
  height: number;
  updatedAt: string;
  thumbnail: string | null; // base64 RGB
}

function CanvasThumbnail({ thumbnail, width, height }: { thumbnail: string | null; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !thumbnail) return;

    const thumbW = Math.min(width, 64);
    const thumbH = Math.min(height, 64);
    el.width = thumbW;
    el.height = thumbH;

    const ctx = el.getContext('2d');
    if (!ctx) return;

    const binary = atob(thumbnail);
    const imageData = ctx.createImageData(thumbW, thumbH);
    for (let i = 0; i < thumbW * thumbH; i++) {
      imageData.data[i * 4]     = binary.charCodeAt(i * 3);
      imageData.data[i * 4 + 1] = binary.charCodeAt(i * 3 + 1);
      imageData.data[i * 4 + 2] = binary.charCodeAt(i * 3 + 2);
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, [thumbnail, width, height]);

  if (!thumbnail) {
    return (
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-tertiary)',
        fontSize: '0.75rem',
      }}>
        No preview
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        aspectRatio: '1',
        borderRadius: 'var(--radius-md)',
        imageRendering: 'pixelated',
        objectFit: 'contain',
        background: '#fff',
      }}
    />
  );
}

export default function CanvasListPage() {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCanvases(1);
  }, []);

  const fetchCanvases = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/canvas?page=${pageNum}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setItems(data.items);
        } else {
          setItems(prev => [...prev, ...data.items]);
        }
        setTotalPages(data.totalPages);
        setPage(data.page);
      }
    } catch (e) {
      console.error('Failed to fetch canvases', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (page < totalPages) {
      fetchCanvases(page + 1);
    }
  };

  const handleDelete = async (e: React.MouseEvent, canvasId: number) => {
    e.stopPropagation();
    if (!window.confirm(`캔버스 #${canvasId}를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const res = await fetch(`${API_URL}/canvas/${canvasId}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.canvasId !== canvasId));
      }
    } catch (e) {
      console.error('Failed to delete canvas', e);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_URL}/canvas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ width: 16, height: 16 })
      });
      if (res.ok) {
        const data = await res.json();
        navigate(`/canvas/${data.canvasId}`);
      }
    } catch (e) {
      console.error('Failed to create canvas', e);
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Pixel Canvases</h1>
      
      <div className="canvas-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {items.map(item => (
          <div
            key={item.canvasId}
            className="canvas-card"
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-sm)',
              padding: '1rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              position: 'relative',
            }}
            onClick={() => navigate(`/canvas/${item.canvasId}`)}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <button
              onClick={(e) => handleDelete(e, item.canvasId)}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
              title="캔버스 삭제"
            >
              <Trash2 size={14} />
            </button>
            <CanvasThumbnail thumbnail={item.thumbnail} width={item.width} height={item.height} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>#{item.canvasId}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.width} x {item.height}</span>
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
              {new Date(item.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {page < totalPages && (
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={loadMore}
            disabled={loading}
            style={{
              padding: '0.75rem 1.75rem',
              borderRadius: 'var(--radius-full)',
              background: '#fff',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              boxShadow: 'var(--shadow-sm)',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={e => {
              if(!loading) {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
               if(!loading) {
                 e.currentTarget.style.backgroundColor = '#fff';
                 e.currentTarget.style.color = 'var(--text-secondary)';
               }
            }}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      <button
        onClick={handleCreate}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          background: 'var(--accent-color)',
          color: '#fff',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title="Create Canvas"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
