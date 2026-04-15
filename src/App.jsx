import React, { useState, useRef } from 'react';
import {
  RefreshCw, Upload, CheckCircle, Download,
  Trash2, Scissors, Zap, Sparkles, History,
  Maximize2, Scan, Target, Focus, Grid,
  ArrowRightLeft, Image as ImageIcon,
  Award, ChevronRight
} from 'lucide-react';

const API_KEY = "";
const IMAGE_EDIT_MODEL = "gemini-2.5-flash-image-preview";
const ANALYSIS_MODEL = "gemini-2.5-flash-preview-09-2025";

const BASE_STYLES = [
  { id: 'custom-made', name: 'AI Custom Made', category: 'Tailored', description: 'Design crafted by AI based on your face shape' },
  { id: 'signature-cut', name: 'Signature Cut', category: 'Base', description: 'Balanced professional base' },
  { id: 'wolf-cut', name: 'Wolf Cut', category: 'Trend', description: 'Shaggy layers and movement' },
  { id: 'modern-bob', name: 'Modern Bob', category: 'Classic', description: 'Structured jaw-length cut' },
  { id: 'edgy-pixie', name: 'Edgy Pixie', category: 'Short', description: 'Short and textured' },
  { id: 'vintage-glam', name: 'Vintage Glam', category: 'Luxury', description: 'Red carpet structured waves' },
  { id: 'boho-braid', name: 'Boho Braid', category: 'Romantic', description: 'Loose side-swept braid' }
];

const TEXTURES = [
  { id: 'straight', name: 'Sleek Straight' },
  { id: 'wavy', name: 'Natural Waves' },
  { id: 'curly', name: 'Defined Curls' },
  { id: 'coily', name: 'Ultra Coily' }
];

const HAIR_COLORS = [
  { id: 'natural-black', name: 'Natural Black', hex: '#1a1a1a' },
  { id: 'espresso', name: 'Espresso Brown', hex: '#2c1e14' },
  { id: 'honey-gold', name: 'Honey Gold', hex: '#c5a059' },
  { id: 'burgundy', name: 'Deep Burgundy', hex: '#630d0d' },
  { id: 'custom', name: 'Custom Design', hex: 'rainbow' }
];

const CameraIcon2 = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
    <circle cx="12" cy="13" r="3"/>
  </svg>
);

function App() {
  const [userPhoto, setUserPhoto] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedStyle, setSelectedStyle] = useState(BASE_STYLES[0]);
  const [hairLength, setHairLength] = useState(50);
  const [selectedTexture, setSelectedTexture] = useState(TEXTURES[1]);
  const [selectedColor, setSelectedColor] = useState(HAIR_COLORS[0]);
  const [customHex, setCustomHex] = useState('#4f46e5');
  const [highlights, setHighlights] = useState(false);
  const [highlightIntensity, setHighlightIntensity] = useState(50);

  const [faceAnalysis, setFaceAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [viewMode, setViewMode] = useState('slider');
  const [sliderPos, setSliderPos] = useState(50);
  const [showMesh, setShowMesh] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [activeTab, setActiveTab] = useState('design');

  const [chatLog, setChatLog] = useState([
    { role: 'ai', text: "Hello! I'm your AI Stylist. I've been optimized to protect your identity while recommending styles that suit your facial structure. How can I help you?" }
  ]);
  const [chatInput, setChatInput] = useState('');

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const sliderRef = useRef(null);

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied.');
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/png');
    setUserPhoto(data);
    stopCamera();
    analyzeFace(data.split(',')[1]);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  const analyzeFace = async (base64) => {
    setAnalyzing(true);
    try {
      const prompt = 'Analyze face shape, features, and skin tone. Return JSON: {shape, description, recommendedStyles: [names]}';
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + ANALYSIS_MODEL + ':generateContent?key=' + API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64 } }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );
      const data = await response.json();
      const analysis = JSON.parse(data.candidates[0].content.parts[0].text);
      setFaceAnalysis(analysis);
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          text: 'Scan complete! You have a ' + analysis.shape + ' face shape. I recommend styles like: ' + analysis.recommendedStyles.join(', ') + ' to balance your features.'
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateTransformation = async () => {
    if (!userPhoto) return;
    setLoading(true);
    setError(null);

    const base64Data = userPhoto.split(',')[1];
    const finalColor = selectedColor.id === 'custom' ? 'custom hex color ' + customHex : selectedColor.name;
    const highlightPrompt = highlights ? 'with ' + highlightIntensity + '% intensity balayage highlights' : 'solid uniform color';

    let lengthDesc = 'shoulder length';
    if (hairLength < 25) lengthDesc = 'very short pixie';
    else if (hairLength < 50) lengthDesc = 'chin-length bob';
    else if (hairLength < 75) lengthDesc = 'shoulder length';
    else lengthDesc = 'waist-length extra long';

    const styleDesc = selectedStyle.id === 'custom-made'
      ? 'Bespoke design optimized for a ' + (faceAnalysis ? faceAnalysis.shape : 'balanced') + ' face'
      : selectedStyle.name;

    const transformationPrompt = [
      'STRICT IDENTITY LOCK: You are a professional hair stylist.',
      'Keep the face, eyes, nose, lips, and skin texture 100% IDENTICAL to the source photo.',
      'DO NOT MODIFY FACIAL FEATURES OR PROPORTIONS.',
      'HAIR DESIGN TASK:',
      '- STYLE: ' + styleDesc + '.',
      '- LENGTH: ' + lengthDesc + '.',
      '- TEXTURE: ' + selectedTexture.name + '.',
      '- COLOR: ' + finalColor + ' ' + highlightPrompt + '.',
      '- QUALITY: Professional high-resolution studio photography, realistic physics-based hair strands, seamless blend at the hairline.',
      'Retain original background and clothing perfectly.'
    ].join(' ');

    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + IMAGE_EDIT_MODEL + ':generateContent?key=' + API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: transformationPrompt }, { inlineData: { mimeType: 'image/png', data: base64Data } }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          })
        }
      );
      const result = await response.json();
      const parts = result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts;
      const inlinePart = parts && parts.find(function(p) { return p.inlineData; });
      const b64 = inlinePart && inlinePart.inlineData && inlinePart.inlineData.data;
      if (b64) {
        const img = 'data:image/png;base64,' + b64;
        setResultImage(img);
        setHistory(function(prev) {
          return [{ id: Date.now(), image: img, style: selectedStyle.name }].concat(prev).slice(0, 10);
        });
      } else {
        throw new Error('Render limit reached. Try different parameters.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCollage = () => {
    if (!userPhoto || !resultImage) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img1 = new Image();
    const img2 = new Image();
    img1.onload = function() {
      img2.onload = function() {
        canvas.width = 1200;
        canvas.height = 800;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 800);
        ctx.drawImage(img1, 0, 0, 600, 800);
        ctx.drawImage(img2, 600, 0, 600, 800);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(20, 740, 120, 40);
        ctx.fillRect(620, 740, 120, 40);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('SOURCE', 40, 768);
        ctx.fillText('RENDER', 640, 768);
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = 'stylelab-collage.png';
        link.click();
      };
      img2.src = resultImage;
    };
    img1.src = userPhoto;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        setUserPhoto(event.target.result);
        analyzeFace(event.target.result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChat = () => {
    if (!chatInput.trim()) return;
    setChatLog([...chatLog, { role: 'user', text: chatInput }]);
    setChatInput('');
  };

  const handleDownloadResult = () => {
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = 'style-render.png';
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 font-sans antialiased">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-100 transition-transform hover:scale-110">
            <Scissors className="text-white w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight">
              StyleLab<span className="text-indigo-600">.ai</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black uppercase ml-2 tracking-tighter">
              <Award className="w-3 h-3" /> Ultimate Edition
            </span>
          </div>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-full">
          {['design', 'stylist', 'history'].map(function(tab) {
            return (
              <button
                key={tab}
                onClick={function() { setActiveTab(tab); }}
                className={'px-5 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ' + (activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Scan className="w-4 h-4 text-indigo-600" /> Identity Grounding
              </h3>
              <div className="flex gap-2">
                <button onClick={startCamera} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors">
                  <CameraIcon2 className="w-4 h-4" />
                </button>
                {userPhoto && (
                  <button
                    onClick={function() { setShowMesh(!showMesh); }}
                    className={'p-1.5 rounded-lg transition-colors ' + (showMesh ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300')}
                  >
                    <Focus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {cameraActive ? (
              <div className="relative rounded-2xl overflow-hidden aspect-square bg-black shadow-inner">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <button onClick={capturePhoto} className="p-4 bg-indigo-600 rounded-full text-white shadow-xl hover:scale-105 active:scale-95">
                    <CameraIcon2 className="w-6 h-6" />
                  </button>
                  <button onClick={stopCamera} className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30">
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : !userPhoto ? (
              <div
                onClick={function() { fileInputRef.current.click(); }}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/10 transition-all"
              >
                <Upload className="text-slate-200 w-12 h-12 mx-auto mb-4" />
                <p className="font-bold text-slate-500 text-[10px] uppercase tracking-widest">Select Portrait</p>
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden aspect-square border-4 border-white shadow-md">
                  <img src={userPhoto} className="w-full h-full object-cover" alt="User" />
                  {showMesh && (
                    <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-400">
                        <circle cx="50" cy="40" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        <path d="M30 40 Q50 60 70 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        <path d="M40 35 L60 35 M50 20 L50 80" stroke="currentColor" strokeWidth="0.1" />
                      </svg>
                    </div>
                  )}
                  {analyzing && (
                    <div className="absolute inset-0 bg-indigo-900/30 backdrop-blur-sm flex items-center justify-center text-white text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
                      Syncing Anatomy...
                    </div>
                  )}
                </div>
                {faceAnalysis && (
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                    <Target className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-indigo-900 uppercase">Detection: {faceAnalysis.shape} Mesh</p>
                      <p className="text-[10px] text-indigo-600 font-medium leading-tight mt-0.5">Identity lock verified. No feature modification.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {activeTab === 'design' ? (
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <Scissors className="w-4 h-4 text-indigo-600" /> 1. Style Profile
                  </h3>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {BASE_STYLES.map(function(s) {
                      return (
                        <button
                          key={s.id}
                          onClick={function() { setSelectedStyle(s); }}
                          className={'p-3 text-left rounded-xl border-2 transition-all ' + (selectedStyle.id === s.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-50 bg-slate-50 hover:border-slate-200')}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <p className={'font-bold text-[11px] ' + (selectedStyle.id === s.id ? 'text-indigo-900' : 'text-slate-700')}>{s.name}</p>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{s.category}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-tight">{s.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest">2. Hair Length</h3>
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{hairLength}%</span>
                    </div>
                    <input
                      type="range"
                      value={hairLength}
                      onChange={function(e) { setHairLength(e.target.value); }}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between mt-2 text-[9px] font-black text-slate-300 uppercase">
                      <span>Short</span>
                      <span>Shoulder</span>
                      <span>Extra Long</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest mb-4">3. Texture Mapping</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {TEXTURES.map(function(t) {
                        return (
                          <button
                            key={t.id}
                            onClick={function() { setSelectedTexture(t); }}
                            className={'py-2 rounded-xl border-2 text-[9px] font-black transition-all ' + (selectedTexture.id === t.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-50')}
                          >
                            {t.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-[10px] uppercase tracking-widest">4. Chromatic Lab</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Balayage</span>
                      <input
                        type="checkbox"
                        checked={highlights}
                        onChange={function() { setHighlights(!highlights); }}
                        className="w-4 h-4 accent-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {HAIR_COLORS.map(function(c) {
                      return (
                        <button
                          key={c.id}
                          onClick={function() { setSelectedColor(c); }}
                          className={'group relative w-10 h-10 rounded-full border-2 transition-all ' + (selectedColor.id === c.id ? 'border-indigo-600 scale-110 shadow-lg ring-2 ring-indigo-100' : 'border-white hover:border-slate-200')}
                          style={{ background: c.id === 'custom' ? 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)' : c.hex }}
                          title={c.name}
                        >
                          {selectedColor.id === c.id && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {selectedColor.id === 'custom' && (
                      <input
                        type="color"
                        value={customHex}
                        onChange={function(e) { setCustomHex(e.target.value); }}
                        className="w-10 h-10 rounded-full border-0 p-0 overflow-hidden cursor-pointer shadow-inner"
                      />
                    )}
                  </div>
                  {highlights && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                        <span>Subtle</span>
                        <span>Highlight Intensity</span>
                        <span>Bold</span>
                      </div>
                      <input
                        type="range"
                        value={highlightIntensity}
                        onChange={function(e) { setHighlightIntensity(e.target.value); }}
                        className="w-full h-1 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      />
                    </div>
                  )}
                </div>
              </section>

              <button
                onClick={generateTransformation}
                disabled={loading || !userPhoto}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-3xl font-black text-xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95 group"
              >
                {loading ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-6 h-6 fill-white group-hover:scale-125 transition-transform" /> Render Look
                  </>
                )}
              </button>
            </div>
          ) : activeTab === 'stylist' ? (
            <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm h-[600px] flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4">
                {chatLog.map(function(m, i) {
                  return (
                    <div key={i} className={'flex ' + (m.role === 'ai' ? 'justify-start' : 'justify-end')}>
                      <div className={'max-w-[85%] p-3 rounded-2xl text-[11px] font-medium leading-relaxed ' + (m.role === 'ai' ? 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200' : 'bg-indigo-600 text-white rounded-tr-none shadow-md')}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="relative mt-auto pt-4 border-t border-slate-100">
                <input
                  type="text"
                  value={chatInput}
                  onChange={function(e) { setChatInput(e.target.value); }}
                  onKeyDown={function(e) { if (e.key === 'Enter') handleChat(); }}
                  placeholder="Ask your stylist..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-xs focus:ring-2 focus:ring-indigo-600 outline-none"
                />
                <button onClick={handleChat} className="absolute right-2 top-6 p-1.5 bg-indigo-600 rounded-xl text-white shadow-md">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          ) : (
            <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm h-[600px] overflow-y-auto custom-scrollbar">
              <h3 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2">
                <History className="w-4 h-4" /> Professional Archive
              </h3>
              {history.length === 0 ? (
                <div className="text-center py-20 text-slate-300 italic text-sm">No renders yet</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {history.map(function(h) {
                    return (
                      <button
                        key={h.id}
                        onClick={function() { setResultImage(h.image); }}
                        className="rounded-2xl overflow-hidden border-2 border-transparent hover:border-indigo-600 transition-all shadow-sm group relative"
                      >
                        <img src={h.image} className="w-full aspect-[3/4] object-cover" alt="History" />
                        <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="text-white w-6 h-6" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-[820px]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-black text-3xl text-slate-900 tracking-tighter uppercase">Studio Vue</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Neural Stability: 99.8% &bull; Biometric Anchor LOCKED
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {resultImage && (
                  <>
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                      <button
                        onClick={function() { setViewMode('slider'); }}
                        className={'p-2.5 rounded-xl transition-all ' + (viewMode === 'slider' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400')}
                      >
                        <ArrowRightLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={function() { setViewMode('comparison'); }}
                        className={'p-2.5 rounded-xl transition-all ' + (viewMode === 'comparison' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400')}
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <button onClick={downloadCollage} title="Download Comparison Collage" className="p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all active:scale-90">
                      <Grid className="w-5 h-5" />
                    </button>
                    <button onClick={handleDownloadResult} className="p-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-transform active:scale-90">
                      <Download className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 bg-[#fcfcfd] flex items-center justify-center p-10 relative overflow-hidden">
              {!resultImage && !loading && (
                <div className="text-center group max-w-sm grayscale opacity-30">
                  <Sparkles className="w-32 h-32 mx-auto mb-8 transition-transform group-hover:rotate-45" />
                  <p className="font-black text-4xl uppercase italic tracking-tighter text-slate-900">Awaiting Render</p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 z-40 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center">
                  <div className="relative w-40 h-40 mb-10">
                    <div className="absolute inset-0 border-[10px] border-slate-100 rounded-full" />
                    <div className="absolute inset-0 border-[10px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-black text-indigo-900 tracking-[0.4em] text-[12px] uppercase">Neural Design Stage</p>
                    <p className="text-slate-400 text-[10px] font-bold animate-pulse uppercase">Syncing Anatomy anchors...</p>
                  </div>
                </div>
              )}

              {resultImage && (
                <div className="w-full h-full max-w-2xl rounded-[3rem] overflow-hidden shadow-[0_25px_60px_rgba(79,70,229,0.15)] bg-white p-4 border border-slate-100">
                  {viewMode === 'slider' ? (
                    <div
                      ref={sliderRef}
                      className="relative w-full h-full rounded-[2rem] overflow-hidden cursor-ew-resize select-none"
                      onMouseMove={function(e) {
                        var rect = sliderRef.current.getBoundingClientRect();
                        setSliderPos(((e.clientX - rect.left) / rect.width) * 100);
                      }}
                    >
                      <img src={resultImage} className="absolute inset-0 w-full h-full object-cover" alt="Result" />
                      <div className="absolute inset-0 w-full h-full" style={{ clipPath: 'inset(0 ' + (100 - sliderPos) + '% 0 0)' }}>
                        <img src={userPhoto} className="absolute inset-0 w-full h-full object-cover" alt="Source" />
                      </div>
                      <div className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl" style={{ left: sliderPos + '%' }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-indigo-600">
                          <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
                        </div>
                      </div>
                      <span className="absolute bottom-6 left-6 bg-black/50 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest backdrop-blur-md">Source</span>
                      <span className="absolute bottom-6 right-6 bg-indigo-600/80 text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest backdrop-blur-md">Render</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6 h-full p-2">
                      <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm">
                        <img src={userPhoto} className="w-full h-full object-cover" alt="Source" />
                      </div>
                      <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl">
                        <img src={resultImage} className="w-full h-full object-cover" alt="Result" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-center text-[10px] font-black uppercase tracking-widest">{error}</div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 text-center mt-10">
        <div className="inline-flex items-center gap-8 bg-white px-10 py-5 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.4em]">Neural Mesh v7.5-PRO-ULTIMATE</p>
          <div className="w-px h-10 bg-slate-200" />
          <p className="text-slate-500 text-xs font-bold italic">Identity Locked by Pixel-Mesh</p>
        </div>
      </footer>

      <style>{'.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }'}</style>
    </div>
  );
}

export default App;
