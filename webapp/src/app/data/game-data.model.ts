export enum Platforms {
  PS3= "PS3",
  PS2= "PS2"
}
export interface GameData {
  key: string,
  platform: Platforms,
  name: string,
  mountUrl: string,
  gameSerial?: string,
  imageUrl?: string
}

export const GameData_EMPTY : GameData = {
  key: '',
  platform: Platforms.PS2,
  name: '',
  mountUrl: '',
} 