import { interface as dbusInterface } from '@jellybrick/dbus-next';

import { MprisInterface } from '@/interfaces/mpris-interface';
import * as types from '@/interfaces/types';

import type { Player } from '@/player';
import type { Playlist } from '@/types';

const { property, method, signal } = dbusInterface;
const ACCESS_READ = dbusInterface.ACCESS_READ as 'read';

export class PlaylistsInterface extends MprisInterface {
  constructor(player: Player) {
    super('org.mpris.MediaPlayer2.Playlists', player);
  }

  private _ActivePlaylist: [boolean, [string, string, string]] = [false, types.emptyPlaylist];
  private _PlaylistCount = 0;

  @property({ signature: 'u', access: ACCESS_READ })
  get PlaylistCount(): number {
    return this._PlaylistCount;
  }

  @property({ signature: 'as', access: ACCESS_READ })
  get Orderings(): string[] {
    return ['Alphabetical', 'UserDefined'];
  }

  @property({ signature: '(b(oss))', access: ACCESS_READ })
  get ActivePlaylist(): [boolean, [string, string, string]] {
    return this._ActivePlaylist;
  }

  setActivePlaylistId(playlistId: string): void {
    const i = this.player.getPlaylistIndex(playlistId);

    this.setProperty('ActivePlaylist', this.player.playlists[i] || null);
  }

  @method({ inSignature: 'o' })
  ActivatePlaylist(playlistId: string): void {
    this.player.emit('activatePlaylist', playlistId);
  }

  @method({ inSignature: 'uusb', outSignature: 'a(oss)' })
  GetPlaylists(
    index: number,
    maxCount: number,
    order: string,
    reverseOrder: boolean,
  ): [string, string, string][] {
    if (!this.player.playlists) {
      return [];
    }

    const result = this.player.playlists
      .sort((a, b) => {
        let ret = 1;
        switch (order) {
          case 'Alphabetical':
            ret = a.Name > b.Name ? 1 : -1;
            break;
          // case 'CreationDate':
          // case 'ModifiedDate':
          // case 'LastPlayDate':
          case 'UserDefined':
            break;
        }
        return ret;
      })
      .slice(index, maxCount + index)
      .map((p) => types.playlistToDbus(p));

    if (reverseOrder) {
      result.reverse();
    }

    return result;
  }

  @signal({ signature: '(oss)' })
  PlaylistChanged(playlist: Playlist): [string, string, string] {
    return types.playlistToDbus(playlist);
  }
}
