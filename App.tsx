import React, { useState } from 'react';
import Camera from './components/Camera';
import Editor from './components/Editor';
import Gallery from './components/Gallery';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.CAMERA);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedAspectRatio, setCapturedAspectRatio] = useState<'9:16' | '16:9'>('9:16');

  const handleCapture = (imageSrc: string, aspectRatio: '9:16' | '16:9') => {
    setCapturedImage(imageSrc);
    setCapturedAspectRatio(aspectRatio);
    setCurrentView(AppView.EDITOR);
  };

  const handleSaveComplete = () => {
    setCurrentView(AppView.GALLERY);
    setCapturedImage(null);
  };

  const handleCloseEditor = () => {
    setCapturedImage(null);
    setCurrentView(AppView.CAMERA);
  };

  return (
    <div className="w-full h-[100dvh] bg-background text-white overflow-hidden max-w-md mx-auto relative shadow-2xl border-x border-white/5">
      
      {currentView === AppView.CAMERA && (
        <Camera 
          onCapture={handleCapture} 
          onNavigate={setCurrentView}
        />
      )}

      {currentView === AppView.EDITOR && capturedImage && (
        <Editor 
          imageSrc={capturedImage}
          initialAspectRatio={capturedAspectRatio}
          onClose={handleCloseEditor}
          onSaveComplete={handleSaveComplete}
        />
      )}

      {currentView === AppView.GALLERY && (
        <Gallery onNavigate={setCurrentView} />
      )}
    </div>
  );
};

export default App;
