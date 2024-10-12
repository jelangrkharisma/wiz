import streamDeck, { LogLevel } from '@elgato/streamdeck';
import { BulbTemperature } from './actions/bulb-temperature';
import { BulbDimmer } from './actions/bulb-dimmer';
import { SetScene } from './actions/set-scene';

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the increment action.
streamDeck.actions.registerAction(new BulbTemperature());
streamDeck.actions.registerAction(new BulbDimmer());

streamDeck.actions.registerAction(new SetScene());

// Finally, connect to the Stream Deck.
streamDeck.connect();
