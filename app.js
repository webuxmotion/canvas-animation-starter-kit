import Ship from "./Ship.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let dpr;
let width;
let height;
let ship;
let prevTime = 0;

const keys = {
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false,
};

function init() {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

init();
ship = new Ship(width, height);

function loop(time) {
  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;
  ctx.clearRect(0, 0, width, height);

  ship.update({ delta, width, height, keys });
  ship.draw(ctx);

  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

window.addEventListener("resize", init);

requestAnimationFrame((time) => {
  prevTime = time;
  requestAnimationFrame(loop);
});
