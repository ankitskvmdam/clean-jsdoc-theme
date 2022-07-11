import * as util from './utils.js'

// class World defines the coordinate system for the model.
// It will be  upgraded with methods converting from other
// transforms like  GIS and DataSets.

// const defaultZ = (maxX, maxY) => Math.max(maxX, maxY)

/**
 * @private
 * @typedef {Object} WorldOptions
 * @property {number} minX Min world patch x integer value
 * @property {number} minY Min world patch y integer value
 * @property {number} minZ Min world patch z integer value
 * @property {number} maxX Max world patch x integer value
 * @property {number} maxY Max world patch y integer value
 * @property {number} maxZ Max world patch z integer value
 */

/**
 * Class World defines the coordinate system for the model.
 * It has transforms for multiple coordinate systems.
 *
 * The world is defined by an object with 6 properties:
 *
 *          WorldOptions = {
 *              minX: integer,
 *              maxX: integer,
 *              minY: integer,
 *              maxY: integer,
 *              minZ: integer,
 *              maxZ: integer,
 *          }
 */
class World {
    maxX = 16
    minX = -16
    maxY = 16
    minY = -16
    maxZ = 0
    minZ = 0
    // maxZ = 16
    // minZ = -16

    /**
     * Return a default options object, origin at center.
     *
     * @param {number} [maxX=16] Integer max X value
     * @param {number} [maxY=maxX] Integer max Y value
     * @param {number} [maxZ=Math.max(maxX, maxY)] Integer max Z value
     * @returns WorldOptions
     */
    static defaultOptions(maxX = 16, maxY = maxX, maxZ = Math.max(maxX, maxY)) {
        // static defaultOptions(maxX = 16, maxY = maxX, maxZ = 0) {
        return {
            minX: -maxX,
            maxX: maxX,
            minY: -maxY,
            maxY: maxY,
            minZ: maxZ === 0 ? 0 : -maxZ, // don't trust -0 === 0
            maxZ: maxZ,
        }
    }
}
