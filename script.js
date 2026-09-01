const stars = document.querySelector(".stars");

function createStar() {

    const star = document.createElement("div");

    star.classList.add("star");

    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 60 + "%";

    stars.appendChild(star);

    setTimeout(() => {
        star.remove();
    }, 2000);
}

setInterval(createStar, 700);