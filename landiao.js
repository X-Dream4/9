/* =====================================================
   landiao.js — 蓝调 App 完整逻辑
===================================================== */

/* =====================================================
   工具：蓝调弹层
===================================================== */
function ldOpenModal(id)  { document.getElementById(id).classList.add('ld-open'); }
function ldCloseModal(id) { document.getElementById(id).classList.remove('ld-open'); }

/* 阻止蓝调弹层内点击冒泡 */
document.querySelectorAll('.ld-modal-box').forEach(box => {
  box.addEventListener('click', e => e.stopPropagation());
});

/* =====================================================
   数据层 — localStorage 读写
===================================================== */
function ldLoad(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) || def; }
  catch(e) { return def; }
}
function ldSave(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* 数据结构：
   halo_ld_roles    : [ { id, name, intro, avatar, systemPrompt } ]
   halo_ld_convos   : { [roleId]: [ { role:'role'|'user', text } ] }
   halo_ld_posts    : [ { id, text, comments:[ {text} ] } ]
   halo_ld_me       : { name, sig, avatar }
   halo_ld_style    : { roleColor, userColor, font }
   halo_ld_unread   : { [roleId]: bool }
*/
let ldRoles   = ldLoad('halo_ld_roles',   []);
let ldConvos  = ldLoad('halo_ld_convos',  {});
let ldPosts   = ldLoad('halo_ld_posts',   []);
let ldMe      = ldLoad('halo_ld_me',      { name:'旅行者', sig:'写下你的签名…', avatar:'' });
let ldStyle   = ldLoad('halo_ld_style',   { roleColor:'#2c3e50', userColor:'#7a3f2d', font:"'Noto Serif SC', serif" });
let ldUnread  = ldLoad('halo_ld_unread',  {});

function ldSaveAll() {
  ldSave('halo_ld_roles',  ldRoles);
  ldSave('halo_ld_convos', ldConvos);
  ldSave('halo_ld_posts',  ldPosts);
  ldSave('halo_ld_me',     ldMe);
  ldSave('halo_ld_style',  ldStyle);
  ldSave('halo_ld_unread', ldUnread);
}

/* =====================================================
   视图切换
===================================================== */
let ldCurrentView = 'ld-view-roles';

function ldShowView(viewId) {
  document.querySelectorAll('.ld-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.ld-nav-item').forEach(n => n.classList.remove('active'));

  const view = document.getElementById(viewId);
  if (view) view.classList.add('active');

  const navItem = document.querySelector(`.ld-nav-item[data-view="${viewId}"]`);
  if (navItem) navItem.classList.add('active');
  ldCurrentView = viewId;
}

/* =====================================================
   蓝调 App 开关
===================================================== */
function ldOpen() {
  document.getElementById('landiao-app').classList.remove('ld-hidden');
  ldShowView('ld-view-roles');
  ldRenderRoles();
}

function ldClose() {
  document.getElementById('landiao-app').classList.add('ld-hidden');
}

/* =====================================================
   ① 角色库
===================================================== */
let ldEditingRoleId  = null;  // null = 新建，否则为编辑中的角色id
let ldRoleAvatarData = '';    // 当前编辑头像的 base64 或 url

function ldRenderRoles() {
  const grid = document.getElementById('ld-roles-grid');
  grid.innerHTML = '';

  ldRoles.forEach(role => {
    const card = document.createElement('div');
    card.className = 'ld-role-card';

    // 胶带条
    const tape = document.createElement('div');
    tape.className = 'ld-tape-strip';
    card.appendChild(tape);

    // 删除按钮（长按显示）
    const del = document.createElement('div');
    del.className   = 'ld-role-card-del';
    del.textContent = '✕';
    del.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`删除角色「${role.name}」？`)) return;
      ldRoles = ldRoles.filter(r => r.id !== role.id);
      ldSave('halo_ld_roles', ldRoles);
      ldRenderRoles();
      ldRenderChatList();
    });
    card.appendChild(del);

    // 头像
    const img = document.createElement('img');
    img.className = 'ld-role-card-avatar';
    img.src = role.avatar || _ldDefaultAvatar();
    img.alt = role.name;
    card.appendChild(img);

    // 名称
    const name = document.createElement('div');
    name.className   = 'ld-role-card-name';
    name.textContent = role.name;
    card.appendChild(name);

    // 简介
    const intro = document.createElement('div');
    intro.className   = 'ld-role-card-intro';
    intro.textContent = role.intro || '神秘的存在…';
    card.appendChild(intro);

    // 点击：进入聊天
    card.addEventListener('click', () => {
      if (card.classList.contains('delmode')) return;
      ldOpenConvo(role.id);
    });

    // 长按：进入删除模式
    let longPressTimer = null;
    card.addEventListener('pointerdown', () => {
      longPressTimer = setTimeout(() => {
        card.classList.toggle('delmode');
      }, 600);
    });
    card.addEventListener('pointerup',    () => clearTimeout(longPressTimer));
    card.addEventListener('pointerleave', () => clearTimeout(longPressTimer));

    // 双击：编辑角色
    card.addEventListener('dblclick', e => {
      e.stopPropagation();
      ldOpenRoleModal(role.id);
    });

    grid.appendChild(card);
  });
}

function ldOpenRoleModal(roleId) {
  ldEditingRoleId = roleId || null;
  const role = roleId ? ldRoles.find(r => r.id === roleId) : null;

  ldRoleAvatarData = role ? (role.avatar || '') : '';
  document.getElementById('ld-role-avatar-preview').src =
    ldRoleAvatarData || _ldDefaultAvatar();
  document.getElementById('ld-role-name-input').value         = role ? role.name        : '';
  document.getElementById('ld-role-intro-input').value        = role ? role.intro       : '';
  document.getElementById('ld-role-system-input').value       = role ? (role.systemPrompt || '') : '';
  document.getElementById('ld-role-avatar-url-input').value   = '';
  document.getElementById('ld-role-avatar-url-input').style.display = 'none';

  ldOpenModal('ld-modal-role');
}

function ldSaveRole() {
  const name   = document.getElementById('ld-role-name-input').value.trim();
  const intro  = document.getElementById('ld-role-intro-input').value.trim();
  const system = document.getElementById('ld-role-system-input').value.trim();
  if (!name) { alert('请填写角色名'); return; }

  if (ldEditingRoleId) {
    const idx = ldRoles.findIndex(r => r.id === ldEditingRoleId);
    if (idx !== -1) {
      ldRoles[idx].name         = name;
      ldRoles[idx].intro        = intro;
      ldRoles[idx].systemPrompt = system;
      if (ldRoleAvatarData) ldRoles[idx].avatar = ldRoleAvatarData;
    }
  } else {
    ldRoles.push({
      id:           Date.now().toString(),
      name, intro,
      systemPrompt: system,
      avatar:       ldRoleAvatarData,
    });
  }

  ldSave('halo_ld_roles', ldRoles);
  ldCloseModal('ld-modal-role');
  ldRenderRoles();
  ldRenderChatList();
}

/* =====================================================
   ② 聊天列表
===================================================== */
function ldRenderChatList() {
  const list = document.getElementById('ld-chat-list');
  list.innerHTML = '';

  if (!ldRoles.length) {
    list.innerHTML = '<div style="text-align:center;color:rgba(180,160,120,0.5);font-size:12px;margin-top:40px;font-style:italic">还没有角色，去角色库新建一个吧</div>';
    return;
  }

  ldRoles.forEach(role => {
    const history  = ldConvos[role.id] || [];
    const lastMsg  = history.length ? history[history.length - 1].text : '还没有对话…';
    const hasUnread = ldUnread[role.id];

    const env = document.createElement('div');
    env.className = 'ld-envelope';

    const img = document.createElement('img');
    img.className = 'ld-envelope-avatar';
    img.src = role.avatar || _ldDefaultAvatar();
    img.alt = role.name;

    const info = document.createElement('div');
    info.className = 'ld-envelope-info';

    const nameEl = document.createElement('div');
    nameEl.className   = 'ld-envelope-name';
    nameEl.textContent = role.name;

    const preview = document.createElement('div');
    preview.className   = 'ld-envelope-preview';
    preview.textContent = lastMsg.length > 22 ? lastMsg.slice(0, 22) + '…' : lastMsg;

    info.appendChild(nameEl);
    info.appendChild(preview);
    env.appendChild(img);
    env.appendChild(info);

    // 蜡封未读
    if (hasUnread) {
      const seal = document.createElement('div');
      seal.className = 'ld-seal-dot';
      env.appendChild(seal);
    }

    env.addEventListener('click', () => {
      ldUnread[role.id] = false;
      ldSave('halo_ld_unread', ldUnread);
      ldOpenConvo(role.id);
    });

    list.appendChild(env);
  });
}

/* =====================================================
   ③ 聊天对话（本子模式）
===================================================== */
let ldCurrentRoleId = null;

function ldOpenConvo(roleId) {
  ldCurrentRoleId = roleId;
  const role = ldRoles.find(r => r.id === roleId);
  if (!role) return;

  // 设置头像
  document.getElementById('ld-convo-role-avatar').src =
    role.avatar || _ldDefaultAvatar();
  document.getElementById('ld-convo-role-avatar-small').src =
    role.avatar || _ldDefaultAvatar();
  document.getElementById('ld-convo-user-avatar').src =
    ldMe.avatar || _ldDefaultUserAvatar();
  document.getElementById('ld-convo-title-center').textContent = role.name;

  ldApplyConvoStyle();
  ldRenderMessages();
  ldShowView('ld-view-convo');
}

function ldApplyConvoStyle() {
  const msgs = document.getElementById('ld-notebook-messages');
  msgs.style.fontFamily = ldStyle.font;
}

function ldRenderMessages() {
  const container = document.getElementById('ld-notebook-messages');
  container.innerHTML = '';
  const history = ldConvos[ldCurrentRoleId] || [];

  history.forEach(msg => {
    _ldAppendMsgLine(msg.role, msg.text, false);
  });

  container.scrollTop = container.scrollHeight;
}

function _ldAppendMsgLine(who, text, scroll) {
  const container = document.getElementById('ld-notebook-messages');
  const role = ldRoles.find(r => r.id === ldCurrentRoleId);

  const line = document.createElement('div');
  line.className = `ld-msg-line ${who}`;
  line.style.color = who === 'role' ? ldStyle.roleColor : ldStyle.userColor;
  line.style.fontFamily = ldStyle.font;

  const sender = document.createElement('span');
  sender.className   = 'ld-msg-sender';
  sender.textContent = who === 'role'
    ? (role ? role.name : '角色')
    : (ldMe.name || '我');

  if (who === 'user') {
    line.appendChild(document.createTextNode(text));
    line.appendChild(sender);
  } else {
    line.appendChild(sender);
    line.appendChild(document.createTextNode(text));
  }

  container.appendChild(line);
  if (scroll) container.scrollTop = container.scrollHeight;
  return line;
}

async function ldSendMessage() {
  const input = document.getElementById('ld-notebook-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';

  // 写入用户消息
  if (!ldConvos[ldCurrentRoleId]) ldConvos[ldCurrentRoleId] = [];
  ldConvos[ldCurrentRoleId].push({ role: 'user', text });
  _ldAppendMsgLine('user', text, true);

  // 调用 API
  const apiConfig = ldLoad('halo_api_config', { url:'', key:'', model:'' });
  if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
    _ldAppendMsgLine('role', '（请先在设置中配置 API）', true);
    ldConvos[ldCurrentRoleId].push({ role: 'role', text: '（请先在设置中配置 API）' });
    ldSave('halo_ld_convos', ldConvos);
    ldRenderChatList();
    return;
  }

  // 打字占位行
  const container   = document.getElementById('ld-notebook-messages');
  const role        = ldRoles.find(r => r.id === ldCurrentRoleId);
  const placeholder = document.createElement('div');
  placeholder.className  = `ld-msg-line role ld-typing`;
  placeholder.style.color      = ldStyle.roleColor;
  placeholder.style.fontFamily = ldStyle.font;
  const senderSpan = document.createElement('span');
  senderSpan.className   = 'ld-msg-sender';
  senderSpan.textContent = role ? role.name : '角色';
  placeholder.appendChild(senderSpan);
  container.appendChild(placeholder);
  container.scrollTop = container.scrollHeight;

  try {
    // 构建消息历史
    const messages = [];
    if (role && role.systemPrompt) {
      messages.push({ role: 'system', content: role.systemPrompt });
    }
    ldConvos[ldCurrentRoleId].forEach(m => {
      messages.push({
        role:    m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      });
    });

    const res = await fetch(
      `${apiConfig.url.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiConfig.key}`,
        },
        body: JSON.stringify({
          model:    apiConfig.model,
          messages: messages,
        }),
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data   = await res.json();
    const reply  = data.choices?.[0]?.message?.content || '…';

    // 替换占位行
    placeholder.classList.remove('ld-typing');
    placeholder.appendChild(document.createTextNode(reply));
    container.scrollTop = container.scrollHeight;

    ldConvos[ldCurrentRoleId].push({ role: 'role', text: reply });
    ldSave('halo_ld_convos', ldConvos);

    // 标记未读（若不在聊天列表视图）
    ldUnread[ldCurrentRoleId] = true;
    ldSave('halo_ld_unread', ldUnread);
    ldRenderChatList();

  } catch(e) {
    placeholder.classList.remove('ld-typing');
    placeholder.appendChild(document.createTextNode(`（请求失败：${e.message}）`));
    container.scrollTop = container.scrollHeight;
  }
}

/* =====================================================
   ④ 动态广场
===================================================== */
let ldCommentingPostId = null;

function ldRenderSquare() {
  const board = document.getElementById('ld-square-board');
  board.innerHTML = '';

  const colors = ['#f7e97a','#a8d8a8','#f7c59f','#c9b8e8','#a8d8e8'];

  ldPosts.forEach((post, pi) => {
    const wrap = document.createElement('div');
    wrap.style.display        = 'flex';
    wrap.style.flexDirection  = 'column';
    wrap.style.alignItems     = 'center';

    // 便利贴
    const note = document.createElement('div');
    note.className = 'ld-sticky-note';
    note.style.background = colors[pi % colors.length];

    const pin = document.createElement('div');
    pin.className   = 'ld-pin-icon';
    pin.textContent = '📌';
    note.appendChild(pin);

    note.appendChild(document.createTextNode(post.text));

    const cCount = document.createElement('div');
    cCount.className   = 'ld-note-comment-count';
    cCount.textContent = post.comments.length
      ? `${post.comments.length} 条评论 ▾`
      : '点击评论';
    note.appendChild(cCount);

    // 点击：打开评论弹层
    note.addEventListener('click', () => {
      ldCommentingPostId = post.id;
      ldRenderCommentModal(post.id);
      ldOpenModal('ld-modal-comment');
    });

    wrap.appendChild(note);

    // 展开的评论纸条
    if (post.comments.length) {
      const slips = document.createElement('div');
      slips.className = 'ld-note-comments open';
      post.comments.slice(-2).forEach(c => {
        const slip = document.createElement('div');
        slip.className   = 'ld-comment-slip';
        slip.textContent = c.text;
        slips.appendChild(slip);
      });
      wrap.appendChild(slips);
    }

    board.appendChild(wrap);
  });
}

function ldRenderCommentModal(postId) {
  const post = ldPosts.find(p => p.id === postId);
  if (!post) return;
  const list = document.getElementById('ld-comment-list');
  list.innerHTML = '';
  post.comments.forEach(c => {
    const item = document.createElement('div');
    item.className   = 'ld-comment-item';
    item.textContent = c.text;
    list.appendChild(item);
  });
  document.getElementById('ld-comment-input').value = '';
}

function ldAddComment() {
  const text = document.getElementById('ld-comment-input').value.trim();
  if (!text || ldCommentingPostId === null) return;
  const idx = ldPosts.findIndex(p => p.id === ldCommentingPostId);
  if (idx === -1) return;
  ldPosts[idx].comments.push({ text });
  ldSave('halo_ld_posts', ldPosts);
  ldRenderCommentModal(ldCommentingPostId);
  ldRenderSquare();
}

function ldAddPost() {
  const text = document.getElementById('ld-post-input').value.trim();
  if (!text) return;
  ldPosts.unshift({ id: Date.now().toString(), text, comments: [] });
  ldSave('halo_ld_posts', ldPosts);
  ldCloseModal('ld-modal-post');
  ldRenderSquare();
}

/* =====================================================
   ⑤ 我的界面
===================================================== */
function ldRenderMe() {
  document.getElementById('ld-me-name-display').textContent = ldMe.name || '旅行者';
  document.getElementById('ld-me-sig-display').textContent  = ldMe.sig  || '写下你的签名…';
  document.getElementById('ld-me-avatar').src =
    ldMe.avatar || _ldDefaultUserAvatar();
}

function ldSaveMe() {
  ldMe.name = document.getElementById('ld-me-name-input').value.trim() || '旅行者';
  ldMe.sig  = document.getElementById('ld-me-sig-input').value.trim()  || '写下你的签名…';
  ldSave('halo_ld_me', ldMe);
  ldRenderMe();
  ldCloseModal('ld-modal-me');
}

/* =====================================================
   字体/颜色风格
===================================================== */
function ldOpenStyleModal() {
  document.getElementById('ld-color-role').value  = ldStyle.roleColor;
  document.getElementById('ld-color-user').value  = ldStyle.userColor;
  // 匹配下拉选项
  const sel = document.getElementById('ld-font-select');
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === ldStyle.font) {
      sel.selectedIndex = i;
      break;
    }
  }
  ldOpenModal('ld-modal-style');
}

function ldSaveStyle() {
  ldStyle.roleColor = document.getElementById('ld-color-role').value;
  ldStyle.userColor = document.getElementById('ld-color-user').value;
  ldStyle.font      = document.getElementById('ld-font-select').value;
  ldSave('halo_ld_style', ldStyle);
  ldApplyConvoStyle();
  ldRenderMessages();
  ldCloseModal('ld-modal-style');
}

/* =====================================================
   默认头像占位（SVG data URI）
===================================================== */
function _ldDefaultAvatar() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Crect width='72' height='72' fill='%23c8b89a'/%3E%3Ccircle cx='36' cy='28' r='14' fill='%23a09070'/%3E%3Cellipse cx='36' cy='62' rx='22' ry='16' fill='%23a09070'/%3E%3C/svg%3E";
}

function _ldDefaultUserAvatar() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72'%3E%3Crect width='72' height='72' fill='%234a6a8a'/%3E%3Ccircle cx='36' cy='28' r='14' fill='%237a9abf'/%3E%3Cellipse cx='36' cy='62' rx='22' ry='16' fill='%237a9abf'/%3E%3C/svg%3E";
}

/* =====================================================
   蓝调内部设置弹层
===================================================== */
function ldOpenInternalSettings() {
  const apiConfig = ldLoad('halo_api_config', { url:'', key:'', model:'' });
  document.getElementById('ld-settings-model').textContent =
    apiConfig.model || '（未配置）';
  ldOpenModal('ld-modal-settings');
}

function ldClearCurrentConvo() {
  if (!ldCurrentRoleId) return;
  if (!confirm('确认清空当前对话记录？')) return;
  ldConvos[ldCurrentRoleId] = [];
  ldSave('halo_ld_convos', ldConvos);
  ldRenderMessages();
  ldRenderChatList();
}

/* =====================================================
   事件绑定 — 统一初始化入口
===================================================== */
function initLandiao() {

  /* ---- 蓝调 App 入口 ---- */
  document.getElementById('app-slot-chat').addEventListener('click', ldOpen);

  /* ---- 底部导航 ---- */
  document.querySelectorAll('.ld-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.dataset.view;
      if (!viewId) return;
      ldShowView(viewId);
      if (viewId === 'ld-view-roles')  ldRenderRoles();
      if (viewId === 'ld-view-chats')  ldRenderChatList();
      if (viewId === 'ld-view-square') ldRenderSquare();
      if (viewId === 'ld-view-me')     ldRenderMe();
    });
  });

  /* ---- 角色库 ---- */
  document.getElementById('btn-new-role').addEventListener('click', () => {
    ldOpenRoleModal(null);
  });

  // 头像文件上传
  document.getElementById('ld-role-avatar-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      ldRoleAvatarData = ev.target.result;
      document.getElementById('ld-role-avatar-preview').src = ldRoleAvatarData;
    };
    reader.readAsDataURL(file);
  });

  // 头像 URL
  document.getElementById('btn-ld-role-avatar-url').addEventListener('click', () => {
    const inp = document.getElementById('ld-role-avatar-url-input');
    inp.style.display = inp.style.display === 'none' ? 'block' : 'none';
  });
  document.getElementById('ld-role-avatar-url-input').addEventListener('change', e => {
    const url = e.target.value.trim();
    if (url) {
      ldRoleAvatarData = url;
      document.getElementById('ld-role-avatar-preview').src = url;
    }
  });

  document.getElementById('btn-ld-role-save').addEventListener('click', ldSaveRole);
  document.getElementById('btn-ld-role-cancel').addEventListener('click', () => {
    ldCloseModal('ld-modal-role');
  });

  /* ---- 对话界面 ---- */
  document.getElementById('ld-convo-back').addEventListener('click', () => {
    ldShowView('ld-view-chats');
    ldRenderChatList();
  });

  // 点击角色头像（小）触发 API 回复
  document.getElementById('ld-convo-send-avatar-btn').addEventListener('click', () => {
    ldSendMessage();
  });

  // 点击用户头像打开风格设置
  document.getElementById('ld-convo-user-wrap').addEventListener('click', () => {
    ldOpenStyleModal();
  });

  // 发送按钮
  document.getElementById('ld-notebook-send').addEventListener('click', ldSendMessage);

  // Enter 键发送
  document.getElementById('ld-notebook-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ldSendMessage();
    }
  });

  /* ---- 风格弹层 ---- */
  document.getElementById('btn-ld-style-save').addEventListener('click', ldSaveStyle);
  document.getElementById('btn-ld-style-cancel').addEventListener('click', () => {
    ldCloseModal('ld-modal-style');
  });

  /* ---- 动态广场 ---- */
  document.getElementById('btn-new-post').addEventListener('click', () => {
    document.getElementById('ld-post-input').value = '';
    ldOpenModal('ld-modal-post');
  });
  document.getElementById('btn-ld-post-save').addEventListener('click', ldAddPost);
  document.getElementById('btn-ld-post-cancel').addEventListener('click', () => {
    ldCloseModal('ld-modal-post');
  });

  document.getElementById('btn-ld-comment-save').addEventListener('click', ldAddComment);
  document.getElementById('btn-ld-comment-cancel').addEventListener('click', () => {
    ldCloseModal('ld-modal-comment');
  });

  /* ---- 我的界面 ---- */
  document.getElementById('ld-me-avatar-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      ldMe.avatar = ev.target.result;
      ldSave('halo_ld_me', ldMe);
      ldRenderMe();
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-edit-me-card').addEventListener('click', () => {
    document.getElementById('ld-me-name-input').value = ldMe.name || '';
    document.getElementById('ld-me-sig-input').value  = ldMe.sig  || '';
    ldOpenModal('ld-modal-me');
  });

  document.getElementById('btn-ld-me-save').addEventListener('click', ldSaveMe);
  document.getElementById('btn-ld-me-cancel').addEventListener('click', () => {
    ldCloseModal('ld-modal-me');
  });

  // 卷页设置入口
  document.getElementById('btn-ld-me-settings').addEventListener('click', () => {
    ldOpenInternalSettings();
  });

  /* ---- 蓝调内部设置 ---- */
  document.getElementById('btn-ld-clear-convo').addEventListener('click', ldClearCurrentConvo);
  document.getElementById('btn-ld-settings-close').addEventListener('click', () => {
    ldCloseModal('ld-modal-settings');
  });

  /* ---- 初始渲染 ---- */
  ldRenderMe();
}

