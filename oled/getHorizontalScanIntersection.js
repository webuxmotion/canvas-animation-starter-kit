export default function getHorizontalScanIntersection(
  A,
  B,
  yLine,
  outPoint = null,
) {
  if ((A.y < yLine && B.y < yLine) || (A.y > yLine && B.y > yLine)) {
    return false;
  }

  const isPointReturn = outPoint ? false : true;

  const dy = B.y - A.y;
  if (dy === 0) {
    return false;
  }

  if (isPointReturn) {
    const outPoint = {};
    outPoint.x = A.x + ((yLine - A.y) * (B.x - A.x)) / dy;
    outPoint.y = yLine;

    return outPoint;
  } else {
    outPoint.x = A.x + ((yLine - A.y) * (B.x - A.x)) / dy;
    outPoint.y = yLine;
  }

  return true;
}
