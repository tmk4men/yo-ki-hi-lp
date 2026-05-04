const passwordRoutes = {
  "shop-demo": {
    label: "導入店/一般導入者",
    url: "#shop-purchase",
  },
  "hiramori-demo": {
    label: "平森先生の塾生",
    url: "#hiramori-purchase",
  },
  "ota-demo": {
    label: "太田先生の塾生",
    url: "#ota-purchase",
  },
};

const purchaseForm = document.querySelector("[data-purchase-form]");
const loginResult = document.querySelector("[data-login-result]");

if (purchaseForm) {
  purchaseForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const password = purchaseForm.elements.password.value.trim();
    const route = passwordRoutes[password];

    if (!password) {
      loginResult.textContent = "パスワードを入力してください。";
      loginResult.classList.remove("is-success");
      return;
    }

    if (!route) {
      loginResult.textContent = "パスワードが正しくありません。";
      loginResult.classList.remove("is-success");
      return;
    }

    loginResult.textContent = `${route.label} の購入ページへ進みます。`;
    loginResult.classList.add("is-success");
    window.location.hash = route.url.replace("#", "");
  });
}
