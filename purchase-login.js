/*
  purchase-login.js
  -------------------------------------------------
  MVP 用のフロントエンド分岐実装。
  実運用ではパスワードと購入URLをサーバー側で判定すること。
  ここに記載するパスワードはあくまで仮（プレースホルダ）です。
  -------------------------------------------------
*/

(() => {
  const passwordRoutes = {
    "shop-demo":     { label: "導入店／一般導入者",   url: "./purchase-shop.html" },
    "hiramori-demo": { label: "平森先生の塾生",       url: "./purchase-hiramori.html" },
    "ota-demo":      { label: "太田先生の塾生",       url: "./purchase-ota.html" },
  };

  const form = document.querySelector("[data-purchase-form]");
  const result = document.querySelector("[data-login-result]");
  if (!form || !result) return;

  const input = form.elements.password;

  const setStatus = (text, kind) => {
    result.textContent = text;
    result.classList.remove("is-success", "is-error");
    if (kind) result.classList.add(kind);
  };

  const shake = (el) => {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const raw = (input?.value ?? "").trim();
    if (!raw) {
      setStatus("パスワードを入力してください。", null);
      shake(input);
      input?.focus();
      return;
    }

    const route = passwordRoutes[raw];
    if (!route) {
      setStatus("パスワードが正しくありません。ご案内元にご確認ください。", "is-error");
      shake(input);
      input?.focus();
      input?.select();
      return;
    }

    setStatus(`${route.label} の購入ページへ進みます。`, "is-success");
    setTimeout(() => {
      window.location.assign(route.url);
    }, 600);
  });

  input?.addEventListener("input", () => {
    if (result.classList.contains("is-error")) {
      setStatus("パスワードを入力してください。", null);
    }
  });
})();
