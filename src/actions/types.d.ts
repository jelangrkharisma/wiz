export type BulbEvent =
  | TouchTapEvent<BulbTemperatureSettings>
  | KeyUpEvent<BulbTemperatureSettings>
  | DialDownEvent<BulbTemperatureSettings>;

// Extend IFullStateResponse and add temperature to result
interface IFullStateResponseWithTemp extends IFullStateResponse {
  result: IFullStateResponse.result & {
    mac: string;
    rssi: string;
    src: string;
    sceneId: number;
    state: boolean;
    r: IColorRange;
    g: IColorRange;
    b: IColorRange;
    c: IColorRange;
    w: IColorRange;
    dimming: IBrightnessRange;
    temperature: number; // Add temperature directly
  };
}
