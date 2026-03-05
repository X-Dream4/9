/* =====================================================
   calendar.js — 日历显示 & 倒计时组件
===================================================== */

const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06aa0,0x0a6b6,0x056a0,0x02b40,0x0acb5,
  0x09270,0x04970,
];

const LUNAR_MONTHS = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const LUNAR_DAYS   = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十',
];

const SOLAR_FESTIVALS = {
  '1-1':'元旦','2-14':'情人节','3-8':'妇女节','4-1':'愚人节',
  '5-1':'劳动节','5-4':'青年节','6-1':'儿童节','7-1':'建党节',
  '8-1':'建军节','9-10':'教师节','10-1':'国庆节','12-25':'圣诞节',
};
const LUNAR_FESTIVALS = {
  '1-1':'春节','1-15':'元宵节','5-5':'端午节','7-7':'七夕',
  '7-15':'中元节','8-15':'中秋节','9-9':'重阳节','12-30':'除夕',
};
const JIEQI_TABLE = {
  '1-6':'小寒','1-20':'大寒','2-4':'立春','2-19':'雨水',
  '3-6':'惊蛰','3-21':'春分','4-5':'清明','4-20':'谷雨',
  '5-6':'立夏','5-21':'小满','6-6':'芒种','6-21':'夏至',
  '7-7':'小暑','7-23':'大暑','8-7':'立秋','8-23':'处暑',
  '9-8':'白露','9-23':'秋分','10-8':'寒露','10-23':'霜降',
  '11-7':'立冬','11-22':'小雪','12-7':'大雪','12-22':'冬至',
};

function _leapMonth(y)    { return LUNAR_INFO[y - 1900] & 0xf; }
function _leapDays(y)     { return _leapMonth(y) ? ((LUNAR_INFO[y-1900] & 0x10000) ? 30 : 29) : 0; }
function _monthDays(y, m) { return (LUNAR_INFO[y-1900] & (0x10000 >> m)) ? 30 : 29; }
function _yearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y-1900] & i) ? 1 : 0;
  return sum + _leapDays(y);
}

function getLunarDate(date) {
  const baseDate = new Date(1900, 0, 31);
  let offset = Math.floor((date - baseDate) / 86400000);
  let lunarYear, temp = 0;

  for (lunarYear = 1900; lunarYear < 2050 && temp <= offset; lunarYear++) {
    temp += _yearDays(lunarYear);
  }
  lunarYear--;
  temp -= _yearDays(lunarYear);
  offset -= temp;

  const leap = _leapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth, lunarDay;

  for (let i = 1; i <= 12; i++) {
    let days = (leap === i && !isLeap) ? _leapDays(lunarYear) : _monthDays(lunarYear, i);
    if (offset < days) { lunarMonth = i; lunarDay = offset + 1; break; }
    offset -= days;
    if (leap === i && !isLeap) { isLeap = true; i--; }
  }

  return {
    year: lunarYear, month: lunarMonth, day: lunarDay, isLeap,
    monthName: (isLeap ? '闰' : '') + LUNAR_MONTHS[lunarMonth - 1] + '月',
    dayName: LUNAR_DAYS[lunarDay - 1],
  };
}

function updateDateDisplay() {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  document.getElementById('disp-year-month').textContent =
    `${now.getFullYear()} · ${String(month).padStart(2, '0')}`;
  document.getElementById('disp-day').textContent = String(day).padStart(2, '0');

  const solarKey = `${month}-${day}`;
  let lunarStr = '';
  try {
    const lunar    = getLunarDate(now);
    const lunarKey = `${lunar.month}-${lunar.day}`;
    const festival = SOLAR_FESTIVALS[solarKey]
      || LUNAR_FESTIVALS[lunarKey]
      || JIEQI_TABLE[solarKey]
      || '';
    lunarStr = `${lunar.monthName}${lunar.dayName}` + (festival ? `  ${festival}` : '');
  } catch(e) {
    lunarStr = '农历加载中';
  }
  document.getElementById('disp-lunar').textContent = lunarStr;
}

/* ---------- 倒计时 ---------- */
let cdItems = JSON.parse(localStorage.getItem('halo_cd') || '[]');
let cdIndex = 0;
let cdTimer = null;

function saveCd() { localStorage.setItem('halo_cd', JSON.stringify(cdItems)); }

function calcCdDays(item) {
  const today  = new Date(); today.setHours(0,0,0,0);
  const target = new Date(item.date); target.setHours(0,0,0,0);
  const diff   = Math.round((today - target) / 86400000);
  return item.type === 'anniversary'
    ? { num: diff,  unit: '天' }
    : { num: -diff, unit: '天' };
}

function renderCdDisplay() {
  if (!cdItems.length) {
    document.getElementById('cd-title').textContent = '点击添加记录';
    document.getElementById('cd-num').textContent   = '—';
    document.getElementById('cd-unit').textContent  = '';
    return;
  }
  const item = cdItems[cdIndex % cdItems.length];
  const { num, unit } = calcCdDays(item);
  document.getElementById('cd-title').textContent = item.title;
  document.getElementById('cd-num').textContent   = Math.abs(num);
  document.getElementById('cd-unit').textContent  = unit;
}

function renderCdList() {
  const el = document.getElementById('cd-list');
  el.innerHTML = '';
  cdItems.forEach((item, idx) => {
    const { num } = calcCdDays(item);
    const div = document.createElement('div');
    div.className = 'cd-item';
    div.innerHTML = `
      <div class="cd-item-info">
        <div class="cd-item-name">${item.title}</div>
        <div class="cd-item-date">
          ${item.date} · ${item.type === 'anniversary' ? '已过' : '还剩'} ${Math.abs(num)} 天
        </div>
      </div>
      <button class="btn-del" data-idx="${idx}">✕</button>
    `;
    el.appendChild(div);
  });
  el.querySelectorAll('.btn-del').forEach(btn => {
    btn.addEventListener('click', () => {
      cdItems.splice(+btn.dataset.idx, 1);
      saveCd(); renderCdList(); renderCdDisplay();
    });
  });
}

function addCdItem() {
  const title = document.getElementById('cd-input-title').value.trim();
  const date  = document.getElementById('cd-input-date').value;
  const type  = document.getElementById('cd-input-type').value;
  if (!title || !date) { alert('请填写标题和日期'); return; }
  cdItems.push({ title, date, type });
  saveCd(); renderCdList(); renderCdDisplay();
  document.getElementById('cd-input-title').value = '';
  document.getElementById('cd-input-date').value  = '';
}

function startCdCarousel() {
  if (cdTimer) clearInterval(cdTimer);
  cdTimer = setInterval(() => {
    if (cdItems.length > 1) {
      cdIndex = (cdIndex + 1) % cdItems.length;
      renderCdDisplay();
    }
  }, 3000);
}

function initCalendar() {
  updateDateDisplay();
  setInterval(updateDateDisplay, 60000);
  renderCdDisplay();
  startCdCarousel();

  document.getElementById('cd-right').addEventListener('click', () => {
    renderCdList();
    openModal('modal-countdown');
  });
  document.getElementById('btn-cd-add').addEventListener('click', addCdItem);
  document.getElementById('btn-cd-close').addEventListener('click', () => {
    closeModal('modal-countdown');
  });
}
