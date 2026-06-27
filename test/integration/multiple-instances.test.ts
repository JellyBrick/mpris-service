import { sessionBus } from '@jellybrick/dbus-next';
import { afterAll, expect, test } from 'vitest';

import { Player } from '@/player';

import { call } from '../util';

const initErrors: Error[] = [];
const playerName = 'multiple_instances';

const errorHandler = (err: Error): void => {
  console.log(err.stack ?? '');
  initErrors.push(err);
};

const player1 = new Player({
  name: playerName,
  identity: 'Node.js media player',
  supportedUriSchemes: ['file'],
  supportedMimeTypes: ['audio/mpeg', 'application/ogg'],
  supportedInterfaces: ['player'],
});

player1.on('error', errorHandler);

const player2 = new Player({
  name: playerName,
  identity: 'Node.js media player',
  supportedUriSchemes: ['file'],
  supportedMimeTypes: ['audio/mpeg', 'application/ogg'],
  supportedInterfaces: ['player'],
});

player2.on('error', errorHandler);

const bus = sessionBus();

afterAll(() => {
  player1._bus.disconnect();
  player2._bus.disconnect();
  bus.disconnect();
});

test('creating two players with the same name on the same bus should create the second one as an instance', async () => {
  const dbusObj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
  const dbusIface = dbusObj.getInterface('org.freedesktop.DBus');
  const names = await call(dbusIface, 'ListNames');

  expect(initErrors).toHaveLength(0);

  const expectedIfaces = [
    `org.mpris.MediaPlayer2.${playerName}`,
    `org.mpris.MediaPlayer2.${playerName}.instance${process.pid}`,
  ];
  expect(names).toEqual(expect.arrayContaining(expectedIfaces));
});
