/**
 * Subclass of Array with convenience methods used by NetLogo.
 * Typically the items in the array are Objects but can be any type.
 */
class AgentArray extends Array {
  /**
  * Creates an instance of AgentArray. Simply pass-through to super()
  * now, but may add initialization code later.
  * @param {*} args Zero or more items in Array
  * @example
  * let aa = new AgentArray({x:0,y:0}, {x:0,y:1}, {x:1,y:0})
  *  console.log(aa) //=>  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }]
  */
  constructor() {

  }
}