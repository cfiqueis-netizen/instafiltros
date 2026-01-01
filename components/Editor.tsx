import React, { useRef, useState, useEffect } from 'react';
import { Share2, Download, X, Check, Wand2, Square, Type, ImagePlus, Pin, PinOff } from 'lucide-react';
import { FILTERS, FRAMES, STICKERS } from '../constants';
import { FilterType, FrameType, StickerType, AppView } from '../types';
import { savePhoto } from '../services/db';

interface EditorProps {
  imageSrc: string;
  initialAspectRatio: '9:16' | '16:9';
  onClose: () => void;
  onSaveComplete: () => void;
}

const STORAGE_KEY_DEFAULT_FRAME = 'instafiltros_default_frame';

const Editor: React.FC<EditorProps> = ({ imageSrc, initialAspectRatio, onClose, onSaveComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'filters' | 'frames' | 'text'>('filters');
  
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('none');
  const [selectedFrame, setSelectedFrame] = useState<FrameType>('none');
  const [customFrameSrc, setCustomFrameSrc] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<StickerType>('none');
  
  // State to track the currently pinned default frame
  const [pinnedFrame, setPinnedFrame] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  // Load default frame on mount
  useEffect(() => {
    const savedFrame = localStorage.getItem(STORAGE_KEY_DEFAULT_FRAME);
    if (savedFrame) {
      setPinnedFrame(savedFrame);
      // Validate if the saved frame exists in our presets
      if (FRAMES.some(f => f.name === savedFrame)) {
        setSelectedFrame(savedFrame as FrameType);
      }
    }
  }, []);

  // Helper to draw text stickers (extracted to be reused in sync/async flows)
  const drawSticker = (ctx: CanvasRenderingContext2D, width: number, height: number, frameType: FrameType) => {
    if (selectedSticker !== 'none') {
      const stickerConfig = STICKERS.find(s => s.name === selectedSticker);
      if (stickerConfig) {
        ctx.save();
        // Scale font size based on image resolution
        const scaleFactor = Math.min(width, height) / 1080;
        const fontSize = parseInt(stickerConfig.font.match(/\d+/)?.[0] || '60') * scaleFactor;
        const fontFamily = stickerConfig.font.split(' ').slice(2).join(' ').replace(/"/g, '') || 'sans-serif';
        
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = stickerConfig.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10 * scaleFactor;
        ctx.shadowOffsetX = 2 * scaleFactor;
        ctx.shadowOffsetY = 2 * scaleFactor;

        let x = width / 2;
        let y = height * 0.85; 

        if (frameType === 'polaroid') {
            y = height * 0.92;
            ctx.fillStyle = '#333';
            ctx.shadowColor = 'transparent';
        }

        ctx.fillText(stickerConfig.text, x, y);
        ctx.restore();
      }
    }
  };

  // Function to redraw canvas based on current state
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    
    img.onload = () => {
      // 1. Setup Canvas
      canvas.width = img.width;
      canvas.height = img.height;
      const w = canvas.width;
      const h = canvas.height;
      
      // 2. Clear
      ctx.clearRect(0, 0, w, h);

      // 3. Apply Filters
      const filterConfig = FILTERS.find(f => f.name === selectedFilter);
      ctx.filter = filterConfig ? filterConfig.filter : 'none';
      
      // 4. Draw Base Image
      ctx.drawImage(img, 0, 0);
      ctx.filter = 'none'; // Reset filter

      // 5. Draw Frames
      if (selectedFrame === 'custom' && customFrameSrc) {
        // Async Custom Frame
        const frameImg = new Image();
        frameImg.crossOrigin = "anonymous";
        frameImg.src = customFrameSrc;
        frameImg.onload = () => {
            // Draw custom frame stretched to fit
            ctx.drawImage(frameImg, 0, 0, w, h);
            // 6. Draw Sticker (Must be inside onload to be on top)
            drawSticker(ctx, w, h, selectedFrame);
        };
      } else {
        // Sync Standard Frames
        if (selectedFrame !== 'none') {
            ctx.lineWidth = Math.min(w, h) * 0.05;

            if (selectedFrame === 'white-border') {
            ctx.strokeStyle = 'white';
            ctx.strokeRect(0, 0, w, h);
            } else if (selectedFrame === 'polaroid') {
            const padding = Math.min(w, h) * 0.05;
            const bottomPadding = Math.min(w, h) * 0.2;
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, w, h); // Draw white bg
            // Draw image inside (requires redrawing image smaller)
            const innerW = w - (padding * 2);
            const innerH = h - (padding + bottomPadding);
            
            ctx.filter = filterConfig ? filterConfig.filter : 'none';
            ctx.drawImage(img, 0, 0, img.width, img.height, padding, padding, innerW, innerH);
            ctx.filter = 'none';
            } else if (selectedFrame === 'cinema') {
            const barHeight = h * 0.1;
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, w, barHeight);
            ctx.fillRect(0, h - barHeight, w, barHeight);
            } else if (selectedFrame === 'vignette') {
            const gradient = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)/3, w/2, h/2, Math.max(w,h)/1.2);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.7)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0,0,w,h);
            }
        }
        // 6. Draw Sticker (Sync flow)
        drawSticker(ctx, w, h, selectedFrame);
      }
    };
  };

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, selectedFrame, selectedSticker, customFrameSrc]);

  const handleCustomFrameSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setCustomFrameSrc(event.target.result as string);
                setSelectedFrame('custom');
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleFrameClick = (frameName: FrameType) => {
      if (frameName === 'custom') {
          fileInputRef.current?.click();
      } else {
          setSelectedFrame(frameName);
      }
  };

  const togglePinFrame = () => {
    if (selectedFrame === 'custom') {
      alert("Molduras personalizadas não podem ser fixadas como padrão.");
      return;
    }

    if (pinnedFrame === selectedFrame) {
      // Unpin
      localStorage.removeItem(STORAGE_KEY_DEFAULT_FRAME);
      setPinnedFrame(null);
    } else {
      // Pin
      localStorage.setItem(STORAGE_KEY_DEFAULT_FRAME, selectedFrame);
      setPinnedFrame(selectedFrame);
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    
    try {
      // Small delay to ensure any async drawing operations have completed (simple safeguard)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalImage = canvasRef.current.toDataURL('image/jpeg', 0.9);
      
      await savePhoto({
        dataUrl: finalImage,
        timestamp: Date.now(),
        aspectRatio: initialAspectRatio
      });

      const link = document.createElement('a');
      link.download = `momento-${Date.now()}.jpg`;
      link.href = finalImage;
      link.click();

      onSaveComplete();
    } catch (e) {
      console.error("Failed to save", e);
      alert("Erro ao salvar a imagem.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
     if (!canvasRef.current) return;
     
     canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], "momento.jpg", { type: "image/jpeg" });
        
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Meu Momento',
              text: 'Confira esta foto que editei no app Momentos!',
              files: [file]
            });
          } catch (error) {
            console.log('Error sharing', error);
          }
        } else {
          alert("O compartilhamento não é suportado neste navegador. A imagem será salva.");
          handleSave();
        }
     }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col h-full">
      {/* Hidden Input for Custom Frames */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleCustomFrameSelect} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-surface/50 backdrop-blur border-b border-white/5">
        <button onClick={onClose} className="p-2 text-white/80 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <span className="font-semibold text-lg tracking-wide">Editar Foto</span>
        <div className="flex gap-2">
            <button 
                onClick={handleShare} 
                disabled={isSaving}
                className="p-2 text-blue-400 hover:text-blue-300"
            >
                <Share2 className="w-6 h-6" />
            </button>
            <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="p-2 text-green-400 hover:text-green-300"
            >
                {isSaving ? <span className="text-xs">...</span> : <Check className="w-6 h-6" />}
            </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-black/20 relative">
        <canvas 
          ref={canvasRef} 
          className="max-w-full max-h-full shadow-2xl object-contain"
          style={{ 
             aspectRatio: initialAspectRatio === '9:16' ? '9/16' : '16/9' 
          }}
        />
      </div>

      {/* Controls Area */}
      <div className="bg-surface border-t border-white/5 pb-safe">
        
        {/* Helper Header for specific tabs */}
        {activeTab === 'frames' && selectedFrame !== 'none' && selectedFrame !== 'custom' && (
           <div className="px-4 pt-2 flex justify-end">
              <button 
                onClick={togglePinFrame}
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors ${pinnedFrame === selectedFrame 
                  ? 'bg-primary/20 border-primary text-primary' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
              >
                 {pinnedFrame === selectedFrame ? <Pin className="w-3 h-3 fill-current" /> : <PinOff className="w-3 h-3" />}
                 <span>{pinnedFrame === selectedFrame ? 'Padrão Fixado' : 'Fixar como Padrão'}</span>
              </button>
           </div>
        )}

        {/* Sub-menu (Options based on active tab) */}
        <div className="h-28 overflow-x-auto overflow-y-hidden whitespace-nowrap p-4 scrollbar-hide">
            {activeTab === 'filters' && (
                <div className="flex gap-4">
                    {FILTERS.map(f => (
                        <button 
                            key={f.name}
                            onClick={() => setSelectedFilter(f.name as FilterType)}
                            className={`flex flex-col items-center gap-2 group`}
                        >
                            <div className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${selectedFilter === f.name ? 'border-primary' : 'border-transparent'}`}>
                                <img src={imageSrc} className="w-full h-full object-cover" style={{ filter: f.filter }} alt={f.label} />
                            </div>
                            <span className={`text-xs ${selectedFilter === f.name ? 'text-primary' : 'text-gray-400'}`}>{f.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {activeTab === 'frames' && (
                <div className="flex gap-4">
                    {FRAMES.map(f => (
                        <button 
                            key={f.name}
                            onClick={() => handleFrameClick(f.name as FrameType)}
                            className={`flex flex-col items-center gap-2 relative`}
                        >
                             <div className={`w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center border-2 ${selectedFrame === f.name ? 'border-primary' : 'border-transparent'}`}>
                                {f.name === 'custom' ? (
                                     <ImagePlus className="w-8 h-8 text-gray-400" />
                                ) : (
                                     <Square className="w-8 h-8 text-gray-400" />
                                )}
                            </div>
                            <span className={`text-xs ${selectedFrame === f.name ? 'text-primary' : 'text-gray-400'} flex items-center gap-1`}>
                              {f.label}
                              {pinnedFrame === f.name && <Pin className="w-3 h-3 fill-primary text-primary" />}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {activeTab === 'text' && (
                <div className="flex gap-4">
                    {STICKERS.map(s => (
                        <button 
                            key={s.name}
                            onClick={() => setSelectedSticker(s.name as StickerType)}
                            className={`flex flex-col items-center gap-2`}
                        >
                            <div className={`w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center border-2 ${selectedSticker === s.name ? 'border-primary' : 'border-transparent'}`}>
                                 <span className="text-[10px] text-center px-1 truncate w-full">{s.text || 'Nenhum'}</span>
                            </div>
                            <span className={`text-xs ${selectedSticker === s.name ? 'text-primary' : 'text-gray-400'}`}>{s.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-around items-center p-2 border-t border-white/5 bg-background">
          <button 
            onClick={() => setActiveTab('filters')} 
            className={`flex flex-col items-center p-2 ${activeTab === 'filters' ? 'text-white' : 'text-gray-500'}`}
          >
            <Wand2 className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase font-bold">Filtros</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('frames')}
            className={`flex flex-col items-center p-2 ${activeTab === 'frames' ? 'text-white' : 'text-gray-500'}`}
          >
            <Square className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase font-bold">Molduras</span>
          </button>

          <button 
            onClick={() => setActiveTab('text')}
            className={`flex flex-col items-center p-2 ${activeTab === 'text' ? 'text-white' : 'text-gray-500'}`}
          >
            <Type className="w-6 h-6 mb-1" />
            <span className="text-[10px] uppercase font-bold">Frases</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Editor;