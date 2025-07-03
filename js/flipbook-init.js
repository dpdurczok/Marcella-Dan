(function() {
  // 1) real VH hack
  function setRealVh() {
    document.documentElement.style.setProperty(
      '--vh',
      `${window.innerHeight * 0.01}px`
    );
  }
  setRealVh();
  window.addEventListener('resize', setRealVh);

  // 2) declare flipbook logic
  function startFlipbook() {
    const fb = $('#flipbook');
    const exts = ['png','jpg','jpeg','mp4'];
    let pages = [], videoPageNum = null;

    async function exists(num, ext) {
      try {
        const res = await fetch(`assets/page${num}.${ext}`, { method:'HEAD' });
        return res.ok;
      } catch {
        return false;
      }
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

        // last‐page download banner
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

      function goTo(page) {
        page = Math.min(Math.max(page, 1), pages.length);
        toggleArrows(page);
        fb.turn('page', page);
      }

      // nav buttons, keys & touch
      $('#prev-btn').click(() => goTo(fb.turn('page') - 1));
      $('#next-btn').click(() => goTo(fb.turn('page') + 1));
      $(document).keydown(e => {
        if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(fb.turn('page') - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(fb.turn('page') + 1); }
      });
      let touchX = null;
      fb.on('touchstart', e => { touchX = e.originalEvent.touches[0].clientX; });
      fb.on('touchend', e => {
        if (touchX === null) return;
        const dx = touchX - e.originalEvent.changedTouches[0].clientX;
        if (dx > 50)       goTo(fb.turn('page') + 1);
        else if (dx < -50) goTo(fb.turn('page') - 1);
        touchX = null;
      });

      // scaling
      function resizeFlipbook() {
        const vp = document.querySelector('.viewport');
        const w  = vp.clientWidth;
        const h  = vp.clientHeight;
        const s  = Math.min(w / 720, h / 1280);
        document.querySelector('.flipbook-container')
                .style.transform = `scale(${s})`;
      }
      window.addEventListener('resize', resizeFlipbook);
      resizeFlipbook();
    })();
  }

  // 3) on window.load → wait 2 s → hide loader & start
  window.addEventListener('load', () => {
    // ensure vh is correct after load UI bars settle
    setRealVh();
    setTimeout(() => {
      document.getElementById('loader').style.display = 'none';
      document.querySelector('.viewport').style.visibility = 'visible';
      startFlipbook();
    }, 2000);
  });
})();
