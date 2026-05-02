const slides = document.querySelector(".DivSliderSlides");
const slideCount = document.querySelectorAll(".DivSliderSlidesSlide").length;
// Находим кнопки «Назад» и «Вперёд»
const prevButton = document.querySelector(".ButtonPrev");
const nextButton = document.querySelector(".ButtonNext");
// Находим сам слайдер (нужен для остановки автопрокрутки при наведении)
const slider = document.querySelector(".DivSlider");
let currentIndex = 0; // Переменная для хранения текущего индекса слайда
let autoPlayInterval; // Переменная для хранения интервала автопрокрутки
/**
 * Функция для смены слайдов
 * @param {number} index — индекс слайда, на который нужно перейти
 */
function goToSlide(index) {
    if (index < 0) {
        index = slideCount - 1; // Если текущий слайд первый, переходим на последний
    } else if (index >= slideCount) {
        index = 0; // Если текущий слайд последний, переходим на первый
    }
    currentIndex = index; // Запоминаем текущий индекс
    slides.style.transform = `translateX(${-index * 100}%)`; // Смещаем контейнер слайдов
}
// Добавляем обработчик клика для кнопки «Назад»
prevButton.addEventListener("click", () => {
    goToSlide(currentIndex - 1);
});
// Добавляем обработчик клика для кнопки «Вперёд»
nextButton.addEventListener("click", () => {
    goToSlide(currentIndex + 1);
});
/**
 * Функция запуска автоматического перелистывания слайдов
 * Устанавливает интервал на три секунды
 */
function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
        goToSlide(currentIndex + 1);
    }, 3000);
}
/**
 * Функция остановки автопрокрутки
 * Останавливает заданный ранее интервал
 */
function stopAutoPlay() {
    clearInterval(autoPlayInterval);
}
// Запускаем автопрокрутку при загрузке страницы
startAutoPlay();
// Останавливаем автопрокрутку, если пользователь навёл курсор на слайдер
slider.addEventListener("mouseenter", stopAutoPlay);
// Возобновляем автопрокрутку, когда пользователь убирает курсор
slider.addEventListener("mouseleave", startAutoPlay);