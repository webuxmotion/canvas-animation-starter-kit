import InputHandler from "./InputHandler.js";

export default class Game {
  #canvas;
  #prevTime = 0;
  #userLoop = null;

  constructor(canvasId) {
    this.#canvas = document.getElementById(canvasId);
    this.ctx = this.#canvas.getContext("2d");
    this.input = new InputHandler();

    this.resize = this.resize.bind(this);
    this.loop = this.#loop.bind(this);

    this.resize();
    window.addEventListener("resize", this.resize);

    return {
      ctx: this.ctx,
      input: this.input,
      screen: {
        get width() { return window.innerWidth; },
        get height() { return window.innerHeight; }
      },
      start: (loopCallback) => this.#start(loopCallback)
    };
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.#canvas.width = this.width * this.dpr;
    this.#canvas.height = this.height * this.dpr;
    
    this.#canvas.style.width = `${this.width}px`;
    this.#canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  #start(loopCallback) {
    this.#userLoop = loopCallback;
    requestAnimationFrame((time) => {
      this.#prevTime = time;
      requestAnimationFrame((t) => this.#loop(t));
    });
  }

  #loop(time) {
    const delta = Math.min((time - this.#prevTime) / 1000, 0.1);
    this.#prevTime = time;
    this.ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

    if (this.#userLoop) {
      this.#userLoop(delta);
    }

    requestAnimationFrame((t) => this.#loop(t));
  }
}
