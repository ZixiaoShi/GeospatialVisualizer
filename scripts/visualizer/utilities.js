/**
 * Created by freeze on 2015-11-08.
 */
define([
    'Cesium'

],function(
    Cesium
){
    var colorFromGradient = function(color2, color1, ratio){
        var hex = function(x) {
            x = x.toString(16);
            return (x.length == 1) ? '0' + x : x;
        };
        var r = Math.ceil(parseInt(color1.substring(0,2), 16) * ratio + parseInt(color2.substring(0,2), 16) * (1-ratio));
        var g = Math.ceil(parseInt(color1.substring(2,4), 16) * ratio + parseInt(color2.substring(2,4), 16) * (1-ratio));
        var b = Math.ceil(parseInt(color1.substring(4,6), 16) * ratio + parseInt(color2.substring(4,6), 16) * (1-ratio));

        return hex(r) + hex(g) + hex(b);
    };

    var roundUp = function(value, digits){
        var len = parseInt(value).toString().length;
        var sign = Math.pow(10,(len-digits-1));
        return Math.ceil(value/sign)*(sign);
    };

    var changeAlpha = function(entity, color, alpha){
        if(entity == undefined){return; }
        var cesiumColor = Cesium.Color.fromCssColorString("#"+ color);
        if(entity.polygon === undefined){return;}
        entity.polygon.material = Cesium.Color.fromAlpha(cesiumColor, alpha);
    };

    /**
     * Returns the top-most Entity at the provided window coordinates
     * or undefined if no Entity is at that location.
     *
     * @param {Cartesian2} windowPosition The window coordinates.
     * @returns {Entity} The picked Entity or undefined.
     */
    var pickEntity = function(viewer, windowPosition){
        var picked = viewer.scene.pick(windowPosition);
        if (Cesium.defined(picked)) {
            var id = Cesium.defaultValue(picked.id, picked.primitive.id);
            if (id instanceof Cesium.Entity) {
                return id;
            }
        }
        return undefined;
    };

    return{
        colorFromGradient: colorFromGradient,
        roundUp: roundUp,
        changeAlpha: changeAlpha,
        pickEntity: pickEntity
    }
});