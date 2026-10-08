import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, CheckCircle2, XCircle, HelpCircle, Eye, Trophy, Sparkles, KeyRound } from 'lucide-react';
import { CrosswordData, CrosswordItem } from '../services/gemini';

interface CrosswordGameProps {
  data: CrosswordData;
  soundEnabled: boolean;
  onReset: () => void;
}

// Hàm chuẩn hóa tiếng Việt: xóa dấu, ký tự thừa, in hoa
function normalizeText(text: string): string {
  return (text || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

export default function CrosswordGame({ data, soundEnabled, onReset }: CrosswordGameProps) {
  const [grid, setGrid] = useState<string[][]>(Array(12).fill(null).map(() => Array(12).fill('')));
  const [userAnswers, setUserAnswers] = useState<string[]>(data.items.map(() => ''));
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; isCorrect: boolean } | null>(null);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [solvedItems, setSolvedItems] = useState<Set<number>>(new Set());

  const audioContextRef = useRef<AudioContext | null>(null);

  // Phân loại danh sách items để đánh số CHÍNH XÁC
  const horizontalClues = data.items.filter(it => !it.isKeyword && !it.isVertical);
  const verticalClues = data.items.filter(it => !it.isKeyword && it.isVertical);
  const keywordItem = data.items.find(it => it.isKeyword);

  // Đếm số chữ cái chìa khóa đã được mở
  const revealedKeywordLettersCount = keywordItem ? (() => {
    let count = 0;
    const cleanKw = normalizeText(keywordItem.word);
    for (let i = 0; i < cleanKw.length; i++) {
      const r = keywordItem.isVertical ? keywordItem.row + i : keywordItem.row;
      const c = keywordItem.isVertical ? keywordItem.col : keywordItem.col + i;
      if (revealedCells.has(`${r}-${c}`)) count++;
    }
    return count;
  })() : 0;

  // Lấy thông tin nhãn & số thứ tự chính xác cho từng câu hỏi
  const getItemInfo = (item: CrosswordItem) => {
    if (item.isKeyword) {
      return {
        badge: item.isVertical ? 'TỪ KHÓA CHÍNH (DỌC)' : 'TỪ KHÓA CHÍNH (NGANG)',
        badgeColor: 'bg-amber-500 text-white shadow-sm shadow-amber-200 ring-1 ring-amber-300',
        label: 'TỪ KHÓA CHÍNH',
        subLabel: 'Từ khóa chủ đề',
        symbol: '★',
        length: item.word.length,
        isKeyword: true
      };
    }

    if (!item.isVertical) {
      const hIndex = horizontalClues.indexOf(item);
      const rowNum = hIndex + 1; // Luôn bắt đầu từ Hàng ngang 1, 2, 3...
      return {
        badge: `Hàng ngang ${rowNum}`,
        badgeColor: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
        label: `Hàng ngang ${rowNum}`,
        subLabel: `Câu hỏi số ${rowNum}`,
        symbol: `${rowNum}`,
        length: item.word.length,
        isKeyword: false
      };
    } else {
      const vIndex = verticalClues.indexOf(item);
      const colNum = vIndex + 1; // Luôn bắt đầu từ Hàng dọc 1, 2, 3...
      return {
        badge: `Hàng dọc ${colNum}`,
        badgeColor: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        label: `Hàng dọc ${colNum}`,
        subLabel: `Câu hỏi số ${colNum}`,
        symbol: `${colNum}`,
        length: item.word.length,
        isKeyword: false
      };
    }
  };

  const playSound = (type: 'correct' | 'wrong') => {
    if (!soundEnabled) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime); // A2
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.2); // A1
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newGrid = [...grid];
    newGrid[rowIndex][colIndex] = value.toUpperCase().slice(-1);
    setGrid(newGrid);
  };

  const revealItem = (index: number) => {
    const item = data.items[index];
    const cleanWord = normalizeText(item.word);
    
    const newRevealed = new Set(revealedCells);
    const newGrid = [...grid];

    for (let i = 0; i < cleanWord.length; i++) {
      const r = item.isVertical ? item.row + i : item.row;
      const c = item.isVertical ? item.col : item.col + i;
      newRevealed.add(`${r}-${c}`);
      newGrid[r][c] = cleanWord[i];
    }

    setRevealedCells(newRevealed);
    setGrid(newGrid);

    const newSolved = new Set(solvedItems);
    newSolved.add(index);
    setSolvedItems(newSolved);

    const newAnswers = [...userAnswers];
    newAnswers[index] = cleanWord;
    setUserAnswers(newAnswers);

    playSound('correct');
    setFeedback({ message: `Đã mở đáp án: ${cleanWord}`, isCorrect: true });
    setTimeout(() => setFeedback(null), 2500);
  };

  const checkAnswer = (index: number) => {
    const item = data.items[index];
    const userAnswerNormalized = normalizeText(userAnswers[index] || '');
    const correctAnswerNormalized = normalizeText(item.word);
    const isCorrect = userAnswerNormalized === correctAnswerNormalized;

    if (isCorrect) {
      playSound('correct');
      setFeedback({ message: "Chính xác! Rất tốt!", isCorrect: true });
      
      // Reveal cells in grid
      const newRevealed = new Set(revealedCells);
      const newGrid = [...grid];
      for (let i = 0; i < correctAnswerNormalized.length; i++) {
        const r = item.isVertical ? item.row + i : item.row;
        const c = item.isVertical ? item.col : item.col + i;
        newRevealed.add(`${r}-${c}`);
        newGrid[r][c] = correctAnswerNormalized[i];
      }
      setRevealedCells(newRevealed);
      setGrid(newGrid);

      const newSolved = new Set(solvedItems);
      newSolved.add(index);
      setSolvedItems(newSolved);
    } else {
      playSound('wrong');
      setFeedback({ message: "Chưa đúng, thử lại nhé!", isCorrect: false });
    }

    setTimeout(() => setFeedback(null), 2000);
  };

  const isCellInItem = (r: number, c: number, item: CrosswordItem) => {
    const len = item.word.length;
    if (item.isVertical) {
      return c === item.col && r >= item.row && r < item.row + len;
    } else {
      return r === item.row && c >= item.col && c < item.col + len;
    }
  };

  const getActiveItemsForCell = (r: number, c: number) => {
    return data.items.filter(item => isCellInItem(r, c, item));
  };

  const isAllSolved = solvedItems.size === data.items.length && data.items.length > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-7xl mx-auto p-4">
      {/* Cột trái: Bảng ô chữ */}
      <div className="bg-white p-6 rounded-3xl shadow-xl border border-indigo-100 flex-shrink-0 w-full lg:w-auto">
        {/* Tiêu đề & Thông số */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Ma trận ô chữ (12 × 12)</h3>
            <p className="text-xs text-gray-500 font-medium">
              Gồm 1 từ khóa chính & {horizontalClues.length} câu hỏi hàng ngang (Hàng 1 → Hàng {horizontalClues.length})
            </p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
            <Trophy size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700">
              {solvedItems.size}/{data.items.length} Hoàn thành
            </span>
          </div>
        </div>

        {/* Thanh theo dõi chữ cái chìa khóa được hé lộ */}
        {keywordItem && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 rounded-2xl border-2 border-amber-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shadow-amber-200">
                <KeyRound size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase text-amber-900 tracking-wider">Từ khóa chìa khóa</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    Đã mở {revealedKeywordLettersCount}/{keywordItem.word.length} chữ cái
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 font-medium">
                  Chữ cái chìa khóa sẽ tự động tô màu <strong className="text-amber-900">VÀNG KIM NỔI BẬT</strong> trên ma trận
                </p>
              </div>
            </div>
            
            {/* Dãy chữ cái chìa khóa hé lộ từng bước */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
              {normalizeText(keywordItem.word).split('').map((char, i) => {
                const r = keywordItem.isVertical ? keywordItem.row + i : keywordItem.row;
                const c = keywordItem.isVertical ? keywordItem.col : keywordItem.col + i;
                const isLetterRevealed = revealedCells.has(`${r}-${c}`);
                return (
                  <div 
                    key={i}
                    title={isLetterRevealed ? `Chữ cái thứ ${i + 1}: ${char}` : `Chữ cái thứ ${i + 1} (chưa mở)`}
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg font-black text-xs sm:text-sm transition-all duration-300 select-none
                      ${isLetterRevealed 
                        ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-400 text-amber-950 border-2 border-amber-500 shadow-sm scale-105' 
                        : 'bg-white/90 text-gray-400 border border-dashed border-amber-300'}
                    `}
                  >
                    {isLetterRevealed ? char : '?'}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lưới ô chữ 12x12 */}
        <div className="grid grid-cols-12 gap-1 bg-slate-50 p-3 rounded-2xl border-2 border-indigo-100 max-w-fit mx-auto">
          {Array(12).fill(null).map((_, r) => (
            Array(12).fill(null).map((_, c) => {
              const activeItems = getActiveItemsForCell(r, c);
              const isActive = activeItems.length > 0;
              const isSelected = selectedItemIndex !== null && isCellInItem(r, c, data.items[selectedItemIndex]);
              const isKeyword = activeItems.some(item => item.isKeyword);
              const isRevealed = revealedCells.has(`${r}-${c}`);
              
              // Tìm item bắt đầu tại ô này để hiển thị số thứ tự nhỏ ở góc
              const startItem = data.items.find(item => item.row === r && item.col === c);
              const startInfo = startItem ? getItemInfo(startItem) : null;

              // Định nghĩa màu sắc phân biệt rõ ràng: Ô chìa khóa vs Ô hàng ngang thông thường
              let cellClass = 'bg-transparent border border-transparent';
              let inputClass = 'text-gray-800';

              if (isActive) {
                if (isSelected) {
                  // Đang được chọn
                  cellClass = isKeyword
                    ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-amber-400 scale-105 z-20 border-2 border-amber-300'
                    : 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400 scale-105 z-20 border border-indigo-400';
                  inputClass = 'text-white font-black';
                } else if (isRevealed) {
                  // ĐÃ GIẢI RA:
                  if (isKeyword) {
                    // CHỮ CÁI CHÌA KHÓA: Tô màu VÀNG KIM NỔI BẬT khác hoàn toàn với các ô hàng khác
                    cellClass = 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-400 text-amber-950 border-2 border-amber-500 shadow-md ring-2 ring-amber-300/80 font-black scale-[1.02] z-10';
                    inputClass = 'text-amber-950 font-black';
                  } else {
                    // Ô HÀNG KHÁC THÔNG THƯỜNG: Màu xanh lá mát dịu
                    cellClass = 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300 shadow-sm font-extrabold';
                    inputClass = 'text-emerald-900 font-extrabold';
                  }
                } else {
                  // CHƯA GIẢI RA:
                  if (isKeyword) {
                    // Cột/hàng chìa khóa chưa giải: nền vàng nhạt, viền cam nét đứt để nhận biết
                    cellClass = 'bg-amber-50/80 text-amber-900 border-2 border-dashed border-amber-300 shadow-sm';
                    inputClass = 'text-amber-900 font-bold';
                  } else {
                    // Ô bình thường chưa giải: nền trắng, viền xám
                    cellClass = 'bg-white text-gray-800 border border-slate-200 shadow-sm';
                    inputClass = 'text-gray-800 font-bold';
                  }
                }
              }

              return (
                <div 
                  key={`${r}-${c}`}
                  className={`relative w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center text-sm sm:text-base rounded-lg transition-all duration-200 select-none
                    ${cellClass}
                  `}
                >
                  {/* Nhãn số thứ tự ở góc ô đầu tiên */}
                  {startInfo && (
                    <span className={`absolute top-0.5 left-1 text-[8px] sm:text-[9px] font-mono font-bold leading-none pointer-events-none
                      ${isSelected ? 'text-indigo-200' : startInfo.isKeyword ? 'text-amber-700' : 'text-indigo-500'}
                    `}>
                      {startInfo.symbol}
                    </span>
                  )}

                  {/* Ngôi sao nhỏ ở góc ô chữ cái chìa khóa khi đã giải */}
                  {isKeyword && isRevealed && !isSelected && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-white shadow-sm pointer-events-none">
                      ★
                    </span>
                  )}

                  {isActive ? (
                    <input
                      type="text"
                      value={grid[r][c]}
                      onChange={(e) => handleCellChange(r, c, e.target.value)}
                      className={`w-full h-full bg-transparent text-center outline-none uppercase
                        ${inputClass}
                      `}
                      maxLength={1}
                      onClick={() => {
                        const firstItem = activeItems[0];
                        const idx = data.items.indexOf(firstItem);
                        setSelectedItemIndex(idx);
                      }}
                    />
                  ) : null}
                </div>
              );
            })
          ))}
        </div>
        
        {/* Chú thích & Nút Reset */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap justify-between items-center gap-3">
          <button 
            onClick={onReset}
            className="flex items-center gap-2 px-3.5 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-semibold text-xs sm:text-sm border border-gray-200"
          >
            <RotateCcw size={16} />
            Tạo lại ô chữ
          </button>
          
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            {/* Chú thích chữ chìa khóa đã giải */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-500 text-[8px] font-black text-amber-950 flex items-center justify-center shadow-xs">
                ★
              </div>
              <span className="text-amber-900 font-bold">Chữ chìa khóa (Đã giải)</span>
            </div>

            {/* Chú thích ô thường đã giải */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-400"></div>
              <span className="text-emerald-800 font-medium">Ô hàng khác (Đã giải)</span>
            </div>

            {/* Chú thích cột chìa khóa chưa giải */}
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-amber-50 border border-dashed border-amber-300"></div>
              <span className="text-gray-500 font-medium">Cột chìa khóa (Chưa giải)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cột phải: Danh sách câu hỏi & Nhập đáp án */}
      <div className="flex-1 w-full min-w-0 space-y-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="text-indigo-600" />
                {data.title || "Câu hỏi ô chữ Hóa học"}
              </h2>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                Chọn từng hàng để đọc gợi ý, nhập đáp án hoặc mở ô chữ
              </p>
            </div>
          </div>

          {/* Banner chúc mừng nếu giải hết */}
          {isAllSolved && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center gap-3 shadow-lg"
            >
              <Sparkles size={24} className="text-yellow-300" />
              <div>
                <p className="font-bold text-base">Chúc mừng! Bạn đã hoàn thành toàn bộ ô chữ!</p>
                <p className="text-xs text-emerald-100">Từ khóa chính: <strong className="text-yellow-200">{data.keyword}</strong></p>
              </div>
            </motion.div>
          )}
          
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-2 custom-scrollbar">
            {data.items.map((item, idx) => {
              const info = getItemInfo(item);
              const isSolved = solvedItems.has(idx);
              const isSelected = selectedItemIndex === idx;

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedItemIndex(idx)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-md ring-1 ring-indigo-200' 
                      : isSolved
                        ? (item.isKeyword ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-50/80' : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70')
                        : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50/80'}
                  `}
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Hàng 1: Huy hiệu nhãn hàng, số chữ cái, trạng thái đã giải */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase ${info.badgeColor}`}>
                          {info.badge}
                        </span>

                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {info.length} chữ cái
                        </span>
                      </div>

                      {isSolved && (
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md
                          ${item.isKeyword ? 'text-amber-800 bg-amber-100 border border-amber-300' : 'text-emerald-700 bg-emerald-100 border border-emerald-300'}
                        `}>
                          <CheckCircle2 size={13} />
                          Đã giải: {item.word}
                        </span>
                      )}
                    </div>

                    {/* Hàng 2: Nội dung câu hỏi trải dài toàn bộ theo chiều ngang bình thường */}
                    <p className="text-gray-800 font-medium text-sm sm:text-base leading-relaxed w-full">
                      {item.hint}
                    </p>

                    {/* Hàng 3: Khung nhập đáp án nằm ngang bên dưới khi được chọn */}
                    {isSelected && (
                      <div 
                        className="mt-2 pt-3 border-t border-indigo-100 flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input 
                          type="text"
                          placeholder="Nhập đáp án tại đây..."
                          value={userAnswers[idx]}
                          onChange={(e) => {
                            const newAnswers = [...userAnswers];
                            newAnswers[idx] = e.target.value;
                            setUserAnswers(newAnswers);
                          }}
                          className="flex-1 min-w-[200px] px-3.5 py-2.5 border-2 border-indigo-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 uppercase text-sm font-bold bg-white text-gray-900 shadow-sm"
                          onKeyDown={(e) => e.key === 'Enter' && checkAnswer(idx)}
                          autoFocus
                        />
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button 
                            onClick={() => checkAnswer(idx)}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                          >
                            Trả lời
                          </button>
                          <button 
                            onClick={() => revealItem(idx)}
                            title="Mở đáp án hàng này"
                            className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-xl border border-gray-200 transition-colors"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Thông báo kết quả âm thanh / phản hồi */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border-2
                ${feedback.isCorrect 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                  : 'bg-rose-50 border-rose-300 text-rose-800'}
              `}
            >
              {feedback.isCorrect ? <CheckCircle2 size={22} className="text-emerald-600" /> : <XCircle size={22} className="text-rose-600" />}
              <span className="text-base font-bold">{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
