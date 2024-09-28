import {
  action,
  DialRotateEvent,
  DialUpEvent,
  JsonObject,
  KeyDownEvent,
  KeyUpEvent,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
} from '@elgato/streamdeck';
import { Actions } from '.';
import { DEFAULT_BULB_TEMP_VALUE } from '../utils/constants';

type BulbTemperatureSettings = {
  value: number;
  count?: number;
  incrementBy: number;
  isTurnedOn: boolean;
};

@action({ UUID: Actions.BulbTemperature })
export class BulbTemperature extends SingletonAction {
  /**
   * Sets the initial value when the action appears on Stream Deck.
   */
  override onWillAppear(ev: WillAppearEvent<BulbTemperatureSettings>): Promise<void> | void {
    // Verify that the action is a dial so we can call setFeedback.
    if (!ev.action.isDial()) return ev.action.setTitle(`${ev.payload.settings.value || '0'}`);

    ev.action.setFeedbackLayout('$B2');
    ev.action.setFeedback({
      title: 'Temperature',
      value: `${ev.payload.settings.value || DEFAULT_BULB_TEMP_VALUE}`,
      indicator: {
        value: ev.payload.settings.value || DEFAULT_BULB_TEMP_VALUE,
        bar_bg_c: '0:#f5d272,0.5:#ffffff,1:#15a3e8',
      },
    });
  }

  override async onKeyUp(ev: KeyUpEvent<BulbTemperatureSettings>): Promise<void> {
    this.toggleBulb(ev);
  }

  override onDialRotate(ev: DialRotateEvent<BulbTemperatureSettings>): Promise<void> | void {
    let { value = 50, incrementBy } = ev.payload.settings;
    const { ticks } = ev.payload; //negative ticks on ccw rotation
    incrementBy ??= ev.payload.settings.incrementBy || 1;

    value = Math.max(0, Math.min(100, value + ticks * incrementBy));

    ev.action.setFeedback({ value, indicator: { value } });
    ev.action.setSettings({ value, incrementBy });
  }

  override async onTouchTap(ev: TouchTapEvent<BulbTemperatureSettings>): Promise<void> {
    this.toggleBulb(ev);
  }

  toggleBulb(
    ev: TouchTapEvent<BulbTemperatureSettings> | KeyUpEvent<BulbTemperatureSettings>
  ): Promise<void> | void {
    const { isTurnedOn } = ev.payload.settings;
    ev.action.setSettings({ isTurnedOn: !isTurnedOn });

    if (!ev.action.isDial()) {
      return;
    }

    if (isTurnedOn) {
      ev.action.setFeedback({
        icon: 'imgs/actions/bulb-solid.svg',
      });
    } else {
      ev.action.setFeedback({
        icon: 'imgs/actions/bulb.svg',
      });
    }
  }
}
