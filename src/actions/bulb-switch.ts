import {
  action,
  DidReceiveSettingsEvent,
  KeyUpEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from '@elgato/streamdeck';
import { Actions } from '.';
import { WizLight } from 'wiz-light';
import { BulbEvent, IFullStateResponseWithTemp } from './types';
import { DEFAULT_AUTOREFRESH_INTERVAL_IN_MS, DEFAULT_BULB_TEMP_VALUE } from '../utils/constants';

type BulbSwitchSettings = {
  tempValue: number;
  dimmerValue: number;
  bulbIp: string;
};

@action({ UUID: Actions.BulbSwitch })
export class BulbSwitch extends SingletonAction {
  private updateInterval: NodeJS.Timeout | null = null;
  private currentBackoffIndex: number = 0;
  private readonly fibonacciSequence: number[] = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

  private getFibonacciBackoffMs(): number {
    const multiplier =
      this.fibonacciSequence[this.currentBackoffIndex] ||
      this.fibonacciSequence[this.fibonacciSequence.length - 1];
    return DEFAULT_AUTOREFRESH_INTERVAL_IN_MS * multiplier;
  }

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
    if (!wl) {
      this.handleUpdateError(ev);
      return;
    }

    try {
      const { result }: IFullStateResponseWithTemp = await wl.getStatus();
      if ('setState' in ev.action) {
        ev.action.setState(Number(result.state));
      }
      ev.action.setImage(result.state ? 'imgs/actions/bulb-solid' : 'imgs/actions/bulb');

      // Reset backoff on successful update
      if (this.currentBackoffIndex > 0) {
        this.currentBackoffIndex = 0;
        this.startAutoUpdate(ev); // Restart with default interval
      }
    } catch (error) {
      this.handleUpdateError(ev);
    }
  }
  private handleUpdateError(ev: any): void {
    console.error('Failed to update UI');
    ev.action.showAlert();

    // Increase backoff index and restart with new interval
    this.currentBackoffIndex = Math.min(
      this.currentBackoffIndex + 1,
      this.fibonacciSequence.length - 1
    );
    this.startAutoUpdate(ev, this.getFibonacciBackoffMs());
  }
  private async toggleBulb(ev: BulbEvent): Promise<void> {
    const { bulbIp, dimmingValue, tempValue } = ev.payload.settings;

    try {
      const wl = await this.createWizLight(bulbIp);
      if (!wl) return;

      const { result } = await wl.getStatus();
      const response = await wl.setLightProps({
        state: !result.state,
        dimming: dimmingValue || result.dimming,
        // @ts-expect-error: need to update wl types
        temp: tempValue || result.temp,
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
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      await this.updateUI(ev);
    }, interval);
  }
  private stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  override async onWillAppear(ev: WillAppearEvent<BulbSwitchSettings>): Promise<void> {
    await this.updateUI(ev);
    this.startAutoUpdate(ev);
  }
  override async onWillDisappear(ev: WillDisappearEvent<BulbSwitchSettings>): Promise<void> {
    this.stopAutoUpdate();
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<BulbSwitchSettings>
  ): Promise<void> {
    await this.updateUI(ev);
  }

  override async onKeyUp(ev: KeyUpEvent<BulbSwitchSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }
}
