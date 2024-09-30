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
import {
  BULB_COOLEST_COLOR_IN_K,
  BULB_WARMEST_COLOR_IN_K,
  DEFAULT_BULB_TEMP_VALUE,
} from '../utils/constants';
import { getTemperatureCategory } from '../utils/getTemperatureCategory';
import { IFullStateResponse, WizLight } from 'wiz-light';
import { BulbEvent, IFullStateResponseWithTemp } from './types';

type BulbTemperatureSettings = {
  value: number;
  bulbIp: string;
  incrementBy: number;
  isTurnedOn: boolean;
};

@action({ UUID: Actions.BulbTemperature })
export class BulbTemperature extends SingletonAction {
  private async createWizLight(bulbIp: string): Promise<WizLight<string> | null> {
    if (!bulbIp) {
      console.error('Bulb IP is not defined');
      return null;
    }
    try {
      // @ts-ignore: wiz-light package typing issue
      return new WizLight(bulbIp);
    } catch (error) {
      console.error('Failed to create WizLight instance:', error);
      return null;
    }
  }
  private async updateUI(ev: any): Promise<void> {
    const { bulbIp } = ev.payload.settings;
    const wl = await this.createWizLight(bulbIp);
    if (!wl) return;

    try {
      const { result }: IFullStateResponseWithTemp = await wl.getStatus();
      ev.action.setImage(result.state ? 'imgs/actions/bulb-solid' : 'imgs/actions/bulb');
      const value = result.temp;
      if (ev.action.isDial()) {
        const normalizedValue =
          ((value - BULB_WARMEST_COLOR_IN_K) /
            (BULB_COOLEST_COLOR_IN_K - BULB_WARMEST_COLOR_IN_K)) *
          100;
        ev.action.setFeedback({
          icon: result.state ? 'imgs/actions/bulb-solid.svg' : 'imgs/actions/bulb.svg',
        });

        ev.action.setFeedback({
          value: `${result.temp}K`,
          indicator: { value: normalizedValue.toFixed(0) },
        });
      }
    } catch (error) {
      console.error('Failed to update UI:', error);
      ev.action.showAlert();
    }
  }
  private async toggleBulb(ev: BulbEvent): Promise<void> {
    const { bulbIp } = ev.payload.settings;
    const wl = await this.createWizLight(bulbIp);
    if (!wl) return;

    try {
      const { result } = await wl.getStatus();
      const response = await wl.setLightProps({ state: !result.state });
      if (!response) throw new Error('Failed to toggle bulb state');

      ev.action.setSettings({ ...ev.payload.settings, isTurnedOn: !result.state });
      if ('setState' in ev.action) {
        ev.action.setState(Number(!result.state));
      }
      await this.updateUI(ev);
    } catch (error) {
      console.error('Failed to toggle bulb:', error);
      ev.action.showAlert();
    }
  }

  override async onWillAppear(ev: WillAppearEvent<BulbTemperatureSettings>): Promise<void> {
    if (!ev.action.isDial()) return;

    const value = ev.payload.settings.value || DEFAULT_BULB_TEMP_VALUE;
    ev.action.setFeedbackLayout('$B2');
    ev.action.setFeedback({
      title: 'Color Temperature',
      value: `${value}`,
      indicator: {
        value,
        bar_bg_c: '0:#f5d272,0.5:#ffffff,1:#15a3e8',
      },
    });
    await this.updateUI(ev);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<JsonObject>): Promise<void> {
    await this.updateUI(ev);
  }

  override async onKeyUp(ev: KeyUpEvent<BulbTemperatureSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }

  override async onTouchTap(ev: TouchTapEvent<BulbTemperatureSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }

  override async onDialDown(ev: DialDownEvent<BulbTemperatureSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }

  override async onDialRotate(ev: DialRotateEvent<BulbTemperatureSettings>): Promise<void> {
    let { value = 0, incrementBy = 100, bulbIp } = ev.payload.settings;
    const { ticks } = ev.payload;

    // Constrain value within limits
    value = Math.max(
      BULB_WARMEST_COLOR_IN_K,
      Math.min(BULB_COOLEST_COLOR_IN_K, value + ticks * incrementBy)
    );

    const wl = await this.createWizLight(bulbIp);
    if (!wl) return;

    try {
      const { result } = await wl.getStatus();
      // @ts-expect-error: need to update wl types
      const response = await wl.setLightProps({ temp: value });

      if (!response) throw new Error('Failed to change bulb state');

      ev.action.setSettings({
        ...ev.payload.settings,
        value,
        incrementBy,
        isTurnedOn: result.state,
      });
      this.updateUI(ev);
    } catch (error) {
      console.error(error);
      ev.action.showAlert();
    }
  }
}
