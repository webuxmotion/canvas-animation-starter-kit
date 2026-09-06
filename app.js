import Game from "./Game.js";
import BallsComposer from "./BallsComposer.js";
import Ship from "./Ship.js";
import Fountain from "./Fountain.js";
import Segments from "./Segments.js";
import Easing from "./Easing.js";
import Spring from "./Spring.js";

const { screen, input, ctx, start } = new Game("canvas");

const ship = new Ship({ screen });
const ballsComposer = new BallsComposer({ screen });
const fountain = new Fountain({ screen, ballsCount: 100, color: "#7ed93f" });
const segments = new Segments();
const easing = new Easing({ screen });
const spring = new Spring({ screen });

start((delta) => {
  easing.tick({ ctx, delta, ship });
  spring.tick({ ctx, delta });
  segments.tick({
    ctx,
    delta,
  });

  ship.update({
    delta,
    screen,
    keys: input.keys,
  });
  ship.draw(ctx);

  ballsComposer.tick({
    delta,
    ctx,
    screen,
  });

  fountain.tick({
    delta,
    ctx,
    screen,
  });
});
