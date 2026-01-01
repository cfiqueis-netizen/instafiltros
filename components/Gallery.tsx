import React, { useState, useEffect } from 'react';
import { Camera, Trash2, Share2, ArrowLeft } from 'lucide-react';
import { getAllPhotos, deletePhoto } from '../services/db';
import { Photo, AppView } from '../types';

interface GalleryProps {
  onNavigate: (view: AppView) => void;
}

const Gallery: React.FC<GalleryProps> = ({ onNavigate }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await getAllPhotos();
      setPhotos(data);
    } catch (e) {
      console.error("Error loading photos", e);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta foto?')) {
      await deletePhoto(id);
      setSelectedPhoto(null);
      loadPhotos();
    }
  };

  const handleShare = async (photo: Photo) => {
      // Convert DataURL to Blob for sharing
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `momento-${photo.id}.jpg`, { type: 'image/jpeg' });

      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: 'Meu Momento',
          });
        } catch (error) {
           console.log("Sharing cancelled or failed", error);
        }
      } else {
        alert("Compartilhamento não suportado neste navegador.");
      }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-surface z-10">
        <button 
            onClick={() => onNavigate(AppView.CAMERA)}
            className="flex items-center text-white gap-2"
        >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Câmera</span>
        </button>
        <h1 className="text-xl font-bold font-serif italic text-primary">Galeria</h1>
        <div className="w-8"></div> {/* Spacer for alignment */}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
            <Camera className="w-16 h-16 mb-4" />
            <p>Nenhuma foto salva ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {photos.map(photo => (
              <div 
                key={photo.id} 
                onClick={() => setSelectedPhoto(photo)}
                className="aspect-[9/16] bg-gray-800 relative cursor-pointer overflow-hidden rounded-sm"
              >
                <img 
                    src={photo.dataUrl} 
                    alt="Saved" 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-10">
                <button onClick={() => setSelectedPhoto(null)} className="p-2 text-white bg-black/20 rounded-full backdrop-blur">
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex items-center justify-center overflow-hidden">
                <img 
                    src={selectedPhoto.dataUrl} 
                    alt="Full View" 
                    className="max-w-full max-h-full object-contain"
                />
            </div>

            <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-around items-center pb-8">
                <button 
                    onClick={() => handleShare(selectedPhoto)}
                    className="flex flex-col items-center text-white gap-1"
                >
                    <div className="p-3 bg-white/10 rounded-full backdrop-blur-md">
                        <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs">Compartilhar</span>
                </button>
                
                <button 
                    onClick={() => handleDelete(selectedPhoto.id)}
                    className="flex flex-col items-center text-red-400 gap-1"
                >
                     <div className="p-3 bg-red-900/20 rounded-full backdrop-blur-md">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs">Excluir</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
