/* =====================================================
   app.js — 主逻辑：弹层工具、页面滑动、模块初始化
===================================================== */

/* =====================================================
   弹层工具函数（全局，供各模块调用）
===================================================== */
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

/* 阻止弹层内点击冒泡，防止误触底层组件 */
document.querySelectorAll('.modal-box').forEach(box => {
  box.addEventListener('click', e => e.stopPropagation());
});

/* =====================================================
   页面滑动（触摸 + 鼠标）
===================================================== */
(function initSwipe() {
  const wrapper    = document.getElementById('pages-wrapper');
  const dots       = document.querySelectorAll('#page-dots .dot');
  const totalPages = 2;
  let currentPage  = 0;
  let startX = 0, startY = 0, isDragging = false;

  function goTo(idx) {
    currentPage = Math.max(0, Math.min(totalPages - 1, idx));
    wrapper.style.transform = `translateX(-${currentPage * 50}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === currentPage));
  }

  wrapper.addEventListener('touchstart', e => {
    startX     = e.touches[0].clientX;
    startY     = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  wrapper.addEventListener('touchend', e => {
    if (!isDragging) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      goTo(dx < 0 ? currentPage + 1 : currentPage - 1);
    }
    isDragging = false;
  }, { passive: true });

  wrapper.addEventListener('mousedown', e => {
    startX     = e.clientX;
    isDragging = true;
  });

  window.addEventListener('mouseup', e => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) goTo(dx < 0 ? currentPage + 1 : currentPage - 1);
    isDragging = false;
  });

  dots.forEach(d => {
    d.addEventListener('click', () => goTo(+d.dataset.idx));
  });
})();

/* =====================================================
   全局初始化（DOM Ready）
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initCalendar();   // calendar.js
  initGallery();    // gallery.js
  initSettings();   // settings.js（含 chat / API / 美化 / 数据）
  initLandiao();    // landiao.js（蓝调 App）
});
