import { sessionBus, Variant } from '@jellybrick/dbus-next';
import { afterAll, expect, test, vi } from 'vitest';

import { Player } from '@/player';

import { call } from '../util';

import type { Playlist } from '@/types';

const ROOT_IFACE = 'org.mpris.MediaPlayer2';
const PLAYER_IFACE = 'org.mpris.MediaPlayer2.Player';
const PLAYLISTS_IFACE = 'org.mpris.MediaPlayer2.Playlists';

const player = new Player({
  name: 'playliststest',
  identity: 'Node.js media player',
  supportedUriSchemes: ['file'],
  supportedMimeTypes: ['audio/mpeg', 'application/ogg'],
  supportedInterfaces: ['player', 'playlists'],
});

player.on('error', (err) => {
  console.log(`got unexpected error:\n${err.stack ?? ''}`);
});

const bus = sessionBus();

afterAll(() => {
  player._bus.disconnect();
  bus.disconnect();
});

test('creating a player exports the playlists interfaces on the bus', async () => {
  const dbusObj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
  const dbusIface = dbusObj.getInterface('org.freedesktop.DBus');
  const names = await call(dbusIface, 'ListNames');
  expect(names).toEqual(expect.arrayContaining(['org.mpris.MediaPlayer2.playliststest']));

  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.playliststest',
    '/org/mpris/MediaPlayer2',
  );
  const expectedInterfaces = [
    'org.freedesktop.DBus.Introspectable',
    'org.freedesktop.DBus.Properties',
    ROOT_IFACE,
    PLAYLISTS_IFACE,
    PLAYER_IFACE,
  ];
  for (const expected of expectedInterfaces) {
    expect(obj.getInterface(expected)).toBeDefined();
  }
});

test('default state of the playlists interface', async () => {
  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.playliststest',
    '/org/mpris/MediaPlayer2',
  );
  const playlistsIface = obj.getInterface(PLAYLISTS_IFACE);
  const props = obj.getInterface('org.freedesktop.DBus.Properties');

  const playlistCount = await call(props, 'Get', PLAYLISTS_IFACE, 'PlaylistCount');
  expect(playlistCount).toEqual(new Variant('u', 0));

  const orderings = await call(props, 'Get', PLAYLISTS_IFACE, 'Orderings');
  expect(orderings).toEqual(new Variant('as', ['Alphabetical', 'UserDefined']));

  const activePlaylist = await call(props, 'Get', PLAYLISTS_IFACE, 'ActivePlaylist');
  expect(activePlaylist).toEqual(new Variant('(b(oss))', [false, ['/', '', '']]));

  const playlists = await call(playlistsIface, 'GetPlaylists', 0, 1, 'Alphabetical', false);
  expect(playlists).toEqual([]);
});

test('setting a playlist on the player works', async () => {
  const obj = await bus.getProxyObject(
    'org.mpris.MediaPlayer2.playliststest',
    '/org/mpris/MediaPlayer2',
  );
  const playlistsIface = obj.getInterface(PLAYLISTS_IFACE);
  const props = obj.getInterface('org.freedesktop.DBus.Properties');
  const peer = obj.getInterface('org.freedesktop.DBus.Peer');

  const propsCb = vi.fn();
  props.on('PropertiesChanged', propsCb);

  const playlistChangedCb = vi.fn();
  playlistsIface.on('PlaylistChanged', playlistChangedCb);

  player.setPlaylists([
    { Id: player.objectPath('playlist/0'), Name: 'The best playlist', Icon: '' },
    { Id: player.objectPath('playlist/1'), Name: 'The wonderful playlist', Icon: '' },
    { Id: player.objectPath('playlist/2'), Name: 'The sexyiest playlist', Icon: '' },
    { Id: player.objectPath('playlist/3'), Name: 'The coolest playlist', Icon: '' },
  ]);

  await call(peer, 'Ping');

  expect(propsCb).toHaveBeenCalledWith(PLAYLISTS_IFACE, { PlaylistCount: new Variant('u', 4) }, []);

  for (const playlist of player.playlists) {
    expect(playlistChangedCb).toHaveBeenCalledWith([playlist.Id, playlist.Name, playlist.Icon]);
  }

  const active = player.playlists[1]!;
  player.setActivePlaylist(active.Id);

  await call(peer, 'Ping');

  const expectedActivePlaylist = new Variant('(b(oss))', [
    true,
    [active.Id, active.Name, active.Icon],
  ]);

  expect(propsCb).toHaveBeenLastCalledWith(
    PLAYLISTS_IFACE,
    { ActivePlaylist: expectedActivePlaylist },
    [],
  );

  const activePlaylist = await call(props, 'Get', PLAYLISTS_IFACE, 'ActivePlaylist');
  expect(activePlaylist).toEqual(expectedActivePlaylist);

  const playlistToDbus = (p: Playlist): [string, string, string] => {
    return [p.Id, p.Name, p.Icon];
  };
  const byName = (a: Playlist, b: Playlist): number => (a.Name < b.Name ? -1 : 1);

  let dbusPlaylists: [string, string, string][];

  // all userdefined
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 0, 99, 'UserDefined', false)) as [
    string,
    string,
    string,
  ][];
  expect(player.playlists.map(playlistToDbus)).toEqual(dbusPlaylists);

  // all userdefined reverse
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 0, 99, 'UserDefined', true)) as [
    string,
    string,
    string,
  ][];
  dbusPlaylists.reverse();
  expect(player.playlists.map(playlistToDbus)).toEqual(dbusPlaylists);

  // userdefined slice and max
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 1, 2, 'UserDefined', false)) as [
    string,
    string,
    string,
  ][];
  expect(player.playlists.slice(1, 3).map(playlistToDbus)).toEqual(dbusPlaylists);

  // userdefined slice and max reverse
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 1, 2, 'UserDefined', true)) as [
    string,
    string,
    string,
  ][];
  dbusPlaylists.reverse();
  expect(player.playlists.slice(1, 3).map(playlistToDbus)).toEqual(dbusPlaylists);

  // all alphabetical
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 0, 99, 'Alphabetical', false)) as [
    string,
    string,
    string,
  ][];
  let expected = player.playlists.sort(byName).map(playlistToDbus);
  expect(expected).toEqual(dbusPlaylists);

  // all alphabetical reverse
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 0, 99, 'Alphabetical', true)) as [
    string,
    string,
    string,
  ][];
  dbusPlaylists.reverse();
  expected = player.playlists.sort(byName).map(playlistToDbus);
  expect(expected).toEqual(dbusPlaylists);

  // alphabetical slice and max
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 1, 2, 'Alphabetical', false)) as [
    string,
    string,
    string,
  ][];
  expected = player.playlists.sort(byName).slice(1, 3).map(playlistToDbus);
  expect(expected).toEqual(dbusPlaylists);

  // alphabetical slice and max reverse
  dbusPlaylists = (await call(playlistsIface, 'GetPlaylists', 1, 2, 'Alphabetical', true)) as [
    string,
    string,
    string,
  ][];
  dbusPlaylists.reverse();
  expected = player.playlists.sort(byName).slice(1, 3).map(playlistToDbus);
  expect(expected).toEqual(dbusPlaylists);
});
