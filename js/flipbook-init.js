(function() {
  // 1) real‐VH hack
  function setRealVh() {
    document.documentElement.style.setProperty(
      '--vh',
      `${window.innerHeight * 0.01}px`
    );
  }
  setRealVh();
  window.addEventListener('resize', setRealVh);

  // 2) unified exists() that works on file:// and http(s)://
  function exists(num, ext) {
    const url = `assets/page${num}.${ext}`;
    // If we’re on file://, do the old <img>/<video> probe
    if (location.protocol === 'file:') {
      return new Promise(resolve => {
        if (ext === 'mp4') {
          const v = document.createElement('video');
          v.src = url;
          v.onloadedmetadata = () => resolve(true);
          v.onerror        = () => resolve(false);
        } else {
          const img = new Image();
          img.src    = url;
          img.onload = () => resolve(true);
          img.onerror= () => resolve(false);
        }
      });
    }
    // Otherwise (http/https) use a HEAD fetch to avoid console 404 spam
    return fetch(url, { method: 'HEAD' })
      .then(res => res.ok)
      .catch(_ => false);
  }

  // 3) returns a Promise that resolves once turn.js is fully initialized
  function startFlipbook() {
    return (async () => {
      const fb = $('#flipbook');
      const exts = ['png','jpg','jpeg','mp4'];
      let pages = [], videoPageNum = null;

      // discover pages by probing until one number yields no files
      for (let i = 1; ; i++) {
        let found = null;
        for (let e of exts) {
          if (await exists(i, e)) {
            found = e;
            break;
          }
        }
        if (!found) break;
        pages.push({ num: i, ext: found, file: `page${i}.${found}` });
        if (found === 'mp4') videoPageNum = i;
      }

      if (!pages.length) {
        console.error('No page files found in assets/');
        return;
      }

      // build the DOM
      pages.forEach((p, idx) => {
        const $pg = $('<div>').addClass('page');
        if (p.ext === 'mp4') {
          const $v = $('<video>', {
            id: 'video-page',
            muted: true,
            controls: false,
            preload: 'metadata'
          }).css({ width:'100%', height:'100%', objectFit:'cover' });
          $('<source>', { src:`assets/${p.file}`, type:'video/mp4' }).appendTo($v);
          $pg.append($v);
        } else {
          $('<img>', { src:`assets/${p.file}`, alt:`Page ${p.num}` }).appendTo($pg);
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
              videoEl.muted    = false;
              videoEl.controls = true;
              videoEl.play().catch(()=>{});
            } else if (videoEl) {
              videoEl.controls = false;
            }
          }
        }
      });

      // helper to show/hide nav arrows
      function toggleArrows(page) {
        $('#prev-btn')[ page <= 1           ? 'hide' : 'show' ]();
        $('#next-btn')[ page >= pages.length ? 'hide' : 'show' ]();
      }
      toggleArrows(1);

      // navigation
      function goTo(page) {
        page = Math.min(Math.max(page, 1), pages.length);
        toggleArrows(page);
        fb.turn('page', page);
      }
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
        if (dx > 50)       goTo(fb.turn('page') + 1);
        else if (dx < -50) goTo(fb.turn('page') - 1);
        touchX = null;
      });

      // responsive scaling
      function resizeFlipbook() {
        const vp = document.querySelector('.viewport');
        const w  = vp.clientWidth;
        const h  = vp.clientHeight;
        const s  = Math.min(w/720, h/1280);
        document.querySelector('.flipbook-container')
                .style.transform = `scale(${s})`;
      }
      window.addEventListener('resize', resizeFlipbook);
      resizeFlipbook();

    })();
  }

  // 4) on load → wait for both the flipbook to init and a 2 s delay → hide loader/show viewport
  window.addEventListener('load', () => {
    const initPromise  = startFlipbook();
    const delayPromise = new Promise(res => setTimeout(res, 2000));
    Promise.all([initPromise, delayPromise]).then(() => {
      document.getElementById('loader').style.display        = 'none';
      document.querySelector('.viewport').style.visibility  = 'visible';
    });
  });
})();
