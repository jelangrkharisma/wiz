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
  WillDisappearEvent,
} from '@elgato/streamdeck';
import { Actions } from '.';
import {
  BULB_COOLEST_COLOR_IN_K,
  BULB_MAX_BRIGHTNESS,
  BULB_MIN_BRIGHTNESS,
  BULB_WARMEST_COLOR_IN_K,
  DEFAULT_AUTOREFRESH_INTERVAL_IN_MS,
  DEFAULT_BULB_TEMP_VALUE,
} from '../utils/constants';
import { getTemperatureCategory } from '../utils/getTemperatureCategory';
import { IFullStateResponse, WizLight } from 'wiz-light';
import { BulbEvent, IFullStateResponseWithTemp } from './types';

type BulbDimmerSettings = {
  value: number;
  bulbIp: string;
  incrementBy: number;
  isTurnedOn: boolean;
};

@action({ UUID: Actions.BulbDimmer })
export class BulbDimmer extends SingletonAction {
  private updateInterval: NodeJS.Timeout | null = null;

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
      ev.action.setImage(result.state ? 'imgs/actions/sun-solid' : 'imgs/actions/sun');
      const value = result.temp;
      if (ev.action.isDial()) {
        ev.action.setFeedback({
          icon: result.state ? 'imgs/actions/sun-solid.svg' : 'imgs/actions/sun.svg',
        });

        ev.action.setFeedback({
          value: `${result.dimming}%`,
          indicator: { value: result.dimming },
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
      const response = await wl.setLightProps({
        state: !result.state,
        dimming: result.dimming,
        // @ts-expect-error: need to update/extends wl types
        temp: result.temp,
      });
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

  // auto update related methods
  private startAutoUpdate(ev: any, interval: number = DEFAULT_AUTOREFRESH_INTERVAL_IN_MS): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval); // Clear existing interval if running
    }

    this.updateInterval = setInterval(async () => {
      await this.updateUI(ev); // Call updateUI at regular intervals
    }, interval);
  }
  private stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  override async onWillAppear(ev: WillAppearEvent<BulbDimmerSettings>): Promise<void> {
    if (!ev.action.isDial()) return;

    const value = ev.payload.settings.value || DEFAULT_BULB_TEMP_VALUE;
    ev.action.setFeedback({
      value: `${value}`,
    });
    await this.updateUI(ev);
    this.startAutoUpdate(ev);
  }
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<JsonObject>): Promise<void> {
    await this.updateUI(ev);
  }
  override async onWillDisappear(ev: WillDisappearEvent<BulbDimmerSettings>): Promise<void> {
    this.stopAutoUpdate();
  }

  override async onKeyUp(ev: KeyUpEvent<BulbDimmerSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }
  override async onTouchTap(ev: TouchTapEvent<BulbDimmerSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }

  override async onDialDown(ev: DialDownEvent<BulbDimmerSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }
  override async onDialRotate(ev: DialRotateEvent<BulbDimmerSettings>): Promise<void> {
    let { value = 0, incrementBy = 1, bulbIp } = ev.payload.settings;
    const { ticks } = ev.payload;

    // Constrain value within limits
    value = Math.max(
      BULB_MIN_BRIGHTNESS,
      Math.min(BULB_MAX_BRIGHTNESS, value + ticks * incrementBy)
    );

    const wl = await this.createWizLight(bulbIp);
    if (!wl) return;

    try {
      const { result } = await wl.getStatus();
      const response = await wl.setLightProps({
        // @ts-expect-error: need to update wl types
        temp: result.temp,
        // @ts-expect-error: need to update wl types
        dimming: value,
      });

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
