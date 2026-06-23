import nativeModule from 'libmodule_name.so'

export const add: (a: number, b: number) => number = nativeModule.add
export const multiply: (a: number, b: number) => number = nativeModule.multiply
export const greet: (name: string) => string = nativeModule.greet
export const stringLength: (s: string) => number = nativeModule.stringLength
export const concatStrings: (a: string, b: string) => string = nativeModule.concatStrings
export const reverseString: (s: string) => string = nativeModule.reverseString
export const sumArray: (arr: number[]) => number = nativeModule.sumArray
export const createIntArray: (start: number, size: number) => number[] = nativeModule.createIntArray
export const callCallback: (cb: (result: string) => void) => void = nativeModule.callCallback
export const delayedResult: (ms: number) => Promise<string> = nativeModule.delayedResult
