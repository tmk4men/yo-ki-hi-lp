const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.16,
    rootMargin: "0px 0px -40px 0px",
  }
);

reveals.forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 70, 260)}ms`;
  observer.observe(element);
});

const year = document.querySelector("#year");
if (year) {
  year.textContent = new Date().getFullYear().toString();
}
