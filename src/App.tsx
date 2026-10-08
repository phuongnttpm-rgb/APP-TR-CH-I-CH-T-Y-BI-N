import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Settings2, 
  Volume2, 
  VolumeX, 
  GraduationCap, 
  Layers, 
  Play, 
  RefreshCw,
  Search,
  BookOpen,
  Music
} from 'lucide-react';
import ImageInput from './components/ImageInput';
import CrosswordGame from './components/CrosswordGame';
import { analyzeImages, generateCrossword, CrosswordData } from './services/gemini';

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [crosswordData, setCrosswordData] = useState<CrosswordData | null>(null);
  
  // Settings
  const [type, setType] = useState('Ô chữ truyền thống');
  const [rounds, setRounds] = useState('1 vòng');
  const [grade, setGrade] = useState('10');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);

  const handleImagesSelected = async (images: { base64: string; mimeType: string }[]) => {
    setIsLoading(true);
    try {
      const suggestedPrompt = await analyzeImages(images);
      if (suggestedPrompt) setPrompt(suggestedPrompt);
    } catch (error) {
      console.error("Error analyzing images:", error);
      alert("Có lỗi xảy ra khi phân tích ảnh. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (orientation: 'vertical' | 'horizontal') => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const data = await generateCrossword(prompt, grade, type, orientation);
      setCrosswordData(data);
    } catch (error) {
      console.error("Error generating crossword:", error);
      alert("Có lỗi xảy ra khi tạo ô chữ. Vui lòng kiểm tra prompt và thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  const testSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">ỨNG DỤNG HAY</h1>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">Trò chơi ô chữ Hóa học</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition-all ${soundEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button 
              onClick={testSound}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-sm font-bold"
            >
              <Music size={16} />
              Test âm thanh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {!crosswordData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Input & Prompt */}
            <div className="lg:col-span-8 space-y-6">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-bold">1. Nhập liệu học liệu</h2>
                </div>
                <ImageInput onImagesSelected={handleImagesSelected} isLoading={isLoading} />
              </section>

              <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-bold">2. Tinh chỉnh nội dung (Prompt)</h2>
                </div>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="AI sẽ tự động sinh prompt sau khi phân tích ảnh, hoặc bạn có thể tự nhập kiến thức tại đây..."
                  className="w-full h-48 p-4 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none font-medium text-gray-700 leading-relaxed"
                />
              </section>
            </div>

            {/* Right Column: Settings */}
            <div className="lg:col-span-4 space-y-6">
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 sticky top-24">
                <div className="flex items-center gap-2 mb-6">
                  <Settings2 className="text-indigo-600" size={20} />
                  <h2 className="text-lg font-bold">3. Cấu hình trò chơi</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Loại ô chữ</label>
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 font-medium"
                    >
                      <option>Ô chữ truyền thống</option>
                      <option>Ô chữ hàng ngang</option>
                      <option>Ô chữ hình khối</option>
                      <option>Ô chữ logic</option>
                      <option>Ô chữ số</option>
                      <option>Ô chữ hình ảnh / hiện tượng</option>
                      <option>Ô chữ STEM</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Số vòng chơi</label>
                      <select 
                        value={rounds}
                        onChange={(e) => setRounds(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 font-medium"
                      >
                        <option>1 vòng</option>
                        <option>2 vòng</option>
                        <option>3 vòng</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Khối lớp</label>
                      <select 
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 font-medium"
                      >
                        <option value="10">Lớp 10</option>
                        <option value="11">Lớp 11</option>
                        <option value="12">Lớp 12</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => handleGenerate('vertical')}
                      disabled={!prompt || isGenerating}
                      className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl
                        ${!prompt || isGenerating 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-95'}
                      `}
                    >
                      {isGenerating ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        <Play size={20} fill="currentColor" />
                      )}
                      Ô CHỮ HÀNG DỌC
                    </button>

                    <button 
                      onClick={() => handleGenerate('horizontal')}
                      disabled={!prompt || isGenerating}
                      className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl
                        ${!prompt || isGenerating 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-100 active:scale-95'}
                      `}
                    >
                      {isGenerating ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        <Play size={20} fill="currentColor" />
                      )}
                      TỪ KHÓA HÀNG NGANG
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{crosswordData.title}</h2>
                  <p className="text-sm text-gray-500">Chương trình GDPT 2018 • Hóa học lớp {grade}</p>
                </div>
              </div>
              <button 
                onClick={() => setCrosswordData(null)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-bold text-sm"
              >
                Quay lại chỉnh sửa
              </button>
            </div>

            <CrosswordGame 
              data={crosswordData} 
              soundEnabled={soundEnabled} 
              onReset={() => setCrosswordData(null)} 
            />
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Thiết kế bởi</p>
            <p className="text-gray-900 font-bold">AI Developer + Chuyên gia Hóa học</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-black text-indigo-600">100%</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chính xác</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-indigo-600">&lt;3s</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tốc độ</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-indigo-600">STEM</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Định hướng</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
