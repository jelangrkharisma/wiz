// Define your domain as a constant
const domain = 'com.jrmdhn.wiz';

// Define an enum for your actions
enum ActionNamesEnum {
  BulbTemperature = 'bulb-temperature',
  BulbDimmer = 'bulb-dimmer',
  SetScene = 'set-scene',
}

// Helper function to prepend domain to action names
const withDomain = (action: ActionNamesEnum): string => `${domain}.${action}`;

// Create an object where each action is attached to the domain
export const Actions = {
  BulbTemperature: withDomain(ActionNamesEnum.BulbTemperature),
  BulbDimmer: withDomain(ActionNamesEnum.BulbDimmer),
  SetScene: withDomain(ActionNamesEnum.SetScene),
};
