import {
  action,
  DialDownEvent,
  DialRotateEvent,
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
import { BulbEvent } from './types';

type BulbTemperatureSettings = {
  value: number;
  bulbIp: string;
  incrementBy: number;
  isTurnedOn: boolean;
};

@action({ UUID: Actions.BulbTemperature })
export class BulbTemperature extends SingletonAction {
  override async onWillAppear(ev: WillAppearEvent<BulbTemperatureSettings>): Promise<void> {
    // Verify that the action is a dial so we can call setFeedback.
    if (!ev.action.isDial()) return;

    ev.action.setFeedbackLayout('$B2');
    ev.action.setFeedback({
      title: 'Color Temperature',
      value: `${ev.payload.settings.value || DEFAULT_BULB_TEMP_VALUE}`,
      indicator: {
        value: ev.payload.settings.value || DEFAULT_BULB_TEMP_VALUE,
        bar_bg_c: '0:#f5d272,0.5:#ffffff,1:#15a3e8',
      },
    });
    this.updateUI(ev);
  }
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<JsonObject>): Promise<void> {
    this.updateUI(ev);
  }

  override async onKeyUp(ev: KeyUpEvent<BulbTemperatureSettings>): Promise<void> {
    this.toggleBulb(ev);
  }
  override async onDialRotate(ev: DialRotateEvent<BulbTemperatureSettings>): Promise<void> {
    let { value = 0, incrementBy, bulbIp } = ev.payload.settings;
    const { ticks } = ev.payload; //negative ticks on ccw rotation
    incrementBy ??= ev.payload.settings.incrementBy || 100;

    const LAMP_WARMEST_K = 2700;
    const LAMP_COOLEST_K = 6500;

    value = Math.max(LAMP_WARMEST_K, Math.min(LAMP_COOLEST_K, value + ticks * incrementBy));
    const normalizedValue = ((value - LAMP_WARMEST_K) / (LAMP_COOLEST_K - LAMP_WARMEST_K)) * 100;
    const category =
      normalizedValue <= 25
        ? 'Warmest'
        : normalizedValue <= 50
        ? 'Warm'
        : normalizedValue <= 75
        ? 'Neutral'
        : 'Cool';

    try {
      const { bulbIp } = ev.payload.settings;
      // @ts-ignore: weird WizLight constructor typing. it only allow direct string input instead of variables
      const wl = new WizLight(bulbIp);
      const { result } = await wl.getStatus();
      console.log(result); // {mac: 'cc---fc', rssi: -57, state: true, sceneId: 0, temp: 6500}

      const response = await wl.setLightProps({
        // @ts-ignore: need to update wizlight package to handle temp, old packages use 'w' instead of 'temp' attribute
        temp: result.temp + ticks * incrementBy,
      });
      if (response) {
        // successful state changes
        ev.action.setSettings({ ...ev.payload.settings, isTurnedOn: result.state });
        this.updateUI(ev);
      } else {
        ev.action.showAlert();
        throw new Error('failed to change bulb state');
      }
    } catch (error) {
      ev.action.showAlert();
    }

    ev.action.setFeedback({
      value: normalizedValue.toFixed(0) + '%',
      indicator: { value: normalizedValue.toFixed(0) },
    });
    ev.action.setTitle(`${category} (${value}K)`);
    ev.action.setSettings({ ...ev.payload.settings, value, incrementBy, bulbIp });
    this.updateUI(ev);
  }
  override async onTouchTap(ev: TouchTapEvent<BulbTemperatureSettings>): Promise<void> {
    this.toggleBulb(ev);
  }
  override async onDialDown(ev: DialDownEvent<BulbTemperatureSettings>): Promise<void> {
    this.toggleBulb(ev);
  }

  async toggleBulb(ev: BulbEvent): Promise<void> {
    try {
      const { bulbIp } = ev.payload.settings;
      // @ts-ignore: weird WizLight constructor typing. it only allow direct string input instead of variables
      const wl = new WizLight(bulbIp);
      const { result } = await wl.getStatus();
      const response = await wl.setLightProps({
        state: !result.state,
      });
      if (response) {
        // successful state changes
        ev.action.setSettings({ ...ev.payload.settings, isTurnedOn: result.state });

        if ('setState' in ev.action) {
          // setState only available on key events
          ev.action.setState(Number(Boolean(result.state)));
        }

        this.updateUI(ev);
      } else {
        ev.action.showAlert();
        throw new Error('failed to change bulb state');
      }
    } catch (error) {
      await ev.action.showAlert();
      console.log(error);
    }
  }
  async updateUI(ev: any) {
    const { bulbIp } = ev.payload.settings;
    // @ts-ignore: weird WizLight constructor typing. it only allow direct string input instead of variables
    const wl = new WizLight(bulbIp);
    const { result } = await wl.getStatus();
    ev.action.setImage(
      ev.payload.settings.isTurnedOn ? 'imgs/actions/bulb-solid' : 'imgs/actions/bulb'
    );

    if (ev.action.isDial()) {
      ev.action.setFeedback({
        icon: result.state ? 'imgs/actions/bulb-solid.svg' : 'imgs/actions/bulb.svg',
      });
    }
  }
}
