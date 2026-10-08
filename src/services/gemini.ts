import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CrosswordItem {
  word: string;
  hint: string;
  row: number;
  col: number;
  isVertical: boolean;
  isKeyword?: boolean;
}

export interface CrosswordData {
  title: string;
  keyword: string;
  items: CrosswordItem[];
}

export async function analyzeImages(images: { base64: string; mimeType: string }[]) {
  const prompt = `Bạn là một chuyên gia Hóa học THPT. Hãy phân tích các hình ảnh này (có thể là các trang sách giáo khoa, sơ đồ phản ứng, hoặc bảng số liệu).
  1. Tổng hợp và trích xuất các kiến thức chính từ TẤT CẢ các ảnh (khái niệm, phản ứng, hiện tượng).
  2. Đề xuất một PROMPT chi tiết để tạo trò chơi ô chữ dựa trên toàn bộ kiến thức đã trích xuất.
  Trả về kết quả bằng tiếng Việt.`;

  const contents = [
    {
      parts: [
        ...images.map(img => ({
          inlineData: { data: img.base64, mimeType: img.mimeType }
        })),
        { text: prompt }
      ]
    }
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents
  });

  return response.text;
}

export async function generateCrossword(prompt: string, grade: string, type: string, orientation: 'vertical' | 'horizontal'): Promise<CrosswordData> {
  const isVerticalKeyword = orientation === 'vertical';
  
  const systemInstruction = `Bạn là chuyên gia thiết kế trò chơi ô chữ Hóa học THPT.
  Nhiệm vụ của bạn là tạo một trò chơi ô chữ ${isVerticalKeyword ? 'với TỪ KHÓA DỌC' : 'với TỪ KHÓA HÀNG NGANG'} CHÍNH XÁC theo quy trình sau:

  1. Xử lý từ khóa:
     - Chọn một từ khóa (Keyword) liên quan đến chủ đề Hóa học lớp ${grade}.
     - Chuyển từ khóa sang CHỮ IN HOA, KHÔNG DẤU.
     - Đếm số chữ cái của từ khóa → gọi là N.

  2. Cấu trúc ô chữ:
     ${isVerticalKeyword ? `
     - Tạo N hàng ngang (mỗi hàng 1 từ).
     - Từ khóa đặt theo chiều dọc (isVertical: true) ở cột giữa (index 5 hoặc 6).
     - Mỗi hàng ngang phải chứa đúng 1 chữ cái tương ứng của từ khóa.
     ` : `
     - Tạo N cột dọc (mỗi cột 1 từ).
     - Từ khóa đặt theo chiều ngang (isVertical: false) ở hàng giữa (index 5 hoặc 6).
     - Mỗi cột dọc phải chứa đúng 1 chữ cái tương ứng của từ khóa.
     `}

  3. Quy tắc giao cắt:
     ${isVerticalKeyword ? `
     - Hàng 1 chứa chữ cái thứ 1 của từ khóa.
     - Hàng 2 chứa chữ cái thứ 2.
     - ...
     - Hàng N chứa chữ cái thứ N.
     ` : `
     - Cột 1 chứa chữ cái thứ 1 của từ khóa.
     - Cột 2 chứa chữ cái thứ 2.
     - ...
     - Cột N chứa chữ cái thứ N.
     `}

  4. Nội dung:
     - Các từ hàng ngang/dọc liên quan đến chủ đề Hóa học lớp ${grade}, loại: ${type}.
     - Mỗi câu hỏi chỉ có 1 đáp án duy nhất.

  5. Trình bày & Thứ tự danh sách items (RẤT QUAN TRỌNG):
     - Dạng bảng (ma trận 12x12).
     - Các ô thẳng hàng, chữ IN HOA, KHÔNG DẤU.
     - Thứ tự trong mảng items:
       + Phần tử đầu tiên (index 0): BẮT BUỘC là TỪ KHÓA CHÍNH (isKeyword: true).
       + Phần tử thứ hai (index 1): BẮT BUỘC là ${isVerticalKeyword ? 'HÀNG NGANG 1' : 'HÀNG DỌC 1'} (cắt qua chữ cái thứ 1 của từ khóa).
       + Phần tử thứ ba (index 2): BẮT BUỘC là ${isVerticalKeyword ? 'HÀNG NGANG 2' : 'HÀNG DỌC 2'} (cắt qua chữ cái thứ 2 của từ khóa).
       + ...
       + Phần tử thứ N+1: BẮT BUỘC là ${isVerticalKeyword ? 'HÀNG NGANG N' : 'HÀNG DỌC N'} (cắt qua chữ cái thứ N của từ khóa).
     - Số lượng câu hỏi giao cắt PHẢI chính xác bằng số chữ cái N của từ khóa. Ví dụ: từ khóa 8 chữ cái thì có đúng 8 hàng ngang (từ Hàng ngang 1 đến Hàng ngang 8).

  6. Bắt buộc:
     - Không được thay đổi từ khóa.
     - Không sai số hàng/cột (phải đúng N từ cắt qua, bắt đầu từ 1 đến N).
     - Không bỏ qua giao cắt.

  7. Nếu kết quả chưa đúng:
     - Tự động kiểm tra và tạo lại cho đến khi đúng hoàn toàn.

  Trả về JSON theo cấu trúc:
  {
    "title": "Tên chủ đề",
    "keyword": "TỪ KHÓA",
    "items": [
      {
        "word": "DÁP ÁN",
        "hint": "Gợi ý",
        "row": number,
        "col": number,
        "isVertical": boolean,
        "isKeyword": boolean
      }
    ]
  }
  Lưu ý: Mảng items gồm 1 từ khóa chính (isKeyword: true) ở đầu và đúng N từ cắt qua nó.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          keyword: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                hint: { type: Type.STRING },
                row: { type: Type.INTEGER },
                col: { type: Type.INTEGER },
                isVertical: { type: Type.BOOLEAN },
                isKeyword: { type: Type.BOOLEAN }
              },
              required: ["word", "hint", "row", "col", "isVertical", "isKeyword"]
            }
          }
        },
        required: ["title", "keyword", "items"]
      }
    }
  });

  const parsed: CrosswordData = JSON.parse(response.text);

  // Chuẩn hóa và làm sạch dữ liệu
  const cleanKeyword = parsed.keyword
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  parsed.keyword = cleanKeyword;

  // Đảm bảo có đúng 1 keyword item và các items còn lại được gán isKeyword chính xác
  let hasKeywordItem = false;
  parsed.items = parsed.items.map(item => {
    const cleanWord = item.word
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();

    const isKw = item.isKeyword || cleanWord === cleanKeyword;
    if (isKw && !hasKeywordItem) {
      hasKeywordItem = true;
      return { ...item, word: cleanWord, isKeyword: true };
    }
    return { ...item, word: cleanWord, isKeyword: false };
  });

  return parsed;
}
