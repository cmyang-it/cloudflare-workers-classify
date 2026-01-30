export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      
      const CONFIG = {
        REQUIRE_TOKEN: env.REQUIRE_TOKEN === 'true' || false,
        API_TOKEN: env.API_TOKEN || 'your-secret-token-here'
      };
  
      if (url.pathname === '/' && request.method === 'GET') {
        const html = HTML_PAGE
          .replace(/{{REQUIRE_TOKEN}}/g, CONFIG.REQUIRE_TOKEN ? 'block' : 'none')
          .replace(/{{REQUIRE_TOKEN_JS}}/g, CONFIG.REQUIRE_TOKEN ? 'true' : 'false');
        
        return new Response(html, {
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }
      
      if (url.pathname === '/api/identify' && request.method === 'POST') {
        return handleImageRecognition(request, env, CONFIG);
      }
  
      return new Response('Not Found', { status: 404 });
    },
  };
  
  async function handleImageRecognition(request, env, config) {
    try {
      if (config.REQUIRE_TOKEN) {
        const authHeader = request.headers.get('Authorization');
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        
        let bodyToken = null;
        const contentType = request.headers.get('content-type') || '';
        
        if (contentType.includes('multipart/form-data')) {
          const clonedRequest = request.clone();
          const formData = await clonedRequest.formData();
          bodyToken = formData.get('token');
        } else if (contentType.includes('application/json')) {
          const clonedRequest = request.clone();
          const body = await clonedRequest.json();
          bodyToken = body.token;
        }
  
        const token = bearerToken || bodyToken;
        
        if (!token) {
          return new Response(JSON.stringify({
            success: false,
            error: '缺少访问令牌 (Token)'
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
  
        if (token !== config.API_TOKEN) {
          return new Response(JSON.stringify({
            success: false,
            error: '访问令牌无效'
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
  
      let imageBuffer;
      const contentType = request.headers.get('content-type') || '';
  
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('image');
        if (!file) throw new Error('请上传图片文件');
        if (file.size > 10 * 1024 * 1024) throw new Error('图片大小不能超过 10MB');
        imageBuffer = await file.arrayBuffer();
      } 
      else if (contentType.includes('application/json')) {
        const body = await request.json();
        let base64 = body.image || '';
        if (base64.includes(',')) base64 = base64.split(',')[1];
        if (!base64) throw new Error('Base64 数据为空');
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        imageBuffer = bytes.buffer;
      } 
      else {
        throw new Error('不支持的 Content-Type');
      }
  
      const inputs = { image: [...new Uint8Array(imageBuffer)] };
      const aiResponse = await env.AI.run('@cf/microsoft/resnet-50', inputs);
  
      return new Response(JSON.stringify({
        success: true,
        data: aiResponse,
        timestamp: new Date().toISOString()
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
  
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  
  const HTML_PAGE = `<!DOCTYPE html>
  <html lang="zh-CN">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AI 图像识别 - ResNet-50</title>
      <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 20px;
              padding-bottom: 50px;
              position: relative;
          }
  
          .container {
              width: 100%;
              max-width: 1000px;
              display: flex;
              flex-direction: column;
              align-items: center;
          }
  
          .header {
              text-align: center;
              margin-bottom: 25px;
              color: white;
          }
  
          h1 {
              font-size: 30px;
              margin-bottom: 6px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
  
          .subtitle {
              opacity: 0.9;
              font-size: 13px;
          }
  
          .main-layout {
              display: flex;
              gap: 24px;
              width: 100%;
              justify-content: center;
              margin-bottom: 20px;
          }
  
          .left-panel, .right-panel {
              width: 450px;
              height: 500px;
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              padding: 24px;
              display: flex;
              flex-direction: column;
          }
  
          .panel-title {
              font-size: 16px;
              font-weight: 600;
              color: #333;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #f0f0f0;
              display: flex;
              align-items: center;
              gap: 8px;
              flex-shrink: 0;
          }
  
          .token-section {
              background: linear-gradient(135deg, #f5f7ff 0%, #ffffff 100%);
              border-radius: 10px;
              margin-bottom: 16px;
              border: 1px solid #e0e0e0;
              flex-shrink: 0;
          }
  
          .token-input {
              width: 100%;
              padding: 10px 12px;
              border: 1px solid #ddd;
              border-radius: 6px;
              font-size: 14px;
              font-family: monospace;
              transition: all 0.3s;
              background: white;
          }
  
          .token-input:focus {
              outline: none;
              border-color: #667eea;
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
          }
  
          .token-input.error {
              border-color: #e74c3c;
              background: #fdf2f2;
          }
  
          .upload-wrapper {
              flex: 1;
              position: relative;
              overflow: hidden;
              min-height: 0;
          }
  
          .upload-area {
              border: 3px dashed #d0d0d0;
              border-radius: 12px;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              transition: all 0.3s;
              cursor: pointer;
              background: #fafafa;
          }
  
          .upload-area:hover, .upload-area.dragover {
              border-color: #667eea;
              background: #f5f7ff;
          }
  
          .upload-icon {
              font-size: 48px;
              margin-bottom: 16px;
              opacity: 0.5;
          }
  
          .upload-text {
              color: #555;
              font-size: 16px;
              font-weight: 500;
              margin-bottom: 8px;
          }
  
          .upload-hint {
              color: #999;
              font-size: 13px;
          }
  
          #fileInput { display: none; }
  
          .preview-container {
              display: none;
              flex-direction: column;
              height: 100%;
          }
  
          .preview-image-wrapper {
              flex: 1;
              background: #f8f9fa;
              border-radius: 12px;
              border: 1px solid #e0e0e0;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
              min-height: 0;
              margin-bottom: 12px;
          }
  
          .preview-image {
              max-width: 100%;
              max-height: 100%;
              width: auto;
              height: auto;
              object-fit: contain;
              display: block;
          }
  
          .button-group {
              display: flex;
              gap: 10px;
              flex-shrink: 0;
          }
  
          .btn {
              flex: 1;
              padding: 10px;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.3s;
              font-weight: 600;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              height: 40px;
          }
  
          .btn-primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          }
  
          .btn-primary:hover:not(:disabled) { 
              transform: translateY(-1px); 
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          
          .btn-primary:disabled { 
              opacity: 0.5; 
              cursor: not-allowed;
              background: #ccc;
              box-shadow: none;
          }
  
          .btn-secondary {
              background: #f0f0f0;
              color: #555;
          }
  
          .btn-secondary:hover { background: #e0e0e0; }
  
          .results-content {
              flex: 1;
              position: relative;
              overflow-y: auto;
          }
  
          .empty-state {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              color: #999;
              width: 100%;
              padding: 20px;
          }
  
          .empty-icon {
              font-size: 40px;
              margin-bottom: 12px;
              opacity: 0.4;
          }
  
          .empty-text {
              font-size: 15px;
          }
  
          .loading-state {
              display: none;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
          }
  
          .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #667eea;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto 12px;
          }
  
          @keyframes spin { 
              0% { transform: rotate(0deg); } 
              100% { transform: rotate(360deg); } 
          }
  
          .loading-text {
              color: #666;
              font-size: 14px;
          }
  
          .results-list {
              display: none;
              flex-direction: column;
              gap: 10px;
          }
  
          .result-item {
              background: #f8f9fa;
              border-radius: 8px;
              padding: 14px;
              border-left: 3px solid #e0e0e0;
              transition: all 0.3s;
              animation: slideIn 0.4s ease;
          }
  
          .result-item.top { 
              border-left-color: #667eea; 
              background: #f0f4ff;
          }
  
          @keyframes slideIn {
              from { opacity: 0; transform: translateX(-10px); }
              to { opacity: 1; transform: translateX(0); }
          }
  
          .result-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
          }
  
          .label { 
              font-weight: 600; 
              color: #333; 
              font-size: 14px;
              display: flex;
              align-items: center;
              gap: 6px;
          }
          
          .confidence { 
              font-family: monospace; 
              color: #667eea; 
              font-weight: bold; 
              font-size: 14px;
          }
  
          .confidence-bar {
              width: 100%;
              height: 4px;
              background: #e0e0e0;
              border-radius: 2px;
              overflow: hidden;
          }
  
          .confidence-fill {
              height: 100%;
              background: linear-gradient(90deg, #667eea, #764ba2);
              border-radius: 2px;
              transition: width 0.6s ease;
              width: 0%;
          }
  
          .top-badge {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 11px;
              font-weight: 600;
          }
  
          .error-state {
              display: none;
              background: #fee;
              color: #c33;
              padding: 12px;
              border-radius: 8px;
              border-left: 3px solid #c33;
              font-size: 14px;
              margin-top: 10px;
          }
  
          .footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              background: rgba(0, 0, 0, 0.2);
              backdrop-filter: blur(10px);
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              padding: 8px 16px;
              text-align: center;
              z-index: 100;
          }
  
          .footer-content {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 16px;
              color: rgba(255, 255, 255, 0.8);
              font-size: 13px;
          }
  
          .github-link {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              color: white;
              text-decoration: none;
              font-weight: 500;
              transition: all 0.3s;
              padding: 4px 10px;
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.15);
          }
  
          .github-link:hover {
              background: rgba(255, 255, 255, 0.25);
              transform: translateY(-1px);
          }
  
          .github-icon {
              width: 16px;
              height: 16px;
              fill: currentColor;
          }
  
          .divider {
              color: rgba(255, 255, 255, 0.4);
          }
  
          @media (max-width: 950px) {
              .main-layout {
                  flex-direction: column;
                  align-items: center;
              }
              
              .left-panel, .right-panel {
                  width: 100%;
                  max-width: 400px;
                  height: 480px;
              }
          }
  
          @media (max-width: 480px) {
              body {
                  padding: 10px;
                  padding-bottom: 50px;
              }
              
              .left-panel, .right-panel {
                  height: 440px;
                  padding: 20px;
              }
              
              h1 { font-size: 22px; }
              
              .footer-content {
                  flex-direction: column;
                  gap: 4px;
                  font-size: 12px;
              }
              
              .divider { display: none; }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>🧠 AI 图像识别</h1>
              <div class="subtitle">基于 Cloudflare Workers AI + ResNet-50</div>
          </div>
  
          <div class="main-layout">
              <!-- 左侧：上传区域 -->
              <div class="left-panel">
                  <div class="panel-title">
                      <span>📤</span>
                      <span>图片上传</span>
                  </div>
                  
                  <!-- Token 输入区域 -->
                  <div id="tokenSection" style="display: {{REQUIRE_TOKEN}}">
                      <div class="token-section">
                          <input 
                              type="password" 
                              class="token-input" 
                              id="tokenInput" 
                              placeholder="请输入访问令牌..."
                          >
                      </div>
                  </div>
  
                  <div class="upload-wrapper">
                      <div class="upload-area" id="uploadArea">
                          <div class="upload-icon">📁</div>
                          <div class="upload-text">点击或拖拽上传</div>
                          <div class="upload-hint">支持 JPG、PNG、GIF、WebP，最大 10MB</div>
                          <input type="file" id="fileInput" accept="image/*">
                      </div>
  
                      <div class="preview-container" id="previewContainer">
                          <div class="preview-image-wrapper">
                              <img class="preview-image" id="previewImage" alt="预览">
                          </div>
                          <div class="button-group">
                              <button class="btn btn-secondary" onclick="resetUpload()">重选</button>
                              <button class="btn btn-primary" id="identifyBtn" onclick="identifyImage()">
                                  <span>开始识别</span>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
  
              <!-- 右侧：结果区域 -->
              <div class="right-panel">
                  <div class="panel-title">
                      <span>🎯</span>
                      <span>识别结果</span>
                  </div>
                  
                  <div class="results-content">
                      <div class="empty-state" id="emptyState">
                          <div class="empty-icon">🔍</div>
                          <div class="empty-text">等待上传图片...</div>
                      </div>
  
                      <div class="loading-state" id="loadingState">
                          <div class="spinner"></div>
                          <div class="loading-text">AI 分析中...</div>
                      </div>
  
                      <div class="results-list" id="resultsList"></div>
                      
                      <div class="error-state" id="errorState"></div>
                  </div>
              </div>
          </div>
      </div>
  
      <footer class="footer">
          <div class="footer-content">
              <span>© 2025 AI Image Recognition</span>
              <span class="divider">|</span>
              <a href="https://github.com/cmyang-it/cloudflare-workers-classify" target="_blank" rel="noopener noreferrer" class="github-link">
                  <svg class="github-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>cloudflare-workers-classify</span>
              </a>
          </div>
      </footer>
  
      <script>
          const REQUIRE_TOKEN = {{REQUIRE_TOKEN_JS}};
          
          const uploadArea = document.getElementById('uploadArea');
          const fileInput = document.getElementById('fileInput');
          const previewContainer = document.getElementById('previewContainer');
          const previewImage = document.getElementById('previewImage');
          const emptyState = document.getElementById('emptyState');
          const loadingState = document.getElementById('loadingState');
          const resultsList = document.getElementById('resultsList');
          const errorState = document.getElementById('errorState');
          const tokenInput = document.getElementById('tokenInput');
          let currentFile = null;
  
          // Token 输入监听（如果启用）
          if (REQUIRE_TOKEN && tokenInput) {
              tokenInput.addEventListener('input', function() {
                  this.classList.remove('error');
              });
          }
  
          uploadArea.addEventListener('click', function() {
              fileInput.click();
          });
          
          uploadArea.addEventListener('dragover', function(e) {
              e.preventDefault();
              uploadArea.classList.add('dragover');
          });
          
          uploadArea.addEventListener('dragleave', function() {
              uploadArea.classList.remove('dragover');
          });
          
          uploadArea.addEventListener('drop', function(e) {
              e.preventDefault();
              uploadArea.classList.remove('dragover');
              if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
          });
  
          fileInput.addEventListener('change', function(e) {
              if (e.target.files.length) handleFile(e.target.files[0]);
          });
  
          function handleFile(file) {
              if (!file.type.startsWith('image/')) {
                  showError('请选择有效的图片文件');
                  return;
              }
              
              if (file.size > 10 * 1024 * 1024) {
                  showError('图片大小不能超过 10MB');
                  return;
              }
  
              currentFile = file;
              var reader = new FileReader();
              reader.onload = function(e) {
                  previewImage.src = e.target.result;
                  uploadArea.style.display = 'none';
                  previewContainer.style.display = 'flex';
                  hideError();
                  
                  // 如果有token输入框，更新提示
                  if (REQUIRE_TOKEN && tokenInput && tokenInput.value.trim() === '') {
                      emptyState.innerHTML = '<div class="empty-icon">⏳</div><div class="empty-text">请输入 Token 并点击识别</div>';
                  }
              };
              reader.readAsDataURL(file);
          }
  
          function identifyImage() {
              if (!currentFile) return;
  
              // 验证 Token（如果启用）
              if (REQUIRE_TOKEN) {
                  var token = tokenInput ? tokenInput.value.trim() : '';
                  if (!token) {
                      if (tokenInput) tokenInput.classList.add('error');
                      showError('请输入访问令牌 (Token)');
                      return;
                  }
              }
  
              var btn = document.getElementById('identifyBtn');
              btn.disabled = true;
              
              emptyState.style.display = 'none';
              loadingState.style.display = 'block';
              resultsList.style.display = 'none';
              hideError();
  
              var formData = new FormData();
              formData.append('image', currentFile);
              
              if (REQUIRE_TOKEN) {
                  formData.append('token', tokenInput.value.trim());
              }
  
              fetch('/api/identify', {
                  method: 'POST',
                  body: formData
              })
              .then(function(response) {
                  return response.json();
              })
              .then(function(data) {
                  if (!data.success) {
                      if (data.error.indexOf('令牌') !== -1 || data.error.indexOf('Token') !== -1) {
                          if (tokenInput) tokenInput.classList.add('error');
                      }
                      throw new Error(data.error);
                  }
                  displayResults(data.data);
              })
              .catch(function(err) {
                  showError(err.message);
                  emptyState.style.display = 'block';
                  loadingState.style.display = 'none';
              })
              .finally(function() {
                  btn.disabled = false;
                  loadingState.style.display = 'none';
              });
          }
  
          function displayResults(data) {
              if (!Array.isArray(data) || data.length === 0) {
                  showError('未获取到识别结果');
                  return;
              }
  
              resultsList.innerHTML = '';
              var topResults = data.slice(0, 5);
              
              topResults.forEach(function(item, index) {
                  var div = document.createElement('div');
                  div.className = 'result-item' + (index === 0 ? ' top' : '');
                  div.style.animationDelay = (index * 0.1) + 's';
                  
                  var label = item.label || '未知';
                  var score = (item.score * 100).toFixed(1);
                  var badge = index === 0 ? '<span class="top-badge">最佳匹配</span>' : '';
                  
                  div.innerHTML = 
                      '<div class="result-header">' +
                          '<div class="label">' +
                              '<span>' + (index + 1) + '. ' + label + '</span>' +
                              badge +
                          '</div>' +
                          '<span class="confidence">' + score + '%</span>' +
                      '</div>' +
                      '<div class="confidence-bar">' +
                          '<div class="confidence-fill" id="fill-' + index + '" style="width: 0%"></div>' +
                      '</div>';
                  
                  resultsList.appendChild(div);
                  
                  setTimeout(function() {
                      var fill = document.getElementById('fill-' + index);
                      if (fill) fill.style.width = score + '%';
                  }, 50 + (index * 80));
              });
  
              resultsList.style.display = 'flex';
          }
  
          function resetUpload() {
              currentFile = null;
              fileInput.value = '';
              uploadArea.style.display = 'flex';
              previewContainer.style.display = 'none';
              
              if (tokenInput) {
                  tokenInput.classList.remove('error');
              }
              
              emptyState.style.display = 'block';
              emptyState.innerHTML = '<div class="empty-icon">🔍</div><div class="empty-text">等待上传图片...</div>';
              resultsList.style.display = 'none';
              hideError();
          }
  
          function showError(msg) {
              errorState.textContent = '❌ ' + msg;
              errorState.style.display = 'block';
          }
  
          function hideError() {
              errorState.style.display = 'none';
          }
      </script>
  </body>
  </html>`;
