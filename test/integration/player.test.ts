import { DBusError, sessionBus, Variant } from '@jellybrick/dbus-next';
import { afterAll, expect, test, vi } from 'vitest';

import { Player } from '@/player';

import { call } from '../util';

import type { LoopStatus, Track } from '@/types';

const ROOT_IFACE = 'org.mpris.MediaPlayer2';
const PLAYER_IFACE = 'org.mpris.MediaPlayer2.Player';

const lcFirst = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

const player = new Player({
  name: 'playertest',
  identity: 'Node.js media player',
  supportedUriSchemes: ['file'],
  supportedMimeTypes: ['audio/mpeg', 'application/ogg'],
  supportedInterfaces: ['player'],
});

player.on('error', (err) => {
  console.log(`got unexpected error:\n${err.stack ?? ''}`);
});

const bus = sessionBus();

afterAll(() => {
  player._bus.disconnect();
  bus.disconnect();
});

test('creating a player exports the root and player interfaces on the bus', async () => {
  const dbusObj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
  const dbusIface = dbusObj.getInterface('org.freedesktop.DBus');
  const names = await call(dbusIface, 'ListNames');
  expect(names).toEqual(expect.arrayContaining(['org.mpris.MediaPlayer2.playertest']));

  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.playertest',
    '/org/mpris/MediaPlayer2',
  );
  const expectedInterfaces = [
    'org.freedesktop.DBus.Introspectable',
    'org.freedesktop.DBus.Properties',
    ROOT_IFACE,
    PLAYER_IFACE,
  ];
  for (const expected of expectedInterfaces) {
    expect(obj.getInterface(expected)).toBeDefined();
  }
});

test('calling the player methods on the bus emits the signals on the object', async () => {
  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.playertest',
    '/org/mpris/MediaPlayer2',
  );
  const playerIface = obj.getInterface(PLAYER_IFACE);

  // simple commands called with no event
  const commands = ['Play', 'Pause', 'PlayPause', 'Stop', 'Next', 'Previous'];
  for (const cmd of commands) {
    const cb = vi.fn();
    player.once(cmd.toLowerCase() as 'play', cb);
    await call(playerIface, cmd);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith();
  }

  // OpenUri
  const openCb = vi.fn();
  player.once('open', openCb);
  await call(playerIface, 'OpenUri', 'file://somefile');
  expect(openCb).toHaveBeenCalledTimes(1);
  expect(openCb).toHaveBeenCalledWith({ uri: 'file://somefile' });
});

test('getting and setting properties on the player and on the interface should work', async () => {
  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.playertest',
    '/org/mpris/MediaPlayer2',
  );
  const props = obj.getInterface('org.freedesktop.DBus.Properties');
  const peer = obj.getInterface('org.freedesktop.DBus.Peer');

  const cb = vi.fn();
  props.on('PropertiesChanged', cb);

  // Metadata
  player.metadata = {
    'xesam:artist': ['Katy Perry'],
    'xesam:title': 'Rise',
  };
  await call(peer, 'Ping');
  let changed: Record<string, Variant> = {
    Metadata: new Variant('a{sv}', {
      'xesam:artist': new Variant('as', ['Katy Perry']),
      'xesam:title': new Variant('s', 'Rise'),
    }),
  };
  expect(cb).toHaveBeenCalledTimes(1);
  expect(cb).toHaveBeenLastCalledWith(PLAYER_IFACE, changed, []);
  let gotten = await call(props, 'Get', PLAYER_IFACE, 'Metadata');
  expect(gotten).toEqual(changed.Metadata);

  // setting the metadata again to the same thing should only emit
  // PropertiesChanged once
  player.metadata = JSON.parse(JSON.stringify(player.metadata)) as Track;
  await call(peer, 'Ping');
  expect(cb).toHaveBeenCalledTimes(1);

  // PlaybackStatus
  player.playbackStatus = Player.PLAYBACK_STATUS_PAUSED;
  await call(peer, 'Ping');
  changed = {
    PlaybackStatus: new Variant('s', 'Paused'),
  };
  expect(cb).toHaveBeenLastCalledWith(PLAYER_IFACE, changed, []);
  gotten = await call(props, 'Get', PLAYER_IFACE, 'PlaybackStatus');
  expect(gotten).toEqual(new Variant('s', 'Paused'));

  // LoopStatus
  player.loopStatus = Player.LOOP_STATUS_TRACK;
  await call(peer, 'Ping');
  changed = {
    LoopStatus: new Variant('s', 'Track'),
  };
  expect(cb).toHaveBeenLastCalledWith(PLAYER_IFACE, changed, []);
  gotten = await call(props, 'Get', PLAYER_IFACE, 'LoopStatus');
  expect(gotten).toEqual(new Variant('s', 'Track'));
  const loopCb = vi.fn((val: LoopStatus) => {
    player.loopStatus = val;
  });
  player.once('loopStatus', loopCb);
  await call(props, 'Set', PLAYER_IFACE, 'LoopStatus', new Variant('s', 'Playlist'));
  expect(loopCb).toHaveBeenCalledWith('Playlist');
  changed = {
    LoopStatus: new Variant('s', 'Playlist'),
  };
  expect(cb).toHaveBeenLastCalledWith(PLAYER_IFACE, changed, []);
  expect(player.loopStatus).toEqual('Playlist');

  // trying to set an invalid loop status should give the client an error and
  // leave player loop status unchanged
  const invalidSet = call(
    props,
    'Set',
    PLAYER_IFACE,
    'LoopStatus',
    new Variant('s', 'AN_INVALID_STATUS'),
  );
  await expect(invalidSet).rejects.toBeInstanceOf(DBusError);
  expect(player.loopStatus).toEqual('Playlist');

  // The Double Properties
  const doubleProps = ['Rate', 'Volume', 'MinimumRate', 'MaximumRate'];
  for (const name of doubleProps) {
    const playerName = lcFirst(name);
    Reflect.set(player, playerName, 0.05);
    await call(peer, 'Ping');
    changed = {};
    changed[name] = new Variant('d', 0.05);
    expect(cb).toHaveBeenLastCalledWith(PLAYER_IFACE, changed, []);
    gotten = await call(props, 'Get', PLAYER_IFACE, name);
    expect(gotten).toEqual(new Variant('d', Reflect.get(player, playerName)));

    if (name in ['Rate', 'Volume']) {
      // these are settable by the client
      const doubleCb = vi.fn((val: number) => {
        Reflect.set(player, playerName, val);
      });
      player.once(playerName as 'rate', doubleCb);
      await call(props, 'Set', PLAYER_IFACE, name, new Variant('d', 0.15));
      expect(doubleCb).toHaveBeenCalledWith(0.15);
      expect(Reflect.get(player, playerName)).toEqual(0.15);
      changed[name] = new Variant('d', 0.15);
      expect(cb).toHaveBeenLastCalledWith(PLAYER_IFACE, changed, []);
    }
  }

  // The Boolean properties
  const boolProps = [
    'CanControl',
    'CanPause',
    'CanPlay',
    'CanSeek',
    'CanGoNext',
    'CanGoPrevious',
    'Shuffle',
  ];
  for (const name of boolProps) {
    const playerName = lcFirst(name);
    const newValue = !Reflect.get(player, playerName);
    Reflect.set(player, playerName, newValue);
    await call(peer, 'Ping');
    changed = {};
    changed[name] = new Variant('b', newValue);
    expect(cb).toHaveBeenLastCalledWith(PLAYER_IFACE, changed, []);
    gotten = await call(props, 'Get', PLAYER_IFACE, name);
    expect(gotten).toEqual(new Variant('b', Reflect.get(player, playerName)));
    if (name === 'Shuffle') {
      const nextNewValue = !newValue;
      // only this property is writable
      const shuffleCb = vi.fn((val: boolean) => {
        player.shuffle = val;
      });
      player.once('shuffle', shuffleCb);
      await call(props, 'Set', PLAYER_IFACE, name, new Variant('b', nextNewValue));
      expect(shuffleCb).toHaveBeenCalledWith(nextNewValue);
      expect(Reflect.get(player, playerName)).toEqual(nextNewValue);
      await call(peer, 'Ping');
    }
  }
});

test('position specific properties, methods, and signals should work', async () => {
  // note: they are responsible for setting the position, not the methods directly
  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.playertest',
    '/org/mpris/MediaPlayer2',
  );
  const playerIface = obj.getInterface(PLAYER_IFACE);
  const props = obj.getInterface('org.freedesktop.DBus.Properties');
  const peer = obj.getInterface('org.freedesktop.DBus.Peer');

  // position defaults to always being 0
  let position = await call(props, 'Get', PLAYER_IFACE, 'Position');
  expect(position).toEqual(new Variant('x', BigInt(0)));

  // when the getter is set, it should return what the getter returns
  player.getPosition = () => {
    return 99;
  };

  position = await call(props, 'Get', PLAYER_IFACE, 'Position');
  expect(position).toEqual(new Variant('x', BigInt(99)));

  // Seek
  let cb = vi.fn();
  player.once('seek', cb);
  await call(playerIface, 'Seek', BigInt(99));
  expect(cb).toHaveBeenCalledWith(99);

  // SetPosition
  cb = vi.fn();
  player.once('position', cb);
  await call(playerIface, 'SetPosition', '/some/track', BigInt(100));
  expect(cb).toHaveBeenCalledWith({ trackId: '/some/track', position: 100 });

  cb = vi.fn();
  playerIface.once('Seeked', cb);
  player.seeked(200);
  await call(peer, 'Ping');
  expect(cb).toHaveBeenCalledWith(BigInt(200));
});
