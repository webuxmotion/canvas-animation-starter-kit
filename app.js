import Game from "./Game.js";
import BallsComposer from "./BallsComposer.js";
import Ship from "./Ship.js";

const { screen, input, ctx, start } = new Game("canvas");

const ship = new Ship({ screen });
const ballsComposer = new BallsComposer({ screen });

start((delta) => {
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
});
