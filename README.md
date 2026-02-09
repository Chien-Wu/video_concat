# Video Generator Server

自動影片生成伺服器 - 使用 8 張圖片 + 文字生成帶有 AI 語音和精準字幕同步的垂直影片。

## 功能特色

- ✅ **精準字幕同步**：使用 ElevenLabs character-level timestamps 實現逐句字幕
- ✅ **智能分段算法**：根據停頓、標點、長度自動斷句
- ✅ **穩定渲染**：圖片先下載到本地，避免網路問題
- ✅ **並發控制**：支援 2-3 個任務同時處理
- ✅ **自動清理**：影片 24 小時後自動刪除
- ✅ **易於自訂**：轉場效果、字幕樣式可在 config 修改

## 技術架構

```
輸入: 8 張圖片 URL + 文字
  ↓
ElevenLabs TTS (語音 + timestamps)
  ↓
智能字幕分段
  ↓
下載圖片到本地
  ↓
Remotion 渲染 (1080x1920, 30fps)
  ↓
輸出: 公開可訪問的影片 URL
```

## 安裝

### 1. 系統需求

- Node.js >= 18
- FFmpeg (Remotion 需要)

#### macOS
```bash
brew install ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg fonts-noto-cjk
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

複製 `.env.example` 為 `.env` 並填入你的 API keys：

```bash
cp .env.example .env
```

編輯 `.env`：
```bash
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
PORT=3000
PUBLIC_URL=http://localhost:3000
MAX_CONCURRENT_JOBS=2
VIDEO_RETENTION_HOURS=24
```

## 使用方式

### 啟動伺服器

```bash
npm start
```

或開發模式（自動重啟）：
```bash
npm run dev
```

### API 端點

#### 1. 生成影片

```bash
POST /api/generate
Content-Type: application/json

{
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
    "https://example.com/image4.jpg",
    "https://example.com/image5.jpg",
    "https://example.com/image6.jpg",
    "https://example.com/image7.jpg",
    "https://example.com/image8.jpg"
  ],
  "text": "這是要轉成語音的文字。會自動生成語音並同步字幕。"
}
```

**回應**：
```json
{
  "jobId": "abc123-def456-...",
  "status": "processing",
  "message": "Video generation started",
  "statusUrl": "/api/status/abc123-def456-..."
}
```

#### 2. 查詢進度

```bash
GET /api/status/:jobId
```

**回應**（處理中）：
```json
{
  "jobId": "abc123-...",
  "status": "processing",
  "progress": 65,
  "stage": "rendering",
  "estimatedTimeRemaining": 120
}
```

**回應**（完成）：
```json
{
  "jobId": "abc123-...",
  "status": "completed",
  "progress": 100,
  "videoUrl": "http://localhost:3000/videos/abc123-....mp4",
  "duration": 42.5,
  "expiresAt": "2026-02-10T15:30:00Z"
}
```

#### 3. 下載影片

```bash
GET /videos/:jobId.mp4
```

直接瀏覽器訪問或下載。

## 自訂設定

所有可自訂參數都在 `src/config/constants.js`：

```javascript
// 轉場效果
TRANSITION: {
  TYPE: 'fade',  // 'fade' | 'slide' | 'zoom' | 'spring'
  DURATION_FRAMES: 10
}

// 字幕樣式
SUBTITLE: {
  FONT_SIZE: 60,
  COLOR: '#FFFFFF',
  STROKE_COLOR: '#000000',
  STROKE_WIDTH: 2,
  POSITION: 'bottom',  // 'top' | 'center' | 'bottom'
  MARGIN_BOTTOM: 200
}
```

修改後重啟伺服器即可生效。

## 測試範例

使用 curl 測試：

```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "images": [
      "https://picsum.photos/1080/1920?random=1",
      "https://picsum.photos/1080/1920?random=2",
      "https://picsum.photos/1080/1920?random=3",
      "https://picsum.photos/1080/1920?random=4",
      "https://picsum.photos/1080/1920?random=5",
      "https://picsum.photos/1080/1920?random=6",
      "https://picsum.photos/1080/1920?random=7",
      "https://picsum.photos/1080/1920?random=8"
    ],
    "text": "這是測試文字。會被轉成語音。"
  }'
```

## 部署到 VPS

### 1. 準備 VPS

- 4 vCPU, 8GB RAM
- Ubuntu 20.04+
- 安裝 Node.js 18+ 和 FFmpeg

### 2. 上傳專案

```bash
git clone <your-repo>
cd video-generator
npm install
```

### 3. 設定環境變數

```bash
nano .env
# 設定 PUBLIC_URL 為你的 VPS IP 或域名
PUBLIC_URL=http://your-vps-ip:3000
```

### 4. 使用 PM2 運行

```bash
npm install -g pm2
pm2 start src/server.js --name video-generator
pm2 save
pm2 startup
```

### 5. 設定 Nginx (可選)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /videos {
        alias /path/to/video-generator/public/videos;
        expires 24h;
    }
}
```

## 故障排除

### 字幕顯示豆腐塊
安裝中文字體：
```bash
sudo apt install fonts-noto-cjk
```

### Remotion 渲染失敗
確認 FFmpeg 已安裝：
```bash
ffmpeg -version
```

### ElevenLabs API 錯誤
檢查 API key 和 Voice ID 是否正確。

## 專案結構

```
video-generator/
├── src/
│   ├── server.js              # API 伺服器
│   ├── config/
│   │   └── constants.js       # 可自訂設定
│   ├── services/
│   │   ├── elevenlabs.js      # TTS 整合
│   │   ├── imageDownloader.js # 圖片下載
│   │   ├── renderer.js        # Remotion 渲染
│   │   └── storage.js         # 檔案管理
│   ├── queue/
│   │   └── simpleQueue.js     # 任務佇列
│   ├── utils/
│   │   ├── alignment.js       # 字幕分段
│   │   └── validation.js      # 輸入驗證
│   └── remotion/
│       ├── Root.jsx           # Remotion 入口
│       ├── Video.jsx          # 影片組件
│       ├── ImageSlide.jsx     # 圖片組件
│       ├── Subtitle.jsx       # 字幕組件
│       └── transitions.js     # 轉場效果
└── public/
    └── videos/                # 生成的影片
```

## License

MIT
