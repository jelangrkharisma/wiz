import {
  action,
  DialRotateEvent,
  DialUpEvent,
  DidReceiveSettingsEvent,
  JsonObject,
  KeyDownEvent,
  KeyUpEvent,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
} from '@elgato/streamdeck';

import { Actions } from '.';
import { DEFAULT_BULB_TEMP_VALUE } from '../utils/constants';
import { WizLight } from 'wiz-light';

type BulbTemperatureSettings = {
  value: number;
  bulbIp: string;
  incrementBy: number;
  isTurnedOn: boolean;
};

@action({ UUID: Actions.BulbTemperature })
export class BulbTemperature extends SingletonAction {
  override onWillAppear(ev: WillAppearEvent<BulbTemperatureSettings>): Promise<void> | void {
    // Verify that the action is a dial so we can call setFeedback.
    if (!ev.action.isDial()) return;

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
    let { value = 0, incrementBy, bulbIp } = ev.payload.settings;
    const { ticks } = ev.payload; //negative ticks on ccw rotation
    incrementBy ??= ev.payload.settings.incrementBy || 1;

    value = Math.max(0, Math.min(100, value + ticks * incrementBy));

    ev.action.setTitle(bulbIp);
    ev.action.setFeedback({ value, indicator: { value } });
    ev.action.setSettings({ ...ev.payload.settings, value, incrementBy, bulbIp });
  }

  override async onTouchTap(ev: TouchTapEvent<BulbTemperatureSettings>): Promise<void> {
    this.toggleBulb(ev);
  }

  async toggleBulb(
    ev: TouchTapEvent<BulbTemperatureSettings> | KeyUpEvent<BulbTemperatureSettings>
  ): Promise<void> {
    const { bulbIp } = ev.payload.settings;
    try {
      console.log(bulbIp);
      // toggle
      // @ts-ignore: weird WizLight constructor typing. it only allow direct string input instead of variables
      const wl = new WizLight(bulbIp);
      const { result } = await wl.getStatus();
      const response = await wl.setLightProps({
        state: !result.state,
      });
      if (response) {
        // successful state changes
        ev.action.setSettings({ ...ev.payload.settings, isTurnedOn: result.state });
        ev.action.setImage(
          ev.payload.settings.isTurnedOn ? 'imgs/actions/bulb-solid.svg' : 'imgs/actions/bulb.svg'
        );

        if (ev.action.isDial()) {
          ev.action.setFeedback({
            icon: !result.state ? 'imgs/actions/bulb-solid.svg' : 'imgs/actions/bulb.svg',
          });
        }
      } else {
        throw new Error('failed to change bulb state');
      }
    } catch (error) {
      console.log(error);
    }
  }
}
