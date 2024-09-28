export interface IWizLight {
  setLightStatus(status: IStatus): Promise<IStatus>;
  setLightProps(props: ILightProps): Promise<IStatus>;
  getStatus(): Promise<IFullStateResponse>;
  destroy(): void;
}
