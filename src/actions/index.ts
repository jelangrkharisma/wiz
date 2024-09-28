// Define your domain as a constant
const domain = 'com.jrmdhn.wiz';

// Define an enum for your actions
enum ActionNamesEnum {
  Increment = 'increment',
  Decrement = 'decrement',
  Reset = 'reset',
}

// Create an object where each action is attached to the domain
export const Actions = {
  increment: `${domain}.${ActionNamesEnum.Increment}`,
  decrement: `${domain}.${ActionNamesEnum.Decrement}`,
  reset: `${domain}.${ActionNamesEnum.Reset}`,
};
