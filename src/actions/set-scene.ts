import {
  action,
  DidReceiveSettingsEvent,
  KeyUpEvent,
  SingletonAction,
  WillAppearEvent,
} from '@elgato/streamdeck';
import { Actions } from '.';
import { WizLight } from 'wiz-light';
import { BulbEvent, IFullStateResponseWithTemp } from './types';
import { DEFAULT_BULB_TEMP_VALUE } from '../utils/constants';

type BulbSetSceneSettings = {
  tempValue: number;
  dimmerValue: number;
  bulbIp: string;
};

@action({ UUID: Actions.SetScene })
export class SetScene extends SingletonAction {
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
    } catch (error) {
      console.error('Failed to update UI:', error);
      ev.action.showAlert();
    }
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

  override async onWillAppear(ev: WillAppearEvent<BulbSetSceneSettings>): Promise<void> {
    if (!ev.action.isDial()) return;

    const value = ev.payload.settings.tempValue || DEFAULT_BULB_TEMP_VALUE;
    ev.action.setFeedback({
      value: `${value}`,
    });
    await this.updateUI(ev);
  }

  override async onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<BulbSetSceneSettings>
  ): Promise<void> {
    await this.updateUI(ev);
  }

  override async onKeyUp(ev: KeyUpEvent<BulbSetSceneSettings>): Promise<void> {
    await this.toggleBulb(ev);
  }
}
