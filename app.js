import { SquareAnimation } from "./SquareAnimation.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let dpr;
let width;
let height;
let prevTime = 0;

const square = new SquareAnimation(1000, 20);

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

function loop(time) {
  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;
  ctx.clearRect(0, 0, width, height);

  square.update(delta, width, height);
  square.draw(ctx);

  requestAnimationFrame(loop);
}

window.addEventListener("resize", init);
init();
requestAnimationFrame((time) => {
  prevTime = time;
  requestAnimationFrame(loop);
});
