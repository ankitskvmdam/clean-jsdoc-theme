/**
 * Donec imperdiet dignissim semper. Sed vehicula purus dui, eget porta lectus convallis sagittis. Suspendisse ac lectus dignissim, tincidunt nisi quis, gravida metus.
 * @class
 * @extends Alive
 */
class Tree extends Alive {
    constructor() {
        super();
        /**
		 * Donec imperdiet dignissim
		 * @type {Array<Alive>}
		 */
        this.branches = null;
    }
    /**
	 * @param {Environment} environment the environment when this Alive thing is surviving
	 * @return {Energy} the energy wasted in this surviving instance
	 * @method
	 * @fires Tree.crop
	 * @Throws Err
	 */
    crop() {
        return null;
    }
}
