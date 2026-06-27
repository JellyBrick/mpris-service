import { Variant } from '@jellybrick/dbus-next';

import { warn } from '@/logging';

import type { Playlist, Track } from '@/types';

export const guessMetadataSignature = (key: string, value: unknown): string | null => {
  if (key === 'mpris:trackid') {
    return 'o';
  } else if (key === 'mpris:length') {
    return 'x';
  } else if (typeof value === 'string') {
    return 's';
  } else if (typeof value === 'boolean') {
    return 'b';
  } else if (typeof value === 'number') {
    return 'd';
  } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return 'as';
  } else {
    // type not supported yet
    warn(`could not determine metadata type for ${key}: ${String(value)}`);
    return null;
  }
};

export const metadataToPlain = (metadataVariant: Record<string, unknown>): Track => {
  const metadataPlain: Record<string, unknown> = {};
  for (const k of Object.keys(metadataVariant)) {
    const value = metadataVariant[k];
    if (value === undefined || value === null) {
      warn(`ignoring a null metadata value for key ${k}`);
      continue;
    }
    if (value instanceof Variant) {
      metadataPlain[k] = value.value;
    } else {
      metadataPlain[k] = value;
    }
  }
  return metadataPlain as Track;
};

export const metadataToDbus = (metadataPlain: Track): Record<string, Variant> => {
  const metadataVariant: Record<string, Variant> = {};
  const plain = metadataPlain as Record<string, unknown>;
  for (const k of Object.keys(plain)) {
    const value = plain[k];
    const signature = guessMetadataSignature(k, value);
    if (signature) {
      metadataVariant[k] = new Variant(signature, value);
    }
  }
  return metadataVariant;
};

export const emptyPlaylist: [string, string, string] = ['/', '', ''];

export const playlistToDbus = (playlist?: Playlist | null): [string, string, string] => {
  if (!playlist) {
    return emptyPlaylist;
  }

  const { Id, Name, Icon } = playlist;
  return [Id, Name, Icon];
};

export const playlistToPlain = (wire: [string, string, string]): Playlist => {
  const [Id, Name, Icon] = wire;
  return { Id, Name, Icon };
};
