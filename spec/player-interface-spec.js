'use strict';

const dbus = require('dbus-native');

const helpers = require('./helpers/helpers');

const objectpath = '/org/mpris/MediaPlayer2';
const namespace = 'org.mpris.MediaPlayer2.Player';

const events = [
  {
    name: 'next',
    method: 'Next',
    args: () => { return []; }
  },
  {
    name: 'previous',
    method: 'Previous',
    args: () => { return []; }
  },
  {
    name: 'play',
    method: 'Play',
    args: () => { return []; }
  },
  {
    name: 'pause',
    method: 'Pause',
    args: () => { return []; }
  },
  {
    name: 'playpause',
    method: 'PlayPause',
    args: () => { return []; }
  },
  {
    name: 'stop',
    method: 'Stop',
    args: () => { return []; }
  },
  {
    name: 'open',
    method: 'OpenUri',
    args: () => { return ['/home/foo']; }
  },
  {
    name: 'seek',
    method: 'Seek',
    args: () => { return [3.14 * 10e6]; }
  },
  {
    name: 'position',
    method: 'SetPosition',
    args: (player) => { return [player.objectPath('playlist/0'), 3.14 * 10e6]; }
  }
];

const signals = [
  {
    method: 'seeked',
    signal: 'Seeked',
    args: [3.14 * 10e6]
  }
];

describe('player interface', () => {
  let bus, name, player, service, object, servicename;

  beforeAll((done) => {
    bus = dbus.sessionBus();
    name = helpers.playername();
    player = helpers.getPlayer(name);
    name = player.name;
    servicename = helpers.servicename(name);
    service = bus.getService(servicename);

    service.getInterface(objectpath, namespace, (err, obj) => {
      if (err) {
        fail(err);
      }

      object = obj;
      done();
    });
  });

  it('should emit events on player object that correspond to method calls', (done) => {

    events.reduce((promise, event) => {

      return promise.then(() => {
        const wait = helpers.waitForEvent(player, event.name);
        object[event.method].apply(object, event.args(player));

        return wait;
      });
    }, Promise.resolve()).then(done).catch(fail);

  });

  it('should emit signals on the bus that correspond to method calls', (done) => {

    signals.reduce((promise, signal) => {

      return promise.then(() => {

        return helpers.getInterfaceAsync(service, objectpath, 'org.mpris.MediaPlayer2.Player').then(obj => {
          const wait = helpers.waitForEvent(obj, signal.signal).then(function() {
            const args = Array.prototype.slice.call(arguments);
            expect(args).toEqual(signal.args);
          });
          player[signal.method].apply(player, signal.args);

          return wait;
        });
      });

    }, Promise.resolve()).then(done).catch(fail);

  });
});
