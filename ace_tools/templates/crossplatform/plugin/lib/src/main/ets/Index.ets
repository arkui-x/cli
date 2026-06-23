import nativeModule from 'libmodule_name.so'

export const add: (a: number, b: number) => number = nativeModule.add
export const log: (msg: string) => void = nativeModule.log
export const getSystemVersion: () => string = nativeModule.getSystemVersion
export const getFullOSName: () => string = nativeModule.getFullOSName
export const getDeviceType: () => string = nativeModule.getDeviceType
