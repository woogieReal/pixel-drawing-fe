import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface CanvasItem {
  canvasId: number;
  width: number;
  height: number;
  updatedAt: string;
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
      const res = await fetch(`http://localhost:3100/canvas?page=${pageNum}&limit=20`);
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

  const handleCreate = async () => {
    try {
      const res = await fetch('http://localhost:3100/canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ width: 64, height: 64 })
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
              padding: '1.5rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1'
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
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-color)' }}>
              #{item.canvasId}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {item.width} x {item.height}
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '1rem' }}>
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
