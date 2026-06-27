import { sessionBus, Variant } from '@jellybrick/dbus-next';
import { afterAll, expect, test, vi } from 'vitest';

import { Player } from '@/player';

import { call } from '../util';

const ROOT_IFACE = 'org.mpris.MediaPlayer2';

const lcFirst = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

const player = new Player({
  name: 'roottest',
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

test('calling methods should raise a signal on the player', async () => {
  let obj = await bus.getProxyObject('org.mpris.MediaPlayer2.roottest', '/org/mpris/MediaPlayer2');
  let root = obj.interfaces[ROOT_IFACE];

  if (!root) {
    // XXX need to wait a beat for the service to start up
    obj = await bus.getProxyObject('org.mpris.MediaPlayer2.roottest', '/org/mpris/MediaPlayer2');
    root = obj.getInterface(ROOT_IFACE);
  }

  let cb = vi.fn();
  player.once('quit', cb);
  await call(root, 'Quit');
  expect(cb).toHaveBeenCalledWith();

  cb = vi.fn();
  player.once('raise', cb);
  await call(root, 'Raise');
  expect(cb).toHaveBeenCalledWith();
});

test('setting properties on the player should show up on dbus and raise a signal', async () => {
  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.roottest',
    '/org/mpris/MediaPlayer2',
  );
  const props = obj.getInterface('org.freedesktop.DBus.Properties');
  const peer = obj.getInterface('org.freedesktop.DBus.Peer');

  const cb = vi.fn();
  props.on('PropertiesChanged', cb);
  let changed: Record<string, Variant>;

  // string array props
  const stringArrayProps = ['SupportedMimeTypes', 'SupportedUriSchemes'];
  for (const name of stringArrayProps) {
    const playerName = lcFirst(name);
    const gotten = await call(props, 'Get', ROOT_IFACE, name);
    expect(gotten).toEqual(new Variant('as', Reflect.get(player, playerName)));
    const newValue = ['foo', 'bar'];
    Reflect.set(player, playerName, newValue);
    await call(peer, 'Ping');
    changed = {};
    changed[name] = new Variant('as', newValue);
    expect(cb).toHaveBeenLastCalledWith(ROOT_IFACE, changed, []);
  }

  // readonly bools
  const booleanProps = ['CanQuit', 'CanRaise', 'CanSetFullscreen', 'HasTrackList'];
  for (const name of booleanProps) {
    const playerName = lcFirst(name);
    const newValue = !Reflect.get(player, playerName);
    Reflect.set(player, playerName, newValue);
    await call(peer, 'Ping');
    changed = {};
    changed[name] = new Variant('b', newValue);
    expect(cb).toHaveBeenCalledWith(ROOT_IFACE, changed, []);
    const gotten = await call(props, 'Get', ROOT_IFACE, name);
    expect(gotten).toEqual(new Variant('b', newValue));
  }

  // strings
  const stringProps = ['Identity', 'DesktopEntry'];
  for (const name of stringProps) {
    const playerName = lcFirst(name);
    const newValue = 'foo';
    Reflect.set(player, playerName, newValue);
    await call(peer, 'Ping');
    changed = {};
    changed[name] = new Variant('s', newValue);
    expect(cb).toHaveBeenCalledWith(ROOT_IFACE, changed, []);
    const gotten = await call(props, 'Get', ROOT_IFACE, name);
    expect(gotten).toEqual(new Variant('s', newValue));
  }

  // fullscreen
  const gotten = await call(props, 'Get', ROOT_IFACE, 'Fullscreen');
  expect(gotten).toEqual(new Variant('b', player.fullscreen));
  const newValue = !player.fullscreen;
  player.fullscreen = newValue;
  await call(peer, 'Ping');
  changed = {
    Fullscreen: new Variant('b', newValue),
  };
  expect(cb).toHaveBeenLastCalledWith(ROOT_IFACE, changed, []);
  await call(peer, 'Ping');
});
