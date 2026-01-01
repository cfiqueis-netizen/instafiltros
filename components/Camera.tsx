import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera as CameraIcon, SwitchCamera, Ratio, Image as ImageIcon, RotateCcw, Sparkles, ScanFace } from 'lucide-react';
import { AppView } from '../types';

interface CameraProps {
  onCapture: (imageSrc: string, aspectRatio: '9:16' | '16:9') => void;
  onNavigate: (view: AppView) => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onNavigate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [isBeautyMode, setIsBeautyMode] = useState(false);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // The CSS filter string for beauty mode (Adjusted to ~40% intensity: subtle smoothing/brightening)
  const beautyFilter = 'contrast(0.98) brightness(1.04) saturate(1.04) sepia(0.02)';

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setIsLoading(true);
    setError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso à câmera.");
      }

      let stream: MediaStream;

      try {
        // Attempt 1: Ideal Resolution (High Quality)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch (err: any) {
        // If specific constraints fail (but not permission), try basic constraints
        if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          console.warn("Retrying with basic constraints...");
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false
          });
        } else {
          throw err;
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Re-apply focus if it was active and camera restarted (e.g. switch camera)
      if (isFocusActive) {
         applyFocusConstraint(stream, true);
      }

    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Acesso à câmera negado. Por favor, permita o acesso nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setError(`Erro ao acessar a câmera: ${err.message || 'Desconhecido'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopCamera, isFocusActive]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const applyFocusConstraint = async (currentStream: MediaStream | null, active: boolean) => {
    if (!currentStream) return;
    
    const track = currentStream.getVideoTracks()[0];
    if (!track) return;

    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    
    // Check if the browser supports focusMode
    // @ts-ignore - focusMode is standard in newer specs but TS might miss it on some envs
    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
        try {
            await track.applyConstraints({
                advanced: [{ focusMode: active ? 'continuous' : 'auto' } as any]
            });
        } catch (e) {
            console.log("Focus constraint not supported fully", e);
        }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleAspectRatio = () => {
    setAspectRatio(prev => prev === '9:16' ? '16:9' : '9:16');
  };

  const toggleBeautyMode = () => {
    setIsBeautyMode(prev => !prev);
  };

  const toggleFocusMode = () => {
      const newState = !isFocusActive;
      setIsFocusActive(newState);
      applyFocusConstraint(streamRef.current, newState);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetWidth, targetHeight;
    
    // Set high resolution output based on aspect ratio
    if (aspectRatio === '9:16') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else {
      targetWidth = 1920;
      targetHeight = 1080;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const videoRatio = video.videoWidth / video.videoHeight;
    const targetRatio = targetWidth / targetHeight;

    let drawWidth, drawHeight, startX, startY;

    if (videoRatio > targetRatio) {
      drawHeight = targetHeight;
      drawWidth = drawHeight * videoRatio;
      startY = 0;
      startX = (targetWidth - drawWidth) / 2;
    } else {
      drawWidth = targetWidth;
      drawHeight = drawWidth / videoRatio;
      startX = 0;
      startY = (targetHeight - drawHeight) / 2;
    }
    
    // Apply transforms (Mirroring)
    if (facingMode === 'user') {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    // Apply Beauty Filter to the Canvas Context BEFORE drawing
    if (isBeautyMode) {
      ctx.filter = beautyFilter;
    } else {
      ctx.filter = 'none';
    }

    ctx.drawImage(video, startX, startY, drawWidth, drawHeight);
    
    // Reset transforms and filters
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';

    const imageSrc = canvas.toDataURL('image/jpeg', 0.95);
    onCapture(imageSrc, aspectRatio);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Controls */}
      <div className="absolute top-0 left-0 w-full p-6 pt-8 z-20 flex justify-between items-start pointer-events-none">
         {/* Left Side: Face Focus */}
         <button 
            onClick={toggleFocusMode}
            className={`pointer-events-auto p-3 rounded-full backdrop-blur-md transition-all duration-300 border active:scale-95 flex flex-col items-center gap-1
              ${isFocusActive 
                ? 'bg-yellow-500/30 border-yellow-500 text-yellow-300' 
                : 'bg-white/10 border-white/10 text-white/80 hover:bg-white/20'
              }`}
          >
            <ScanFace className={`w-6 h-6 ${isFocusActive ? 'text-yellow-300' : ''}`} />
            <span className="text-[9px] font-bold">Foco Rosto</span>
          </button>

         {/* Right Side: Beauty Mode */}
         <button 
            onClick={toggleBeautyMode}
            className={`pointer-events-auto p-3 rounded-full backdrop-blur-md transition-all duration-300 border active:scale-95 flex flex-col items-center gap-1
              ${isBeautyMode 
                ? 'bg-pink-500/30 border-pink-500 text-pink-300' 
                : 'bg-white/10 border-white/10 text-white/80 hover:bg-white/20'
              }`}
          >
            <Sparkles className={`w-6 h-6 ${isBeautyMode ? 'fill-pink-300' : ''}`} />
            <span className="text-[9px] font-bold">Pele Suave</span>
          </button>
      </div>

      {error ? (
        <div className="text-white text-center p-8 bg-surface/90 backdrop-blur rounded-2xl mx-6 border border-white/10 shadow-2xl z-20">
          <div className="bg-red-500/20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
             <CameraIcon className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold mb-2">Ops!</h3>
          <p className="text-gray-300 mb-6 text-sm">{error}</p>
          <button 
            onClick={startCamera} 
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary hover:bg-primary/80 rounded-xl text-sm font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar Novamente
          </button>
        </div>
      ) : (
        <div className={`relative w-full h-full flex items-center justify-center`}>
           {isLoading && (
               <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                   <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
               </div>
           )}
           <div 
              className={`relative overflow-hidden shadow-2xl transition-all duration-300 ease-in-out bg-gray-900`}
              style={{
                aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
                height: aspectRatio === '9:16' ? '100%' : 'auto',
                width: aspectRatio === '16:9' ? '100%' : 'auto',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
           >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                style={{
                  filter: isBeautyMode ? beautyFilter : 'none'
                }}
                className={`absolute top-1/2 left-1/2 min-w-full min-h-full object-cover transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                onLoadedMetadata={() => setIsLoading(false)}
              />

              {/* Face Focus Reticle Overlay */}
              {isFocusActive && !isLoading && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-64 pointer-events-none transition-opacity duration-500 animate-pulse">
                      {/* Corners */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-lg"></div>
                      {/* Crosshair */}
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"></div>
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-yellow-300 text-[10px] font-bold tracking-widest bg-black/40 px-2 py-1 rounded">
                          FACE DETECT
                      </div>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 w-full p-6 pb-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-10">
        
        <button 
          onClick={() => onNavigate(AppView.GALLERY)}
          className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10 active:scale-95"
        >
          <ImageIcon className="text-white w-6 h-6" />
        </button>

        <button 
          onClick={capturePhoto}
          disabled={!!error || isLoading}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform bg-white/20 backdrop-blur-sm disabled:opacity-50 disabled:hover:scale-100"
        >
          <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>

        <div className="flex gap-4">
          <button 
            onClick={toggleAspectRatio}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10 flex flex-col items-center justify-center w-12 h-12 active:scale-95"
          >
            <Ratio className="text-white w-5 h-5" />
            <span className="text-[9px] text-white/90 font-bold mt-0.5">{aspectRatio}</span>
          </button>
          
          <button 
            onClick={toggleCamera}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10 w-12 h-12 flex items-center justify-center active:scale-95"
          >
            <SwitchCamera className="text-white w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Camera;