import { interface as dbusInterface } from '@jellybrick/dbus-next';
import { deepEqual } from 'fast-equals';

import { isLoopStatusValid, isPlaybackStatusValid } from '@/constants';
import * as types from '@/interfaces/types';
import { warn } from '@/logging';

import type { Player } from '@/player';
import type { EventsMap, Playlist, Track } from '@/types';

const { Interface } = dbusInterface;

type SettableProperty = 'Fullscreen' | 'Rate' | 'Shuffle' | 'Volume' | 'LoopStatus';

const settableEvent = {
  Fullscreen: 'fullscreen',
  Rate: 'rate',
  Shuffle: 'shuffle',
  Volume: 'volume',
  LoopStatus: 'loopStatus',
} as const satisfies Record<SettableProperty, keyof EventsMap>;

export class MprisInterface extends Interface {
  player: Player;

  constructor(name: string, player: Player) {
    super(name);
    this.player = player;
  }

  protected _setPropertyInternal(property: SettableProperty, valueDbus: unknown): void {
    this.player.emit(settableEvent[property], valueDbus as never);
  }

  setProperty(property: string, valuePlain: unknown): void {
    // convert the plain value to a dbus value (default to the plain value)
    let valueDbus: unknown = valuePlain;

    if (property === 'Metadata') {
      valueDbus = types.metadataToDbus(valuePlain as Track);
    } else if (property === 'ActivePlaylist') {
      if (valuePlain) {
        valueDbus = [true, types.playlistToDbus(valuePlain as Playlist)];
      } else {
        valueDbus = [false, types.emptyPlaylist];
      }
    } else if (property === 'Tracks') {
      valueDbus = (valuePlain as Track[])
        .filter((t) => t['mpris:trackid'])
        .map((t) => t['mpris:trackid']);
    }

    if (!deepEqual(Reflect.get(this, `_${property}`), valueDbus)) {
      Reflect.set(this, `_${property}`, valueDbus);

      if (property === 'LoopStatus' && !isLoopStatusValid(valuePlain)) {
        warn(`setting player loop status to an invalid value: ${String(valuePlain)}`);
      } else if (property === 'PlaybackStatus' && !isPlaybackStatusValid(valuePlain)) {
        warn(`setting player playback status to an invalid value: ${String(valuePlain)}`);
      } else {
        Interface.emitPropertiesChanged(this, { [property]: valueDbus }, []);
      }
    }
  }
}
