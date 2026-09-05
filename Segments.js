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
  }

  tick({ ctx }) {
    this.segment0.y = 50;
    this.segment0.x = 100;
    this.segment0.draw(ctx);
    this.segment1.x = 100;
    this.segment1.y = 80;
    this.segment1.draw(ctx);
    this.segment2.x = 100;
    this.segment2.y = 120;
    this.segment2.draw(ctx);

    this.simSegment0.x = 100 + 300;
    this.simSegment0.y = 50;
    this.simSegment0.draw(ctx);
    this.simSegment1.x = 100 + 300;
    this.simSegment1.y = 80;
    this.simSegment1.draw(ctx);
    this.simSegment2.x = 100 + 300;
    this.simSegment2.y = 120;
    this.simSegment2.draw(ctx);
  }
}
