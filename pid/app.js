import Game from "../Game.js";
import PID from "./PID.js";

const { screen, input, ctx, start } = new Game("canvas");

const pid = new PID({ screen });

start((delta) => {
  pid.update({
    delta,
    screen,
    keys: input.keys,
  });
  pid.draw(ctx, screen);
});
