import { interface as dbusInterface, type Variant } from '@jellybrick/dbus-next';

import { MprisInterface } from '@/interfaces/mpris-interface';
import * as types from '@/interfaces/types';

import type { Player } from '@/player';
import type { Track } from '@/types';

const { property, method, signal } = dbusInterface;
const ACCESS_READ = dbusInterface.ACCESS_READ as 'read';

export class TracklistInterface extends MprisInterface {
  constructor(player: Player) {
    super('org.mpris.MediaPlayer2.TrackList', player);
  }

  private _Tracks: string[] = [];
  private _CanEditTracks = false;

  setTracks(tracksPlain: Track[]): void {
    this.setProperty('Tracks', tracksPlain);
  }

  @property({ signature: 'ao', access: ACCESS_READ })
  get Tracks(): string[] {
    return this._Tracks;
  }

  @property({ signature: 'b', access: ACCESS_READ })
  get CanEditTracks(): boolean {
    return this._CanEditTracks;
  }

  @method({ inSignature: 'ao', outSignature: 'aa{sv}' })
  GetTracksMetadata(trackIds: string[]): Record<string, Variant>[] {
    return this.player.tracks
      .filter((t) => {
        return trackIds.some((id) => id === t['mpris:trackid']);
      })
      .map((t) => types.metadataToDbus(t));
  }

  @method({ inSignature: 'sob' })
  AddTrack(uri: string, afterTrack: string, setAsCurrent: boolean): void {
    this.player.emit('addTrack', { uri, afterTrack, setAsCurrent });
  }

  @method({ inSignature: 'o' })
  RemoveTrack(trackId: string): void {
    this.player.emit('removeTrack', trackId);
  }

  @method({ inSignature: 'o' })
  GoTo(trackId: string): void {
    this.player.emit('goTo', trackId);
  }

  @signal({ signature: 'aoo' })
  TrackListReplaced(replacedPlain: Track[]): [string[], string] {
    this.setTracks(replacedPlain);
    // TODO what's the active track?
    return [this._Tracks, '/org/mpris/MediaPlayer2/TrackList/NoTrack'];
  }

  @signal({ signature: 'a{sv}' })
  TrackAdded(metadata: Track): Record<string, Variant> {
    return types.metadataToDbus(metadata);
  }

  @signal({ signature: 'o' })
  TrackRemoved(path: string): string {
    return path;
  }

  @signal({ signature: 'oa{sv}' })
  TrackMetadataChanged(path: string, metadata: Track): [string, Record<string, Variant>] {
    return [path, types.metadataToDbus(metadata)];
  }
}
