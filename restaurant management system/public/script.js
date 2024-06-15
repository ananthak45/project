// script.js
function smoothScroll(event) {
    event.preventDefault();
    const targetId = event.currentTarget.getAttribute('href').substring(1);
    const targetSection = document.getElementById(targetId);
    
    window.scrollTo({
        top: targetSection.offsetTop,
        behavior: 'smooth'
    });
}
