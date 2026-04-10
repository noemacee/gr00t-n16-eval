// Autoplay all videos when they enter the viewport
document.addEventListener("DOMContentLoaded", function () {
  const videos = document.querySelectorAll("video[autoplay]");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.play();
          } else {
            entry.target.pause();
          }
        });
      },
      { threshold: 0.3 }
    );
    videos.forEach((v) => observer.observe(v));
  }
});
