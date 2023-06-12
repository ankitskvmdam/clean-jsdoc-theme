/** @module color/mixer */
module.exports = {
    /** Blend two `colours` together. */
    blend: function (color1, color2) { },
    /** Generator example
     * @yields {string} A `string` object, which *may* be empty
     */
    fib: function* gen() { }
};

/** Class that represents a colour */
class Colour {
    /** Create colour from rgb */
    constructor(red, green, blue) {
        let hex = n => n.toString(16).padStart(2, '0');
        this.hex = '#' + [red, green, blue].map(hex).join('');
    }
}

/** Darkens a color. */
exports.darken = function (color, shade) { };

/** @module bookshelf */
/** @class */
this.Book = function (title) {
    /** The title. */
    this.title = title;
};