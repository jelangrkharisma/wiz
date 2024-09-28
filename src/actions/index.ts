// Define your domain as a constant
const domain = 'com.jrmdhn.wiz';

// Define an enum for your actions
enum ActionNamesEnum {
  BulbTemperature = 'bulb-temperature',
}

// Create an object where each action is attached to the domain
export const Actions = {
  BulbTemperature: `${domain}.${ActionNamesEnum.BulbTemperature}`,
};
