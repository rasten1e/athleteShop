const slides = document.querySelector(".DivSliderSlides");
const slideCount = document.querySelectorAll(".DivSliderSlidesSlide").length;
const prevButton = document.querySelector(".ButtonPrev");
const nextButton = document.querySelector(".ButtonNext");
const slider = document.querySelector(".DivSlider");
let currentIndex = 0;
let autoPlayInterval;
function goToSlide(index) {
    if (index < 0) {
        index = slideCount - 1;
    } else if (index >= slideCount) {
        index = 0;
    }
    currentIndex = index;
    slides.style.transform = `translateX(${-index * 100}%)`;
}
prevButton.addEventListener("click", () => {
    goToSlide(currentIndex - 1);
});
nextButton.addEventListener("click", () => {
    goToSlide(currentIndex + 1);
});
function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
        goToSlide(currentIndex + 1);
    }, 5000);
}
startAutoPlay();