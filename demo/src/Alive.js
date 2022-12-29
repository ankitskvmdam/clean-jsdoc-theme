/**
 * @summary
 * This is a short summary of the `Alive` class. These texts are just acting
 * as filler texts for summary.
 * 
 * @class
 */
class Alive {

    constructor() {
        /**
         * @summary
         * amount of energy
         * @property {Energy}
         * @defaultvalue null
         * 
         * @example
         * world = this.world
         * function test() {
         *  return world
         * }
         */
        this.energy = null;
        /**
         * This is a number array.
         * @constant
         * @type Object
         * @default
         */
        this.NUMBER_ARRAY = {
            google: "Google",
            games: "Games"
        }
    }
    /**
     * A constant.
     * @readonly
     * @deprecated This is no longer used
     * @const {number}
     */
    FOO = 1;

    /**
     * @param {array<object|function|array|number|string|undefined|null|Symbol|boolean|Energy>} life This is an array of many things.
     * @return {Energy} the energy wasted in this surviving instance
     * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/contextmenu_event context-menu
     * @method
     * @deprecated
     */
    survive(life) {
        return null;
    }
    /**
     * Text
     * > Text
     * 
     * 
     *```js
     * code
     *```
     *
     * 
     * > Note that commands are not matched in captions or in the middle of the text.
     */
    gameQuery() {
        return null;
    }
}

/**
 * Options for ordering a delicious slice of pie.
 * @namespace
 */
var pieOptions = {
    /**
     * Plain.
     */
    plain: 'pie',
    /**
     * A la mode.
     * @readonly
     */
    get aLaMode() {
        return this.plain + ' with ice cream';
    }
};