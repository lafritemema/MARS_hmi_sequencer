/* eslint-disable no-unused-vars */
import {ExceptionDescription} from './properties';

/**
 * class representin
 */
export class BaseException extends Error{
  private _originStack:string[]
  private _description:string
  private _devstack:string|undefined

  /**
   * BaseException constructor
   * @param {string[]} originStack : list of string describing the error origin
   * @param {string} description : description of the error
   * @param {string|undefined} devStack : dev error origin
   */
  public constructor(originStack:string[],
      description:string,
      devStack?:string|undefined) {
    super();
    this._originStack = originStack;
    this._description = description;
    this._devstack = devStack;
  }

  /**
   * fonction to add new element in exception stack
   * @param {string[]} newStack : element to add
   */
  public addInStack(newStack:string[]) {
    this._originStack = newStack.concat(this._originStack);
  }

  /**
   * getter to return a message
   */
  public get message() {
    return `[${this._originStack.join('.')}] : ${this._description}`;
  }

  /**
   * fonction to return the error description
   * @param {boolean} debug : if true return a decription for debuging
   * @return {ExceptionDescription}
   */
  public describe(debug=false) {
    const description:ExceptionDescription = {
      origin: this._originStack.join('.'),
      description: this._description,
    };
    if (debug) description.stack = this._devstack;
    return description;
  }
}
