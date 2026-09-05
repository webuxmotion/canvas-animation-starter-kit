import Segment from "./Segment.js";
import SimpleSegment from "./SimpleSegment.js";

export default class Segments {
  constructor() {
    this.segment0 = new Segment(100, 20);
    this.segment1 = new Segment(200, 10);
    this.segment2 = new Segment(80, 40);

    this.simSegment0 = new SimpleSegment({ height: 100 });
    this.simSegment1 = new SimpleSegment({ height: 200 });
    this.simSegment2 = new SimpleSegment({ height: 80 });
    this.simSegment4 = new SimpleSegment({ height: 100 });

    this.rotation1 = 0;
    this.rotation2 = 0;

    this.rotationSpeed = Math.PI;
    this.angle = 0;

    this.#initGUI();
  }

  #initGUI() {
    const gui = new dat.GUI();
    const folder = gui.addFolder("Fountain Settings");

    folder.add(this, "rotation1", -90, 90).name("Rotation 1");
    folder.add(this, "rotation2", -90, 90).name("Rotation 2");

    folder.open();
  }

  tick({ ctx, delta }) {
    this.segment0.y = 50;
    this.segment0.x = 100;
    this.segment0.draw(ctx);
    this.segment1.x = 100;
    this.segment1.y = 80;
    this.segment1.draw(ctx);
    this.segment2.x = 100;
    this.segment2.y = 120;
    this.segment2.draw(ctx);

    this.simSegment1.x = 100 + 300;
    this.simSegment1.y = 80;
    this.simSegment1.rotation = this.rotation1 * (Math.PI / 180);
    this.simSegment1.draw(ctx);
    const pin = this.simSegment1.getPin();
    this.simSegment2.x = pin.x;
    this.simSegment2.y = pin.y;
    this.simSegment2.rotation = this.simSegment1.rotation + this.rotation2 * (Math.PI / 180);
    this.simSegment2.draw(ctx);

    const angle = Math.sin(this.angle) * (Math.PI / 2);
    this.simSegment0.x = 100 + 300;
    this.simSegment0.y = 200;
    this.simSegment0.rotation = angle;
    this.simSegment0.draw(ctx);
    const pin0 = this.simSegment0.getPin();
    this.simSegment4.x = pin0.x;
    this.simSegment4.y = pin0.y;
    this.simSegment4.rotation = this.simSegment0.rotation + angle;
    this.simSegment4.draw(ctx);

    this.angle += this.rotationSpeed * delta;
  }
}
