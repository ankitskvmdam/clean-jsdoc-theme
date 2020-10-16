/**
 * Lorem ipsum dolor sit amet, {@link Energy} consectetur adipiscing elit. Vestibulum condimentum tempus diam. Ut eget ultricies metus, vitae ornare turpis. Vivamus lectus metus, euismod quis tortor quis, pretium semper massa. Nulla mauris sapien, faucibus vitae metus et, ultrices fringilla sem. Sed laoreet tempor odio, elementum scelerisque nunc aliquet quis.
 *
 * @class
 */
class Environment {
    constructor() {
        /**
		 * All the living things in this environment
		 * @type {Array<Alive>}
		 */
        this.livingThings = null;

        /**
		 * The name of this environment
		 * @type {String}
		 */
        this.name = null;
    }

    /**
     * Vestibulum condimentum tempus {@link Alive} diam.
	 * @param {EnvironmentConfiguration} config
	 */
    start(config) {

    }
}

/**
 * @typedef {Object} EnvironmentConfiguration
 * @property {String} name
 * @property {Map<String,Number>} strange
 */

/**
 * Lorem ipsum dolor sit amet, {@link Energy} consectetur adipiscing el
 * @event Environment#beforeDestroy
 * @type {Energy}
 * @property {boolean} foo aalks djlas
 */
