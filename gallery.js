/* =====================================================
   gallery.js — 图片轮播组件
===================================================== */

let galleryUrls  = JSON.parse(localStorage.getItem('halo_gallery') || '[]');
let galleryIndex = 0;
let galleryTimer = null;

function renderGallery() {
  const inner  = document.getElementById('gallery-inner');
  const empty  = document.getElementById('gallery-empty');
  const dotsEl = document.getElementById('gallery-dots');

  inner.querySelectorAll('.gallery-img').forEach(el => el.remove());
  dotsEl.innerHTML = '';

  if (!galleryUrls.length) {
    empty.style.display = 'flex';
    if (galleryTimer) clearInterval(galleryTimer);
    return;
  }

  empty.style.display = 'none';
  galleryIndex = 0;

  galleryUrls.forEach((url, i) => {
    const img = document.createElement('img');
    img.className = 'gallery-img' + (i === 0 ? ' active' : '');
    img.src = url; img.alt = '';
    inner.insertBefore(img, dotsEl);

    const dot = document.createElement('div');
    dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
    dotsEl.appendChild(dot);
  });

  if (galleryTimer) clearInterval(galleryTimer);
  if (galleryUrls.length > 1) {
    galleryTimer = setInterval(advanceGallery, 10000);
  }
}

function advanceGallery() {
  const imgs = document.querySelectorAll('.gallery-img');
  const dots = document.querySelectorAll('.gallery-dot');
  if (!imgs.length) return;
  imgs[galleryIndex].classList.remove('active');
  dots[galleryIndex].classList.remove('active');
  galleryIndex = (galleryIndex + 1) % imgs.length;
  imgs[galleryIndex].classList.add('active');
  dots[galleryIndex].classList.add('active');
}

function applyGallery() {
  const raw = document.getElementById('gallery-url-input').value;
  galleryUrls = raw.split('\n').map(s => s.trim()).filter(Boolean);
  localStorage.setItem('halo_gallery', JSON.stringify(galleryUrls));
  renderGallery();
  closeModal('modal-gallery');
}

function initGallery() {
  renderGallery();

  document.getElementById('widget-gallery').addEventListener('click', () => {
    document.getElementById('gallery-url-input').value = galleryUrls.join('\n');
    openModal('modal-gallery');
  });
  document.getElementById('btn-gallery-apply').addEventListener('click', applyGallery);
  document.getElementById('btn-gallery-close').addEventListener('click', () => {
    closeModal('modal-gallery');
  });
}
