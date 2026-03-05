/* =====================================================
   settings.js — 消息组件 + API设置 + 美化/主题 + 数据管理
===================================================== */

/* =====================================================
   消息观赏（chat widget）
===================================================== */
let chatData = JSON.parse(
  localStorage.getItem('halo_chat') ||
  JSON.stringify({
    avatar:   'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
    messages: ['你今天吃饭了吗？', '记得照顾好自己哦 ☁️', '晚安～'],
  })
);

function renderChat() {
  const scroll = document.getElementById('chat-scroll');
  scroll.innerHTML = '';
  const group = document.createElement('div');
  group.className = 'chat-msg-group';

  const avatar = document.createElement('img');
  avatar.className = 'chat-avatar';
  avatar.src = chatData.avatar;
  avatar.alt = '头像';
  avatar.addEventListener('click', openChatEdit);
  group.appendChild(avatar);

  const bubbles = document.createElement('div');
  bubbles.className = 'chat-bubbles';
  chatData.messages.forEach(msg => {
    if (!msg.trim()) return;
    const b = document.createElement('div');
    b.className = 'chat-bubble';
    b.textContent = msg;
    bubbles.appendChild(b);
  });
  group.appendChild(bubbles);
  scroll.appendChild(group);
}

function openChatEdit() {
  document.getElementById('chat-edit-avatar-preview').src = chatData.avatar;
  document.getElementById('chat-url-input').value         = chatData.avatar;
  document.getElementById('chat-msg-input').value         = chatData.messages.join('\n');
  openModal('modal-chat');
}

function applyAvatarUrl() {
  const url = document.getElementById('chat-url-input').value.trim();
  if (url) {
    chatData.avatar = url;
    document.getElementById('chat-edit-avatar-preview').src = url;
  }
}

function handleLocalAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    chatData.avatar = ev.target.result;
    document.getElementById('chat-edit-avatar-preview').src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function applyChatEdit() {
  const urlVal = document.getElementById('chat-url-input').value.trim();
  if (urlVal) chatData.avatar = urlVal;
  chatData.messages = document.getElementById('chat-msg-input').value
    .split('\n').filter(s => s.trim());
  localStorage.setItem('halo_chat', JSON.stringify(chatData));
  renderChat();
  closeModal('modal-chat');
}

function initChat() {
  renderChat();
  document.getElementById('btn-apply-avatar-url').addEventListener('click', applyAvatarUrl);
  document.getElementById('chat-local-file').addEventListener('change', handleLocalAvatar);
  document.getElementById('btn-chat-apply').addEventListener('click', applyChatEdit);
  document.getElementById('btn-chat-close').addEventListener('click', () => {
    closeModal('modal-chat');
  });
}

/* =====================================================
   ① API 设置
===================================================== */
let apiConfig   = JSON.parse(localStorage.getItem('halo_api_config')   || '{"url":"","key":"","model":""}');
let apiArchives = JSON.parse(localStorage.getItem('halo_api_archives') || '[]');

function saveApiConfig()   { localStorage.setItem('halo_api_config',   JSON.stringify(apiConfig)); }
function saveApiArchives() { localStorage.setItem('halo_api_archives', JSON.stringify(apiArchives)); }

function loadApiConfigToUI() {
  document.getElementById('api-url-input').value = apiConfig.url || '';
  document.getElementById('api-key-input').value = apiConfig.key || '';
  const sel = document.getElementById('api-model-select');
  if (apiConfig.model) {
    sel.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = apiConfig.model;
    opt.textContent = apiConfig.model;
    opt.selected = true;
    sel.appendChild(opt);
  }
}

async function fetchModels() {
  const url    = document.getElementById('api-url-input').value.trim().replace(/\/$/, '');
  const key    = document.getElementById('api-key-input').value.trim();
  const status = document.getElementById('api-fetch-status');

  if (!url || !key) {
    status.textContent = '请先填写 API 地址和密钥';
    status.className   = 'api-fetch-status err';
    return;
  }

  status.textContent = '正在拉取…';
  status.className   = 'api-fetch-status';

  try {
    const res = await fetch(`${url}/models`, {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const list = Array.isArray(data)
      ? data
      : (data.data || data.models || []);

    if (!list.length) throw new Error('未返回任何模型');

    const sel = document.getElementById('api-model-select');
    sel.innerHTML = '';
    list.forEach(m => {
      const id  = typeof m === 'string' ? m : (m.id || m.name || String(m));
      const opt = document.createElement('option');
      opt.value = id; opt.textContent = id;
      if (id === apiConfig.model) opt.selected = true;
      sel.appendChild(opt);
    });

    status.textContent = `成功获取 ${list.length} 个模型`;
    status.className   = 'api-fetch-status ok';
  } catch(e) {
    status.textContent = `拉取失败：${e.message}`;
    status.className   = 'api-fetch-status err';
  }
}

function saveCurrentApiConfig() {
  apiConfig.url   = document.getElementById('api-url-input').value.trim().replace(/\/$/, '');
  apiConfig.key   = document.getElementById('api-key-input').value.trim();
  apiConfig.model = document.getElementById('api-model-select').value;
  saveApiConfig();

  const status = document.getElementById('api-fetch-status');
  status.textContent = '配置已保存';
  status.className   = 'api-fetch-status ok';
}

function renderApiArchiveList() {
  const el = document.getElementById('api-archive-list');
  el.innerHTML = '';
  if (!apiArchives.length) {
    el.innerHTML = '<div style="font-size:10px;color:var(--text-sub);text-align:center">暂无存档</div>';
    return;
  }
  apiArchives.forEach((arc, idx) => {
    const div = document.createElement('div');
    div.className = 'cd-item';
    div.innerHTML = `
      <div class="cd-item-info" style="cursor:pointer">
        <div class="cd-item-name">${arc.name}</div>
        <div class="cd-item-date">${arc.url} · ${arc.model || '未选模型'}</div>
      </div>
      <button class="btn-del" data-idx="${idx}">✕</button>
    `;
    div.querySelector('.cd-item-info').addEventListener('click', () => {
      document.getElementById('api-url-input').value = arc.url;
      document.getElementById('api-key-input').value = arc.key;
      apiConfig = { url: arc.url, key: arc.key, model: arc.model };
      loadApiConfigToUI();
      const status = document.getElementById('api-fetch-status');
      status.textContent = `已加载存档「${arc.name}」`;
      status.className   = 'api-fetch-status ok';
    });
    div.querySelector('.btn-del').addEventListener('click', () => {
      apiArchives.splice(idx, 1);
      saveApiArchives();
      renderApiArchiveList();
    });
    el.appendChild(div);
  });
}

function saveArchive() {
  const name  = document.getElementById('api-archive-name').value.trim();
  const url   = document.getElementById('api-url-input').value.trim().replace(/\/$/, '');
  const key   = document.getElementById('api-key-input').value.trim();
  const model = document.getElementById('api-model-select').value;
  if (!name || !url) { alert('请填写存档名称和 API 地址'); return; }
  apiArchives.push({ name, url, key, model });
  saveApiArchives();
  renderApiArchiveList();
  document.getElementById('api-archive-name').value = '';
}

function initApiSettings() {
  loadApiConfigToUI();
  renderApiArchiveList();
  document.getElementById('btn-fetch-models').addEventListener('click', fetchModels);
  document.getElementById('btn-save-api').addEventListener('click', saveCurrentApiConfig);
  document.getElementById('btn-save-archive').addEventListener('click', saveArchive);
}

/* =====================================================
   ② 美化 / 主题
===================================================== */

/* ---------- 壁纸 ---------- */
function applyWallpaper(src) {
  let el = document.getElementById('phone-wallpaper');
  if (!el) {
    el = document.createElement('div');
    el.id = 'phone-wallpaper';
    document.getElementById('phone').prepend(el);
  }
  el.style.backgroundImage = `url("${src}")`;
  localStorage.setItem('halo_wallpaper', src);
}
function clearWallpaper() {
  const el = document.getElementById('phone-wallpaper');
  if (el) el.style.backgroundImage = 'none';
  localStorage.removeItem('halo_wallpaper');
}
function initWallpaper() {
  const saved = localStorage.getItem('halo_wallpaper');
  if (saved) applyWallpaper(saved);
  document.getElementById('wallpaper-local-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => applyWallpaper(ev.target.result);
    reader.readAsDataURL(file);
  });
  document.getElementById('btn-show-wallpaper-url').addEventListener('click', () => {
    const inp = document.getElementById('wallpaper-url-input');
    const btn = document.getElementById('btn-wallpaper-apply');
    const show = inp.style.display === 'none';
    inp.style.display = show ? 'block' : 'none';
    btn.style.display = show ? 'block' : 'none';
  });
  document.getElementById('btn-wallpaper-apply').addEventListener('click', () => {
    const url = document.getElementById('wallpaper-url-input').value.trim();
    if (url) applyWallpaper(url);
  });
  document.getElementById('btn-wallpaper-clear').addEventListener('click', clearWallpaper);
}

/* ---------- App 图标替换 ---------- */
const APP_ICON_REGISTRY = [
  { imgId: 'appicon-chat',     labelId: 'applabel-chat',     defaultLabel: '聊天' },
  { imgId: 'appicon-settings', labelId: 'applabel-settings', defaultLabel: '设置' },
];
let iconData = JSON.parse(localStorage.getItem('halo_icons') || '{}');
function saveIconData() { localStorage.setItem('halo_icons', JSON.stringify(iconData)); }
function applyAllIcons() {
  APP_ICON_REGISTRY.forEach(reg => {
    const saved = iconData[reg.imgId];
    if (!saved) return;
    const img = document.getElementById(reg.imgId);
    if (img && saved.src) img.src = saved.src;
    const lbl = document.getElementById(reg.labelId);
    if (lbl && saved.label) lbl.textContent = saved.label;
  });
}
function renderIconReplaceList() {
  const list = document.getElementById('icon-replace-list');
  list.innerHTML = '';
  APP_ICON_REGISTRY.forEach(reg => {
    const saved = iconData[reg.imgId] || {};
    const imgEl = document.getElementById(reg.imgId);
    const curSrc = (imgEl && imgEl.src) ? imgEl.src : '';

    const item = document.createElement('div');
    item.className = 'icon-replace-item';

    const preview = document.createElement('img');
    preview.className = 'icon-replace-preview';
    preview.src = saved.src || curSrc;
    preview.alt = reg.defaultLabel;
    item.appendChild(preview);

    const info = document.createElement('div');
    info.className = 'icon-replace-info';

    const labelInp = document.createElement('input');
    labelInp.type = 'text';
    labelInp.placeholder = '图标名称';
    labelInp.value = saved.label || reg.defaultLabel;
    info.appendChild(labelInp);

    const urlInp = document.createElement('input');
    urlInp.type = 'url';
    urlInp.placeholder = '图标图片 URL';
    urlInp.value = saved.src || '';
    info.appendChild(urlInp);

    item.appendChild(info);

    const btns = document.createElement('div');
    btns.className = 'icon-replace-btns';

    const fileId = `iconfile-${reg.imgId}`;
    const fileLbl = document.createElement('label');
    fileLbl.className = 'btn-mini';
    fileLbl.htmlFor = fileId;
    fileLbl.textContent = '上传';
    const fileInp = document.createElement('input');
    fileInp.type = 'file';
    fileInp.accept = 'image/*';
    fileInp.id = fileId;
    fileInp.style.display = 'none';
    fileInp.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        preview.src = ev.target.result;
        urlInp.value = '';
        _saveIconEntry(reg.imgId, reg.labelId, ev.target.result, labelInp.value);
      };
      reader.readAsDataURL(file);
    });
    const applyBtn = document.createElement('div');
    applyBtn.className = 'btn-mini';
    applyBtn.textContent = '应用';
    applyBtn.addEventListener('click', () => {
      const src = urlInp.value.trim() || preview.src;
      if (urlInp.value.trim()) preview.src = urlInp.value.trim();
      _saveIconEntry(reg.imgId, reg.labelId, src, labelInp.value);
    });

    btns.appendChild(fileLbl);
    btns.appendChild(fileInp);
    btns.appendChild(applyBtn);
    item.appendChild(btns);
    list.appendChild(item);
  });
}
function _saveIconEntry(imgId, labelId, src, label) {
  iconData[imgId] = { src, label };
  saveIconData();
  const img = document.getElementById(imgId);
  if (img && src) img.src = src;
  const lbl = document.getElementById(labelId);
  if (lbl && label) lbl.textContent = label;
}

/* ---------- 配色（整体配色） ---------- */
const DEFAULT_COLORS = {
  '--bg':        '#1a1f2e',
  '--fog':       '#f5f0e8',
  '--accent':    '#7a9abf',
  '--accent2':   '#a8c0d6',
  '--text-main': '#e8e4da',
  '--text-sub':  '#b0b8c8',
};

function applyColors(map) {
  const root = document.documentElement;
  Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v));
}

/* 初始化配色（读取本地保存） */
function initColors() {
  const saved = JSON.parse(localStorage.getItem('halo_colors') || '{}');
  if (Object.keys(saved).length) {
    applyColors(saved);
    document.querySelectorAll('.color-picker').forEach(p => {
      if (saved[p.dataset.var]) p.value = saved[p.dataset.var];
    });
  }
}

/* 「应用配色」按钮 */
function applyColorSettings() {
  const map = {};
  document.querySelectorAll('.color-picker').forEach(p => {
    map[p.dataset.var] = p.value;
  });
  applyColors(map);
  localStorage.setItem('halo_colors', JSON.stringify(map));
}

/* 「恢复默认」按钮 */
function resetColors() {
  applyColors(DEFAULT_COLORS);
  localStorage.removeItem('halo_colors');
  document.querySelectorAll('.color-picker').forEach(p => {
    p.value = DEFAULT_COLORS[p.dataset.var] || '#ffffff';
  });
}

/* ---------- 主题切换 & 自定义配色 ---------- */

/* 预设主题（light / dark） */
const PRESET_THEMES = {
  light: {
    '--bg':        '#F5F5F0',
    '--fog':       '#1a2a3a',
    '--accent':    '#99C8ED',
    '--accent2':   '#B3D8F4',
    '--text-main': '#2c3e50',
    '--text-sub':  '#6a8aa8',
  },
  dark: {
    '--bg':        '#1a1f2e',
    '--fog':       '#f5f0e8',
    '--accent':    '#7a9abf',
    '--accent2':   '#a8c0d6',
    '--text-main': '#e8e4da',
    '--text-sub':  '#b0b8c8',
  }
};

/* 切换到预设主题（light / dark） */
function switchPresetTheme(name) {
  const theme = PRESET_THEMES[name];
  if (!theme) return;
  // 清除自定义主题缓存
  localStorage.removeItem('halo_custom_theme');

  if (name === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  applyColors(theme);
}

/* 保存当前配色为「自定义主题」 */
function saveCustomTheme() {
  const map = {};
  document.querySelectorAll('.color-picker').forEach(p => {
    map[p.dataset.var] = p.value;
  });
  // 去掉深色标记，确保使用自定义变量
  document.documentElement.removeAttribute('data-theme');
  applyColors(map);
  localStorage.setItem('halo_custom_theme', JSON.stringify(map));
}

/* 页面加载时尝试读取「自定义主题」 */
function loadCustomTheme() {
  const saved = JSON.parse(localStorage.getItem('halo_custom_theme') || 'null');
  if (saved) {
    document.documentElement.removeAttribute('data-theme');
    applyColors(saved);
  }
}

/* 初始化美化 / 主题（挂载所有事件） */
function initThemeSettings() {
  initWallpaper();
  applyAllIcons();

  /* 1️⃣ 尝试加载自定义主题（若存在） */
  loadCustomTheme();

  /* 2️⃣ 若没有自定义主题，则读取普通配色（兼容旧版） */
  if (!localStorage.getItem('halo_custom_theme')) {
    initColors();
  }

  /* 3️⃣ 颜色面板的「应用」/「恢复默认」 */
  document.getElementById('btn-color-apply').addEventListener('click', applyColorSettings);
  document.getElementById('btn-color-reset').addEventListener('click', resetColors);

  /* 4️⃣ 预设主题按钮 */
  document.getElementById('btn-theme-light').addEventListener('click', () => switchPresetTheme('light'));
  document.getElementById('btn-theme-dark').addEventListener('click', () => switchPresetTheme('dark'));

  /* 5️⃣ 自定义配色弹层打开/关闭 */
  document.getElementById('btn-open-custom').addEventListener('click', () => {
    const root = document.documentElement;
    document.querySelectorAll('#modal-custom-theme .color-picker').forEach(p => {
      const varName = p.dataset.var;
      const curVal = getComputedStyle(root).getPropertyValue(varName).trim();
      p.value = curVal || p.value;
    });
    openModal('modal-custom-theme');
  });
  document.getElementById('btn-cancel-custom').addEventListener('click', () => closeModal('modal-custom-theme'));

  /* 6️⃣ 保存自定义主题 */
  document.getElementById('btn-save-custom-theme').addEventListener('click', () => {
    saveCustomTheme();
    closeModal('modal-custom-theme');
    alert('自定义主题已保存，下次打开设置会自动加载');
  });

  /* 7️⃣ 切换到美化标签时渲染图标列表（保持原有） */
  document.querySelectorAll('.stab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === 'tab-theme') renderIconReplaceList();
    });
  });
}

/* =====================================================
   ③ 数据管理
===================================================== */
function exportData() {
  const data = {
    halo_cd:           JSON.parse(localStorage.getItem('halo_cd')           || '[]'),
    halo_gallery:      JSON.parse(localStorage.getItem('halo_gallery')      || '[]'),
    halo_chat:         JSON.parse(localStorage.getItem('halo_chat')         || '{}'),
    halo_api_config:   JSON.parse(localStorage.getItem('halo_api_config')   || '{}'),
    halo_api_archives: JSON.parse(localStorage.getItem('halo_api_archives') || '[]'),
    halo_wallpaper:    localStorage.getItem('halo_wallpaper') || '',
    halo_icons:        JSON.parse(localStorage.getItem('halo_icons')        || '{}'),
    halo_colors:       JSON.parse(localStorage.getItem('halo_colors')       || '{}'),
  };
  const json = JSON.stringify(data, null, 2);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json)
      .then(() => alert('数据已复制到剪贴板'))
      .catch(() => prompt('请手动复制：', json));
  } else {
    prompt('请手动复制：', json);
  }
}
function showImportArea() {
  const area = document.getElementById('settings-import-input');
  const btn  = document.getElementById('btn-import-confirm');
  const show = area.style.display === 'none';
  area.style.display = show ? 'block' : 'none';
  btn.style.display  = show ? 'block' : 'none';
}
function confirmImport() {
  try {
    const raw  = document.getElementById('settings-import-input').value.trim();
    const data = JSON.parse(raw);
    const keys = [
      'halo_cd','halo_gallery','halo_chat',
      'halo_api_config','halo_api_archives',
      'halo_icons','halo_colors',
    ];
    keys.forEach(k => {
      if (data[k] !== undefined) localStorage.setItem(k, JSON.stringify(data[k]));
    });
    if (data.halo_wallpaper) localStorage.setItem('halo_wallpaper', data.halo_wallpaper);
    alert('导入成功，即将刷新页面');
    location.reload();
  } catch(e) {
    alert('JSON 格式有误，请检查后重试');
  }
}
function clearAllData() {
  if (!confirm('确认清空所有数据？此操作不可撤销。')) return;
  [
    'halo_cd','halo_gallery','halo_chat',
    'halo_api_config','halo_api_archives',
    'halo_wallpaper','halo_icons','halo_colors',
  ].forEach(k => localStorage.removeItem(k));
  alert('已清空，即将刷新页面');
  location.reload();
}
function initDataSettings() {
  document.getElementById('btn-export-data').addEventListener('click', exportData);
  document.getElementById('btn-import-data').addEventListener('click', showImportArea);
  document.getElementById('btn-import-confirm').addEventListener('click', confirmImport);
  document.getElementById('btn-clear-all').addEventListener('click', clearAllData);
}

/* =====================================================
   设置页标签切换
===================================================== */
function initSettingsTabs() {
  document.querySelectorAll('.stab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

/* =====================================================
   统一初始化入口（供 app.js 调用）
===================================================== */
function initSettings() {
  initChat();
  initApiSettings();
  initThemeSettings();   // 包含主题切换 / 自定义主题
  initDataSettings();
  initSettingsTabs();

  document.getElementById('btn-open-settings').addEventListener('click', () => {
    openModal('modal-settings');
  });
  document.getElementById('btn-settings-close').addEventListener('click', () => {
    closeModal('modal-settings');
  });
}