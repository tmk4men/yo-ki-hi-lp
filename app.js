(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // Service Worker — オフライン耐性 + 2回目以降の体感速度向上。本番（https）でのみ登録
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 70, 260)}ms`;
      observer.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  const yearEl = document.querySelector("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

  // YouTube facade: クリック時のみ iframe を生成し、サードパーティ Cookie の発火を遅延させる
  const facades = document.querySelectorAll(".video-facade");
  facades.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-video-id");
      const title = btn.getAttribute("data-video-title") || "YouTube video";
      const start = btn.getAttribute("data-video-start"); // seconds
      if (!id) return;
      const iframe = document.createElement("iframe");
      const startParam = start ? `&start=${start}` : "";
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${startParam}`;
      iframe.title = title;
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.setAttribute("allowfullscreen", "");
      const wrap = document.createElement("div");
      wrap.className = "video-shell";
      wrap.appendChild(iframe);
      btn.replaceWith(wrap);
    }, { once: true });
  });

  // 仮置きの購入リンクをクリックしたとき、無反応に見えないよう案内トーストを出す
  const placeholders = document.querySelectorAll("[data-purchase-placeholder]");
  if (placeholders.length) {
    placeholders.forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const itemName = el.getAttribute("data-purchase-placeholder") || "";
        showToast(`${itemName}の購入ページは準備中です。実URLが届き次第、こちらから直接ご購入いただけるようになります。`);
      });
    });
  }

  function showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("is-visible"), 3800);
  }

  // モバイル用スティッキー CTA — Hero と Products の中間でだけ表示
  const stickyCTA = document.querySelector("[data-sticky-cta]");
  if (stickyCTA && "IntersectionObserver" in window) {
    const heroEl = document.querySelector(".hero");
    const productsEl = document.querySelector("#products");
    let heroVisible = true;
    let productsVisible = false;

    const update = () => {
      const shouldShow = !heroVisible && !productsVisible;
      stickyCTA.classList.toggle("is-visible", shouldShow);
    };

    if (heroEl) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        update();
      }, { threshold: 0.18 }).observe(heroEl);
    }
    if (productsEl) {
      new IntersectionObserver(([entry]) => {
        productsVisible = entry.isIntersecting;
        update();
      }, { threshold: 0.05 }).observe(productsEl);
    }
  }

  // mark current section in nav for #-anchored top page
  const navLinks = document.querySelectorAll(".main-nav a[href^='#']");
  if (navLinks.length && "IntersectionObserver" in window) {
    const sections = Array.from(navLinks)
      .map((a) => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          navLinks.forEach((a) => {
            if (a.getAttribute("href") === `#${id}`) {
              a.setAttribute("aria-current", "page");
            } else {
              a.removeAttribute("aria-current");
            }
          });
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach((s) => sectionObserver.observe(s));
  }
})();
