export type BulbEvent =
  | TouchTapEvent<BulbTemperatureSettings>
  | KeyUpEvent<BulbTemperatureSettings>
  | DialDownEvent<BulbTemperatureSettings>;
