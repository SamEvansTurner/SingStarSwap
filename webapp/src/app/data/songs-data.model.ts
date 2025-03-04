export interface Song {
    artist: string;
    title: string;
}

export interface Disc {
    id: string;
    title: string;
    country: string;
    language: string;
    platform: string;
    songlist: Array<Song>;
}

export interface SongsDB {
    [id: string]: Disc
}


export interface DiscID {
  id: string;
  title: string;
  fulltitle: string;
}

export interface SongLocations {
  title: string;
  artist: string;
  discids: DiscID[];
}