import BallsComposer from "./BallsComposer.js";
import Ship from "./Ship.js";
import InputHandler from "./InputHandler.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let dpr;
let width;
let height;
let input;
let prevTime = 0;

let ship;
let ballsComposer;

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
input = new InputHandler();
ship = new Ship({ width, height });

ballsComposer = new BallsComposer({ width, height });

function loop(time) {
  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;
  ctx.clearRect(0, 0, width, height);

  ship.update({ delta, width, height, keys: input.keys });
  ship.draw(ctx);

  ballsComposer.tick({ delta, ctx, width, height });

  requestAnimationFrame(loop);
}

window.addEventListener("resize", init);

requestAnimationFrame((time) => {
  prevTime = time;
  requestAnimationFrame(loop);
});
