(function() {
  // 1) set --vh to actual window.innerHeight * 0.01
  function setRealVh() {
    document.documentElement.style.setProperty(
      '--vh',
      `${window.innerHeight * 0.01}px`
    );
  }
  setRealVh();
  window.addEventListener('resize', setRealVh);

  // 2) flipbook initialization
  $(function() {
    const fb = $('#flipbook');
    const exts = ['png','jpg','jpeg','mp4'];
    let pages = [], videoPageNum = null;

    async function exists(num, ext) {
      return new Promise(r => {
        if (ext === 'mp4') {
          const v = document.createElement('video');
          v.src = `assets/page${num}.${ext}`;
          v.onloadedmetadata = () => r(true);
          v.onerror = () => r(false);
        } else {
          const img = new Image();
          img.src = `assets/page${num}.${ext}`;
          img.onload  = () => r(true);
          img.onerror = () => r(false);
        }
      });
    }

    (async () => {
      // discover pages
      for (let i = 1; ; i++) {
        let found = null;
        for (let e of exts) {
          if (await exists(i, e)) { found = e; break; }
        }
        if (!found) break;
        pages.push({ num: i, ext: found, file: `page${i}.${found}` });
        if (found === 'mp4') videoPageNum = i;
      }

      if (!pages.length) {
        console.error('No page files found in assets/');
        return;
      }

      // build DOM
      pages.forEach((p, idx) => {
        const $pg = $('<div>').addClass('page');
        if (p.ext === 'mp4') {
          const $v = $('<video>', {
            id: 'video-page',
            muted: true,
            controls: false,
            preload: 'metadata'
          }).css({ width:'100%', height:'100%', objectFit:'cover' });
          $('<source>', {
            src: `assets/${p.file}`,
            type: 'video/mp4'
          }).appendTo($v);
          $pg.append($v);
        } else {
          $('<img>', {
            src: `assets/${p.file}`,
            alt: `Page ${p.num}`
          }).appendTo($pg);
        }

        // download banner on last page
        if (idx === pages.length - 1) {
          $('<a>', {
            href: 'https://drive.google.com/drive/folders/1RflXkSgh1AHwnBYUk3zVf06pVOywQc4J?usp=drive_link',
            target: '_blank',
            class: 'download-banner',
            title: 'Download Memories'
          }).append(
            $('<img>', {
              src: 'assets/icon_download.png',
              alt: 'Download Memories'
            })
          ).appendTo($pg);
        }

        fb.append($pg);
      });

      // initialize turn.js
      const videoEl = $('#video-page').get(0);
      fb.turn({
        width: 720,
        height: 1280,
        autoCenter: false,
        display: 'single',
        acceleration: true,
        gradients: true,
        elevation: 50,
        corners: 'tr,br',
        when: {
          turning: () => {
            if (videoEl) {
              videoEl.pause();
              videoEl.currentTime = 0;
            }
          },
          turned: (e, page) => {
            toggleArrows(page);
            if (page === videoPageNum && videoEl) {
              videoEl.muted = false;
              videoEl.controls = true;
              videoEl.play().catch(() => {});
            } else if (videoEl) {
              videoEl.controls = false;
            }
          }
        }
      });

      function toggleArrows(page) {
        $('#prev-btn')[ page <= 1           ? 'hide' : 'show' ]();
        $('#next-btn')[ page >= pages.length ? 'hide' : 'show' ]();
      }
      toggleArrows(1);

      // nav buttons, keyboard & touch
      $('#prev-btn').click(() => goTo(fb.turn('page') - 1));
      $('#next-btn').click(() => goTo(fb.turn('page') + 1));
      $(document).keydown(e => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(fb.turn('page') - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(fb.turn('page') + 1); }
      });
      let touchX = null;
      fb.on('touchstart', e => { touchX = e.originalEvent.touches[0].clientX; });
      fb.on('touchend',   e => {
        if (touchX === null) return;
        const dx = touchX - e.originalEvent.changedTouches[0].clientX;
        if (dx > 50)      goTo(fb.turn('page') + 1);
        else if (dx < -50) goTo(fb.turn('page') - 1);
        touchX = null;
      });

      // responsive scaling against real viewport
      function resizeFlipbook() {
        const vp = document.querySelector('.viewport');
        const w  = vp.clientWidth;
        const h  = vp.clientHeight;
        const s  = Math.min(w / 720, h / 1280);
        document.querySelector('.flipbook-container')
                .style.transform = `scale(${s})`;
      }
      window.addEventListener('load',  resizeFlipbook);
      window.addEventListener('resize', resizeFlipbook);

      function goTo(page) {
        page = Math.min(Math.max(page, 1), pages.length);
        toggleArrows(page);
        fb.turn('page', page);
      }
    })();
  });
})();
